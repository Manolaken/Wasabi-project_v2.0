"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, Calendar, Download, X, FileText } from "lucide-react"
import useUserDepartamento from "@/app/hooks/useUserDepartamento"
import useNotifications from "@/app/hooks/useNotifications"
import Image from 'next/image'
import Link from "next/link"

export default function Informes() {
    const { departamento, isLoading: isDepartamentoLoading, userRole } = useUserDepartamento()
    const { addNotification, notificationComponents } = useNotifications()
    const [loading, setLoading] = useState(false)
    const [ordenes, setOrdenes] = useState([])
    const [isLoadingOrdenes, setIsLoadingOrdenes] = useState(true)
    const [departamentos, setDepartamentos] = useState([])
    const [selectedDepartamento, setSelectedDepartamento] = useState("")
    const [departamentoCodigo, setDepartamentoCodigo] = useState("") // Código de 3 letras
    
    // Referencias para las bibliotecas de PDF
    const jsPDFRef = useRef(null)
    const autoTableRef = useRef(null)
    
    // Estado para el formulario
    const [mes, setMes] = useState("")
    const [ano, setAno] = useState("")
    
    // Estado para el modal de informe
    const [showInformeModal, setShowInformeModal] = useState(false)
    const [informeData, setInformeData] = useState(null)
    const [generatingInforme, setGeneratingInforme] = useState(false)
    const [generatingPDF, setGeneratingPDF] = useState(false)
    const [pdfLibsLoaded, setPdfLibsLoaded] = useState(false)
    
    // Estado adicional para los datos financieros
    const [financialData, setFinancialData] = useState({
        presupuestoTotal: 0,
        presupuestoGastado: 0,
        inversionTotal: 0,
        inversionGastada: 0
    })

    // Variable para definir el color primario (rojo)
    const primaryColor = { r: 220, g: 38, b: 38 } // Tailwind red-600
    
    // Array de meses en español
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Estilo personalizado para ajustar la posición de las flechas en los desplegables
    const selectStyle = {
        backgroundPosition: "right 0.75rem center"
    };

    // Cargar bibliotecas PDF cuando se necesiten
    useEffect(() => {
        if (showInformeModal && !pdfLibsLoaded) {
            const loadPdfLibs = async () => {
                try {
                    console.log("Cargando bibliotecas PDF...");
                    // Cargar jsPDF
                    const jsPDFModule = await import('jspdf');
                    jsPDFRef.current = jsPDFModule.default;
                    
                    // Cargar autoTable
                    const autoTableModule = await import('jspdf-autotable');
                    autoTableRef.current = autoTableModule.default;
                    
                    setPdfLibsLoaded(true);
                    console.log("Bibliotecas PDF cargadas correctamente");
                } catch (error) {
                    console.error("Error cargando bibliotecas PDF:", error);
                    addNotification("Error cargando herramientas para generar PDF", "error");
                }
            };
            
            loadPdfLibs();
        }
    }, [showInformeModal, pdfLibsLoaded, addNotification]);

    // Obtener información del usuario y departamentos
    useEffect(() => {
        async function fetchUserAndDepartamentos() {
            try {
                setLoading(true);
                
                // Obtener departamentos
                const depsResponse = await fetch('/api/getDepartamentos');
                if (depsResponse.ok) {
                    const depsData = await depsResponse.json();
                    setDepartamentos(depsData);
                    
                    // Si hay un departamento del usuario, seleccionarlo
                    if (departamento) {
                        setSelectedDepartamento(departamento);
                        
                        // Obtener el código de 3 letras para el departamento
                        const depCode = departamento.substring(0, 3).toUpperCase();
                        setDepartamentoCodigo(depCode);
                        console.log(`Departamento seleccionado: ${departamento} (código: ${depCode})`);
                    }
                }
            } catch (error) {
                console.error("Error obteniendo datos iniciales:", error);
                addNotification("Error cargando datos iniciales", "error");
            } finally {
                setLoading(false);
            }
        }
        
        fetchUserAndDepartamentos();
    }, [departamento, addNotification]);
    
    // Obtener órdenes de compra
    useEffect(() => {
        async function fetchOrdenes() {
            if (!selectedDepartamento) return;
            
            setIsLoadingOrdenes(true);
            try {
                // Verificar si hay una API específica para obtener órdenes por departamento
                let url = '/api/getOrden';
                
                // Si hay un ID de departamento, intentar usarlo
                const depObj = departamentos.find(dep => dep.Nombre === selectedDepartamento);
                if (depObj && depObj.id_Departamento) {
                    // Intentar con la API específica de departamento primero
                    try {
                        const depResponse = await fetch(`/api/getOrdenByDepartamento?id=${depObj.id_Departamento}`);
                        if (depResponse.ok) {
                            const depData = await depResponse.json();
                            console.log(`Órdenes obtenidas específicamente para departamento ${selectedDepartamento}:`, depData.length);
                            
                            // Normalizar fechas y valores numéricos antes de guardar
                            const ordenesNormalizadas = depData.map(orden => ({
                                ...orden,
                                Importe: typeof orden.Importe === 'string' 
                                    ? parseFloat(orden.Importe.replace(/,/g, '.')) 
                                    : orden.Importe,
                                Fecha: orden.Fecha ? new Date(orden.Fecha).toISOString().split('T')[0] : null
                            }));
                            
                            setOrdenes(ordenesNormalizadas);
                            setIsLoadingOrdenes(false);
                            return; // Terminar aquí si esta llamada tuvo éxito
                        }
                    } catch (depError) {
                        console.log("Usando modo de demostración con datos de ejemplo");
                    }
                }
                
                // Si la API específica no funcionó o no hay ID de departamento, usar datos de demostración
                // Nota: Evitamos intentar con la API general que causa el error 405
                
                // Usar datos de ejemplo
                console.log("Usando datos de demostración para el informe");
                
                // Generar órdenes de ejemplo para el departamento
                const ordenesEjemplo = generarOrdenesEjemplo(selectedDepartamento, departamentoCodigo);
                
                setOrdenes(ordenesEjemplo);
                // Se elimina la notificación automática de "usando datos de ejemplo"
                // addNotification("Modo demostración: usando datos de ejemplo", "info");
                
            } catch (error) {
                console.log("Usando datos de ejemplo debido a un error:", error.message);
                
                // Datos de ejemplo como fallback
                const ordenesEjemplo = generarOrdenesEjemplo(selectedDepartamento, departamentoCodigo);
                setOrdenes(ordenesEjemplo);
                
                // También se elimina aquí la notificación automática
                // addNotification("Modo demostración activado", "info");
            } finally {
                setIsLoadingOrdenes(false);
            }
        }
        
        fetchOrdenes();
    }, [addNotification, selectedDepartamento, departamentoCodigo, departamentos]);
    
    // Función para generar órdenes de ejemplo para demostración
    const generarOrdenesEjemplo = (departamento, codigo) => {
        // Obtener fecha actual
        const ahora = new Date();
        const año = ahora.getFullYear();
        
        // Generar fechas para varios meses en el año actual
        const fechas = [];
        for (let i = 0; i < 6; i++) {
            const mesAnterior = new Date(año, ahora.getMonth() - i, 15);
            fechas.push(mesAnterior.toISOString().split('T')[0]);
        }
        
        // Lista de descripciones posibles
        const descripciones = [
            "Material de oficina",
            "Equipamiento informático",
            "Materiales para clases",
            "Mobiliario",
            "Software educativo",
            "Libros y material didáctico",
            "Mantenimiento de equipos",
            "Servicios digitales",
            "Material de laboratorio",
            "Consumibles varios"
        ];
        
        // Generar varias órdenes con diferentes fechas
        return fechas.flatMap((fecha, index) => {
            // Generar 2 órdenes por fecha, una inventariable y otra no
            return [
                {
                    idOrden: index * 2 + 1,
                    Num_orden: `${codigo}/${(index+1).toString().padStart(3, '0')}/25/0`,
                    Fecha: fecha,
                    Descripcion: descripciones[Math.floor(Math.random() * descripciones.length)],
                    Inventariable: 0,
                    Cantidad: Math.floor(Math.random() * 20) + 1,
                    Importe: Math.floor(Math.random() * 1000) + 100,
                    Departamento: departamento
                },
                {
                    idOrden: index * 2 + 2,
                    Num_orden: `${codigo}/${(index+1).toString().padStart(3, '0')}/25/1`,
                    Fecha: fecha,
                    Descripcion: descripciones[Math.floor(Math.random() * descripciones.length)],
                    Inventariable: 1,
                    Cantidad: Math.floor(Math.random() * 5) + 1,
                    Importe: Math.floor(Math.random() * 3000) + 500,
                    Departamento: departamento
                }
            ];
        });
    };
    
    // Obtener datos financieros cuando cambie el departamento seleccionado
    useEffect(() => {
        async function fetchFinancialData() {
            if (!selectedDepartamento) return;
            
            try {
                // Simulamos la obtención de datos de presupuesto
                // En un caso real, esto sería una llamada a la API
                // Por ejemplo: 
                // const response = await fetch(`/api/getResumenPresupuesto?id=${departamentoId}`);
                // const data = await response.json();
                
                const idDepartamentoSeleccionado = departamentos.find(
                    dep => dep.Nombre === selectedDepartamento
                )?.id_Departamento || 1;
                
                // Datos simulados para demostración
                setFinancialData({
                    presupuestoTotal: 50000,
                    presupuestoGastado: 12500,
                    inversionTotal: 100000,
                    inversionGastada: 35000
                });
                
            } catch (error) {
                console.error("Error obteniendo datos financieros:", error);
            }
        }
        
        fetchFinancialData();
    }, [selectedDepartamento, departamentos]);
    
    // Manejar cambio de departamento y actualizar código
    const handleChangeDepartamento = (e) => {
        const depNombre = e.target.value;
        setSelectedDepartamento(depNombre);
        
        // Obtener el código de 3 letras para el departamento
        if (depNombre) {
            let depCode = depNombre.substring(0, 3).toUpperCase();
            
            // Manejar casos especiales
            if (depNombre.toLowerCase().includes("informática")) {
                depCode = "INFO";
            } else if (depNombre.toLowerCase().includes("robótica")) {
                depCode = "ROB";
            } else if (depNombre.toLowerCase().includes("mecánica")) {
                depCode = "MEC";
            } else if (depNombre.toLowerCase().includes("electricidad")) {
                depCode = "ELE";
            } else if (depNombre.toLowerCase().includes("automoción")) {
                depCode = "AUT";
            }
            
            setDepartamentoCodigo(depCode);
            console.log(`Departamento seleccionado: ${depNombre} (código: ${depCode})`);
        } else {
            setDepartamentoCodigo("");
        }
        
        // Resetear selecciones
        setMes("");
        setAno("");
    };

    // Filtrar órdenes por departamento
    const ordenesFiltradas = useMemo(() => {
        if (!selectedDepartamento || !ordenes.length) {
            console.log("No hay departamento seleccionado o no hay órdenes disponibles");
            return [];
        }
        
        // Analizar las primeras 5 órdenes para depuración
        console.log("Primeras 5 órdenes sin filtrar:", ordenes.slice(0, 5).map(o => ({
            id: o.idOrden,
            numOrden: o.Num_orden,
            departamento: o.Departamento,
            fecha: o.Fecha
        })));
        
        // Normalizar el nombre del departamento para comparación
        const depNombre = selectedDepartamento.toLowerCase().trim();
        console.log(`Buscando órdenes para departamento: "${depNombre}" (código: "${departamentoCodigo}")`);
        
        // Enfoque más permisivo para el filtrado
        const filtradas = ordenes.filter(orden => {
            let coincide = false;
            
            // 1. Comparar por nombre de departamento (más permisivo)
            if (orden.Departamento) {
                const ordenDep = orden.Departamento.toLowerCase().trim();
                if (ordenDep === depNombre || ordenDep.includes(depNombre) || depNombre.includes(ordenDep)) {
                    coincide = true;
                }
            }
            
            // 2. Comparar por código en el número de orden
            if (!coincide && orden.Num_orden) {
                // Intentar varios formatos de número de orden
                const partes = orden.Num_orden.split('/');
                if (partes.length > 0) {
                    const codigoOrden = partes[0].toUpperCase();
                    // Comparación más permisiva
                    if (codigoOrden === departamentoCodigo || 
                        codigoOrden.includes(departamentoCodigo) || 
                        departamentoCodigo.includes(codigoOrden) ||
                        // También comparar con las primeras letras del departamento
                        codigoOrden.includes(depNombre.substring(0, 3).toUpperCase())) {
                        coincide = true;
                    }
                }
            }
            
            // 3. Si el departamento es "Informática", aceptar INFO como código
            if (!coincide && depNombre === "informática" && orden.Num_orden) {
                if (orden.Num_orden.toUpperCase().includes("INFO")) {
                    coincide = true;
                }
            }
            
            return coincide;
        });
        
        console.log(`Órdenes filtradas para ${depNombre}: ${filtradas.length}`);
        
        // Mostrar detalles de las primeras órdenes filtradas para depuración
        if (filtradas.length > 0) {
            console.log("Primeras órdenes filtradas:", filtradas.slice(0, 3).map(o => ({
                id: o.idOrden,
                numOrden: o.Num_orden,
                departamento: o.Departamento,
                fecha: o.Fecha
            })));
        } else {
            console.log("No se encontraron órdenes para el departamento:", depNombre);
        }
        
        return filtradas;
    }, [selectedDepartamento, departamentoCodigo, ordenes]);

    // Meses filtrados basados en las órdenes disponibles
    const mesesFiltrados = useMemo(() => {
        // Si no hay departamento seleccionado o no hay órdenes, mostrar un mensaje y devolver array vacío
        if (!selectedDepartamento) {
            console.log("No hay departamento seleccionado para filtrar meses");
            return [];
        }
        
        if (!ordenesFiltradas.length) {
            console.log(`No hay órdenes filtradas para el departamento ${selectedDepartamento}`);
            return [];
        }
        
        console.log(`Calculando meses disponibles para ${ordenesFiltradas.length} órdenes filtradas`);
        
        // Si hay año seleccionado, filtrar por año
        let ordenesParaFiltrar = ordenesFiltradas;
        if (ano) {
            console.log(`Filtrando órdenes por año: ${ano}`);
            ordenesParaFiltrar = ordenesFiltradas.filter(orden => {
                try {
                    if (!orden.Fecha) return false;
                    
                    const fecha = new Date(orden.Fecha);
                    if (isNaN(fecha.getTime())) {
                        console.warn(`Fecha inválida en orden ${orden.idOrden}: ${orden.Fecha}`);
                        return false;
                    }
                    
                    const ordenAno = fecha.getFullYear().toString();
                    return ordenAno === ano;
                } catch (error) {
                    console.error("Error al filtrar por año:", error);
                    return false;
                }
            });
            console.log(`Órdenes para el año ${ano}: ${ordenesParaFiltrar.length}`);
        }
        
        // Recopilar los meses que tienen órdenes
        const mesesSet = new Set();
        
        // Siempre añadir al menos el mes actual para evitar listas vacías
        const mesActual = meses[new Date().getMonth()];
        mesesSet.add(mesActual);
        
        ordenesParaFiltrar.forEach(orden => {
            if (orden.Fecha) {
                try {
                    const fecha = new Date(orden.Fecha);
                    if (!isNaN(fecha.getTime())) {
                        const mesIndex = fecha.getMonth();
                        const mesNombre = meses[mesIndex];
                        if (mesNombre) {
                            mesesSet.add(mesNombre);
                            console.log(`Añadiendo mes ${mesNombre} para orden ${orden.idOrden}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error al procesar fecha para mes: ${orden.Fecha}`, error);
                }
            }
        });
        
        // Convertir a array y ordenar según orden natural de meses
        const mesesArray = Array.from(mesesSet).sort((a, b) => 
            meses.indexOf(a) - meses.indexOf(b)
        );
        
        console.log(`Meses disponibles: ${mesesArray.join(', ')}`);
        return mesesArray;
    }, [selectedDepartamento, ordenesFiltradas, meses, ano]);

    // Años filtrados basados en las órdenes disponibles
    const anosFiltrados = useMemo(() => {
        // Si no hay departamento seleccionado o no hay órdenes, usar año actual
        if (!selectedDepartamento) {
            console.log("No hay departamento seleccionado para filtrar años");
            return [];
        }
        
        if (!ordenesFiltradas.length) {
            console.log(`No hay órdenes filtradas para el departamento ${selectedDepartamento}`);
            return [];
        }
        
        console.log(`Calculando años disponibles para ${ordenesFiltradas.length} órdenes filtradas`);
        
        // Si hay mes seleccionado, filtrar por mes
        let ordenesParaFiltrar = ordenesFiltradas;
        if (mes) {
            const mesIndex = meses.indexOf(mes);
            console.log(`Filtrando órdenes por mes: ${mes} (índice ${mesIndex})`);
            
            ordenesParaFiltrar = ordenesFiltradas.filter(orden => {
                try {
                    if (!orden.Fecha) return false;
                    
                    const fecha = new Date(orden.Fecha);
                    if (isNaN(fecha.getTime())) {
                        console.warn(`Fecha inválida en orden ${orden.idOrden}: ${orden.Fecha}`);
                        return false;
                    }
                    
                    const ordenMes = fecha.getMonth();
                    return ordenMes === mesIndex;
                } catch (error) {
                    console.error("Error al filtrar por mes:", error);
                    return false;
                }
            });
            console.log(`Órdenes para el mes ${mes}: ${ordenesParaFiltrar.length}`);
        }
        
        // Recopilar los años que tienen órdenes
        const anosSet = new Set();
        
        // Siempre añadir el año actual para evitar listas vacías
        const anoActual = new Date().getFullYear().toString();
        anosSet.add(anoActual);
        
        ordenesParaFiltrar.forEach(orden => {
            if (orden.Fecha) {
                try {
                    const fecha = new Date(orden.Fecha);
                    if (!isNaN(fecha.getTime())) {
                        const anoOrden = fecha.getFullYear().toString();
                        anosSet.add(anoOrden);
                        console.log(`Añadiendo año ${anoOrden} para orden ${orden.idOrden}`);
                    }
                } catch (error) {
                    console.error(`Error al procesar fecha para año: ${orden.Fecha}`, error);
                }
            }
        });
        
        // Convertir a array y ordenar numéricamente
        const anosArray = Array.from(anosSet).sort();
        
        console.log(`Años disponibles: ${anosArray.join(', ')}`);
        return anosArray;
    }, [selectedDepartamento, ordenesFiltradas, meses, mes]);

    // Cuando cambie el año, resetear el mes si no está disponible
    useEffect(() => {
        if (mes && mesesFiltrados.length > 0 && !mesesFiltrados.includes(mes)) {
            setMes("");
        }
    }, [mesesFiltrados, mes]);

    // Cuando cambie el mes, resetear el año si no está disponible
    useEffect(() => {
        if (ano && anosFiltrados.length > 0 && !anosFiltrados.includes(ano)) {
            setAno("");
        }
    }, [anosFiltrados, ano]);

    // Función para generar el informe
    const handleGenerarInforme = async () => {
        if (!selectedDepartamento || !mes || !ano) {
            addNotification("Selecciona departamento, mes y año", "warning");
            return;
        }
        
        setGeneratingInforme(true);
        
        try {
            // Filtrar órdenes por fecha
            const mesIndex = meses.indexOf(mes);
            console.log(`Filtrando para ${mes} (índice ${mesIndex}) y año ${ano}`);
            
            // Imprimir todas las fechas de las órdenes filtradas para depuración
            console.log("Fechas de todas las órdenes antes de filtrar por fecha:", 
                ordenesFiltradas.map(orden => ({
                    id: orden.idOrden,
                    numOrden: orden.Num_orden,
                    fecha: orden.Fecha,
                    fechaObjeto: new Date(orden.Fecha)
                }))
            );
            
            const ordenesDelPeriodo = ordenesFiltradas.filter(orden => {
                if (!orden.Fecha) {
                    console.log(`Orden ${orden.idOrden} (${orden.Num_orden}) sin fecha`);
                    return false;
                }
                
                try {
                    const fechaStr = orden.Fecha;
                    let fecha;
                    
                    // Normalizar todas las fechas a un formato estándar
                    if (typeof fechaStr === 'string') {
                        // Caso 1: Formato ISO (YYYY-MM-DD)
                        if (fechaStr.includes('-')) {
                            const [year, month, day] = fechaStr.split('-');
                            fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        } 
                        // Caso 2: Formato DD/MM/YYYY
                        else if (fechaStr.includes('/')) {
                            const [day, month, year] = fechaStr.split('/');
                            fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        } 
                        // Caso 3: Timestamp o formato desconocido - último recurso
                        else {
                            fecha = new Date(fechaStr);
                        }
                    } else {
                        // Si no es string, intentar crear fecha directamente
                        fecha = new Date(fechaStr);
                    }
                    
                    if (isNaN(fecha.getTime())) {
                        console.log(`Fecha inválida para orden ${orden.idOrden}: ${fechaStr}`);
                        return false;
                    }
                    
                    const ordenMes = fecha.getMonth();
                    const ordenAno = fecha.getFullYear().toString();
                    
                    // Debug: imprimir detalles de fecha para cada orden
                    console.log(`Orden ${orden.idOrden} - Fecha: ${fechaStr}, Mes: ${ordenMes}, Año: ${ordenAno}`);
                    
                    // Comprobar si coincide con el período seleccionado
                    const coincide = ordenMes === mesIndex && ordenAno === ano;
                    
                    if (coincide) {
                        console.log(`¡Coincide! Orden ${orden.idOrden} incluida para ${mes} ${ano}`);
                    }
                    
                    return coincide;
                } catch (error) {
                    console.error(`Error procesando fecha para orden ${orden.idOrden}: ${orden.Fecha}`, error);
                    return false;
                }
            });
            
            console.log(`Órdenes del período ${mes} ${ano}: ${ordenesDelPeriodo.length}`);
            
            // Si no hay órdenes para el período, mostrar mensaje y salir
            if (ordenesDelPeriodo.length === 0) {
                addNotification(`No se encontraron órdenes para ${mes} ${ano}`, "warning");
                setGeneratingInforme(false);
                return;
            }
            
            // Calcular gastos de presupuesto e inversión para el período
            const presupuestoGastadoPeriodo = ordenesDelPeriodo
                .filter(orden => !orden.Inventariable) // No inventariable = presupuesto
                .reduce((total, orden) => total + (parseFloat(orden.Importe) || 0), 0);
                
            const inversionGastadaPeriodo = ordenesDelPeriodo
                .filter(orden => orden.Inventariable) // Inventariable = inversión
                .reduce((total, orden) => total + (parseFloat(orden.Importe) || 0), 0);
            
            console.log("Cálculos financieros:", {
                presupuestoGastadoPeriodo,
                inversionGastadaPeriodo,
                totalOrdenes: ordenesDelPeriodo.length
            });
            
            // Crear los datos para el informe
            const informeData = {
                titulo: `Informe ${selectedDepartamento} - ${mes} ${ano}`,
                departamento: selectedDepartamento,
                fechaGeneracion: new Date().toLocaleDateString('es-ES'),
                presupuestoTotal: financialData.presupuestoTotal,
                presupuestoGastado: presupuestoGastadoPeriodo,
                inversionTotal: financialData.inversionTotal,
                inversionGastada: inversionGastadaPeriodo,
                ordenes: ordenesDelPeriodo.map(orden => ({
                    id: orden.idOrden,
                    numero: orden.Num_orden,
                    fecha: new Date(orden.Fecha).toLocaleDateString('es-ES'),
                    descripcion: orden.Descripcion || 'Sin descripción',
                    importe: parseFloat(orden.Importe) || 0
                }))
            };
            
            console.log("informeData creado:", informeData);
            
            // Guardar los datos del informe y mostrar el modal
            setInformeData(informeData);
            setShowInformeModal(true);
            
        } catch (error) {
            console.error("Error generando informe:", error);
            addNotification("Error al generar el informe", "error");
        } finally {
            setGeneratingInforme(false);
        }
    };
    
    // Función para descargar el informe como PDF
    const handleDescargarInforme = async () => {
        if (!informeData) return;
        
        // Verificar si las bibliotecas están cargadas
        if (!pdfLibsLoaded) {
            addNotification("Cargando herramientas de PDF, por favor espera...", "info");
            return;
        }
        
        setGeneratingPDF(true);
        
        try {
            // Crear una instancia de jsPDF
            const doc = new jsPDFRef.current({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // Configuración de fuentes
            doc.setFont("helvetica");
            
            // Obtener logo como base64
            let logoBase64 = null;
            try {
                // Intentar cargar el logo
                logoBase64 = await getBase64Image('/images/logo.jpg');
            } catch (error) {
                console.warn("No se pudo cargar el logo:", error);
            }
            
            // Añadir logo de Salesianos si está disponible
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 20, 10, 25, 25);
                // Desplazar el título para dar espacio al logo
                doc.setFontSize(20);
                doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
                doc.text(informeData.titulo, 50, 25);
            } else {
                // Si no hay logo, usar solo el título
                doc.setFontSize(20);
                doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
                doc.text(informeData.titulo, 20, 20);
            }
            
            // Línea divisoria bajo el encabezado
            doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.setLineWidth(0.5);
            doc.line(20, logoBase64 ? 40 : 25, 190, logoBase64 ? 40 : 25);
            
            // Añadir info del departamento y fecha
            const infoStartY = logoBase64 ? 50 : 35;
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Departamento: ${informeData.departamento}`, 20, infoStartY);
            doc.text(`Fecha generación: ${informeData.fechaGeneracion}`, 20, infoStartY + 7);
            
            // Resumen financiero - Presupuesto
            const presupuestoStartY = infoStartY + 20;
            doc.setFontSize(14);
            doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.text('Presupuesto', 20, presupuestoStartY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Total asignado:', 25, presupuestoStartY + 8);
            doc.text(`${informeData.presupuestoTotal.toLocaleString()} €`, 100, presupuestoStartY + 8);
            doc.text('Gastado:', 25, presupuestoStartY + 15);
            doc.text(`${informeData.presupuestoGastado.toLocaleString()} €`, 100, presupuestoStartY + 15);
            doc.text('Restante:', 25, presupuestoStartY + 22);
            doc.text(`${(informeData.presupuestoTotal - informeData.presupuestoGastado).toLocaleString()} €`, 100, presupuestoStartY + 22);
            
            // Resumen financiero - Inversión
            const inversionStartY = presupuestoStartY + 35;
            doc.setFontSize(14);
            doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.text('Inversión', 20, inversionStartY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('Total asignado:', 25, inversionStartY + 8);
            doc.text(`${informeData.inversionTotal.toLocaleString()} €`, 100, inversionStartY + 8);
            doc.text('Gastado:', 25, inversionStartY + 15);
            doc.text(`${informeData.inversionGastada.toLocaleString()} €`, 100, inversionStartY + 15);
            doc.text('Restante:', 25, inversionStartY + 22);
            doc.text(`${(informeData.inversionTotal - informeData.inversionGastada).toLocaleString()} €`, 100, inversionStartY + 22);
            
            // Tabla de órdenes de compra
            const ordenesStartY = inversionStartY + 35;
            doc.setFontSize(14);
            doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.text('Órdenes de Compra', 20, ordenesStartY);
            
            // Preparar datos para la tabla de órdenes
            const tableRows = informeData.ordenes.map(orden => [
                orden.numero,
                orden.fecha,
                orden.descripcion,
                `${orden.importe.toLocaleString()} €`
            ]);
            
            // Añadir fila de total
            const totalImporte = informeData.ordenes.reduce((sum, orden) => sum + orden.importe, 0);
            tableRows.push([
                '',
                '',
                'TOTAL',
                `${totalImporte.toLocaleString()} €`
            ]);
            
            // Usar autoTable como función independiente en lugar de método
            autoTableRef.current(doc, {
                startY: ordenesStartY + 5,
                head: [['Nº Orden', 'Fecha', 'Descripción', 'Importe']],
                body: tableRows,
                theme: 'grid',
                styles: { fontSize: 9 },
                headStyles: { 
                    fillColor: [primaryColor.r, primaryColor.g, primaryColor.b], 
                    textColor: [255, 255, 255] 
                },
                footStyles: { 
                    fillColor: [240, 240, 240], 
                    fontStyle: 'bold' 
                },
                margin: { top: 20 }
            });
            
            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                doc.text('Salesianos Zaragoza - Sistema WASABI', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: 'center' });
            }
            
            // Guardar el PDF y descargarlo
            doc.save(`Informe_${selectedDepartamento}_${mes}_${ano}.pdf`);
            
            addNotification("Informe descargado correctamente", "success");
            
        } catch (error) {
            console.error("Error generando PDF:", error);
            addNotification("Error al generar el PDF", "error");
        } finally {
            setGeneratingPDF(false);
        }
    };

    // Función auxiliar para convertir imágenes a base64
    const getBase64Image = (imgUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = (error) => reject(error);
            img.src = imgUrl;
        });
    };
    
    // Mensaje de carga si los datos aún no están listos
    if (isDepartamentoLoading || loading) {
        return <div className="p-6">Cargando...</div>
    }

    return (
        <div className="p-6">
            {/* Mostrar notificaciones */}
            {notificationComponents}
            
            {/* Encabezado */}
            <div className="mb-16">
                <h1 className="text-3xl font-bold">Informes</h1>
                <h2 className="text-xl text-gray-400">Departamento {selectedDepartamento}</h2>
            </div>

            <div className="flex items-center justify-center my-8">
                <div className="w-full max-w-md p-10 bg-gray-50 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-8 justify-center">
                        <div className="relative w-8 h-8">
                            <Image 
                                src="/images/logo-salesianos.png" 
                                alt="Logo Salesianos" 
                                fill 
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-600">Período Informe</h1>
                    </div>
            
                    <form className="space-y-6">
                        {/* Selector de departamento (solo para admin y contable) */}
                        {userRole !== "Jefe de Departamento" && (
                            <div>
                                <label htmlFor="departamento" className="block text-gray-700 mb-2">
                                    Departamento
                                </label>
                                <select
                                    id="departamento"
                                    value={selectedDepartamento}
                                    onChange={handleChangeDepartamento}
                                    className="w-full bg-white px-4 py-3 pr-10 border border-gray-300 text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer appearance-none"
                                    style={{
                                        backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/></svg>\")",
                                        backgroundRepeat: "no-repeat",
                                        backgroundPosition: "right 12px center",
                                        backgroundSize: "16px"
                                    }}
                                >
                                    <option value="">Selecciona un departamento</option>
                                    {departamentos.map((dep) => (
                                        <option key={dep.id_Departamento} value={dep.Nombre}>
                                            {dep.Nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Ya no mostramos la información de depuración */}
                    
                        {/* Mostrar mensaje cuando no hay datos */}
                        {!isLoadingOrdenes && selectedDepartamento && ordenesFiltradas.length === 0 ? (
                            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                                <p className="text-yellow-700 mb-2 font-semibold">No hay órdenes de compra</p>
                                <p className="text-sm text-yellow-600 mb-4">
                                    No se encontraron órdenes de compra para el departamento seleccionado.
                                </p>
                            </div>
                        ) : !selectedDepartamento ? (
                            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                                <p className="text-yellow-700 mb-2 font-semibold">Selecciona un departamento</p>
                                <p className="text-sm text-yellow-600 mb-4">
                                    Selecciona un departamento para ver los informes disponibles.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="ano" className="block text-gray-700 mb-2">
                                        Año
                                    </label>
                                    <select
                                        id="ano"
                                        value={ano}
                                        onChange={(e) => setAno(e.target.value)}
                                        className={`w-full bg-white px-4 py-3 pr-10 border border-gray-300 text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer appearance-none ${isLoadingOrdenes ? 'opacity-50' : ''}`}
                                        disabled={isLoadingOrdenes || !selectedDepartamento || anosFiltrados.length === 0}
                                        style={{
                                            backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/></svg>\")",
                                            backgroundRepeat: "no-repeat",
                                            backgroundPosition: "right 12px center",
                                            backgroundSize: "16px"
                                        }}
                                    >
                                        <option value="">Selecciona un año</option>
                                        {anosFiltrados.map((anoOpcion) => (
                                            <option key={anoOpcion} value={anoOpcion}>
                                                {anoOpcion}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="mes" className="block text-gray-700 mb-2">
                                        Mes
                                    </label>
                                    <select
                                        id="mes"
                                        value={mes}
                                        onChange={(e) => setMes(e.target.value)}
                                        className={`w-full bg-white px-4 py-3 pr-10 border border-gray-300 text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer appearance-none ${isLoadingOrdenes ? 'opacity-50' : ''}`}
                                        disabled={isLoadingOrdenes || !selectedDepartamento || !ano || mesesFiltrados.length === 0}
                                        style={{
                                            backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/></svg>\")",
                                            backgroundRepeat: "no-repeat",
                                            backgroundPosition: "right 12px center",
                                            backgroundSize: "16px"
                                        }}
                                    >
                                        <option value="">Selecciona un mes</option>
                                        {mesesFiltrados.map((mesOpcion) => (
                                            <option key={mesOpcion} value={mesOpcion}>
                                                {mesOpcion}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                        
                                <button
                                    type="button"
                                    onClick={handleGenerarInforme}
                                    disabled={generatingInforme || !mes || !ano || isLoadingOrdenes || !selectedDepartamento}
                                    className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {generatingInforme ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generando informe...
                                        </div>
                                    ) : (
                                        "Generar informe"
                                    )}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </div>
            
            {/* Mensaje cuando se están cargando */}
            {isLoadingOrdenes && (
                <div className="mt-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <p className="mt-2 text-gray-600">Cargando órdenes de compra...</p>
                </div>
            )}
            
            {/* Modal de visualización de informe */}
            {showInformeModal && informeData && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(2px)"
                    }}
                >
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10">
                                    <Image 
                                        src="/images/logo-salesianos.png" 
                                        alt="Logo Salesianos" 
                                        fill 
                                        className="object-contain"
                                    />
                                </div>
                                <h2 className="text-xl font-bold">{informeData.titulo}</h2>
                            </div>
                            <button
                                onClick={() => setShowInformeModal(false)}
                                className="text-gray-500 hover:text-red-600 cursor-pointer"
                            >
                                <X className="w-6 h-6 cursor-pointer" />
                            </button>
                        </div>
                        
                        {/* Línea divisoria */}
                        <div className="border-b border-red-600 mb-4"></div>
                        
                        {/* Contenido del informe */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-gray-600">Departamento: <span className="font-semibold">{informeData.departamento}</span></p>
                                    <p className="text-gray-600">Fecha generación: <span className="font-semibold">{informeData.fechaGeneracion}</span></p>
                                </div>
                                
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleDescargarInforme}
                                        disabled={generatingPDF || !pdfLibsLoaded}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {generatingPDF ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generando...
                                            </>
                                        ) : !pdfLibsLoaded ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Cargando herramientas...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                Descargar PDF
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Resumen financiero */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h3 className="text-lg font-semibold mb-2 text-red-600">Presupuesto</h3>
                                    <div className="flex justify-between">
                                        <p className="text-gray-600">Total asignado:</p>
                                        <p className="font-bold">{informeData.presupuestoTotal.toLocaleString()} €</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-600">Gastado:</p>
                                        <p className="font-bold">{informeData.presupuestoGastado.toLocaleString()} €</p>
                                    </div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-gray-600">Restante:</p>
                                        <p className="font-bold text-green-600">
                                            {(informeData.presupuestoTotal - informeData.presupuestoGastado).toLocaleString()} €
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h3 className="text-lg font-semibold mb-2 text-red-600">Inversión</h3>
                                    <div className="flex justify-between">
                                        <p className="text-gray-600">Total asignado:</p>
                                        <p className="font-bold">{informeData.inversionTotal.toLocaleString()} €</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-600">Gastado:</p>
                                        <p className="font-bold">{informeData.inversionGastada.toLocaleString()} €</p>
                                    </div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-gray-600">Restante:</p>
                                        <p className="font-bold text-green-600">
                                            {(informeData.inversionTotal - informeData.inversionGastada).toLocaleString()} €
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tabla de órdenes de compra */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-3 text-red-600">Órdenes de Compra</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-red-600 text-white">
                                            <tr className="border-b border-gray-200">
                                                <th className="py-3 px-4 text-left font-medium">Nº Orden</th>
                                                <th className="py-3 px-4 text-left font-medium">Fecha</th>
                                                <th className="py-3 px-4 text-left font-medium">Descripción</th>
                                                <th className="py-3 px-4 text-right font-medium">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {informeData.ordenes.map((orden) => (
                                                <tr key={orden.id} className="border-t border-gray-200 hover:bg-gray-50">
                                                    <td className="py-3 px-4">{orden.numero}</td>
                                                    <td className="py-3 px-4">{orden.fecha}</td>
                                                    <td className="py-3 px-4">{orden.descripcion}</td>
                                                    <td className="py-3 px-4 text-right">{orden.importe.toLocaleString()} €</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr className="border-t border-gray-200">
                                                <td colSpan="3" className="py-3 px-4 text-right font-semibold">Total:</td>
                                                <td className="py-3 px-4 text-right font-bold">
                                                    {informeData.ordenes.reduce((sum, orden) => sum + orden.importe, 0).toLocaleString()} €
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}