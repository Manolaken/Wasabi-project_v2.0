"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronDown, Pencil, X, Search, Filter, Plus, Check, Eye, Calendar, Euro, Download, FileText } from "lucide-react"
import Link from "next/link"
import useUserDepartamento from "@/app/hooks/useUserDepartamento"
import useNotifications from "@/app/hooks/useNotifications"
import PdfViewer from "@/app/components/facturas/PdfViewer";

export default function Facturas() {
    const { departamento, isLoading: isDepartamentoLoading } = useUserDepartamento()
    const { addNotification, notificationComponents } = useNotifications()
    const [facturas, setFacturas] = useState([])
    const [userRole, setUserRole] = useState(null)
    const [filteredFacturas, setFilteredFacturas] = useState([])
    const [loading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [updatingFactura, setUpdatingFactura] = useState(null)

    // Estados para búsqueda y filtrado
    const [searchTerm, setSearchTerm] = useState("")
    const [filterMes, setFilterMes] = useState("")
    const [filterAño, setFilterAño] = useState("")
    const [filterImporte, setFilterImporte] = useState("")
    const [filterEstado, setFilterEstado] = useState("")
    const [filterProveedor, setFilterProveedor] = useState("")
    const [filterDepartamento, setFilterDepartamento] = useState("")

    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
    const [selectedPdfName, setSelectedPdfName] = useState("");

    // NUEVO: Estados para exportación a Excel
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState([]);
    const sheetJSRef = useRef(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [excelFileName, setExcelFileName] = useState("facturas");
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

    // Función para abrir el visor de PDF
    const handleViewPdf = async (facturaId, numFactura) => {
        try {
            // 1. Mostrar indicador de carga
            setIsLoading(true);
            addNotification("Preparando PDF para visualización...", "info");

            // 2. Verificar si existe el PDF, y si no, generarlo automáticamente
            console.log(`🔍 Verificando/generando PDF para factura ${numFactura}...`);

            // Llamar al endpoint de generación específica para esta factura
            const generateResponse = await fetch(`/api/facturas/generate?id=${facturaId}`);

            if (!generateResponse.ok) {
                const errorData = await generateResponse.json();

                // Si el error es que no hay ruta definida, intentar generar automáticamente
                if (errorData.error.includes("No hay ruta de PDF definida")) {
                    console.log("📝 Generando ruta de PDF automáticamente...");

                    // Obtener datos de la factura para generar ruta
                    const facturaResponse = await fetch(`/api/getFacturaById/${facturaId}`);
                    if (facturaResponse.ok) {
                        const facturaData = await facturaResponse.json();

                        // Generar ruta automáticamente
                        const año = new Date(facturaData.Fecha_emision || new Date()).getFullYear();
                        const departamentoCodigo = facturaData.Departamento?.substring(0, 3).toLowerCase() || 'gen';
                        const numeroLimpio = facturaData.Num_factura.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const rutaPdf = `/facturas/${año}/${departamentoCodigo}/fac-${numeroLimpio}.pdf`;

                        // Actualizar la factura con la nueva ruta (necesitarías crear este endpoint)
                        const updateResponse = await fetch(`/api/facturas/updateRoute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ facturaId, rutaPdf })
                        });

                        if (updateResponse.ok) {
                            // Intentar generar nuevamente
                            const retryResponse = await fetch(`/api/facturas/generate?id=${facturaId}`);
                            if (!retryResponse.ok) {
                                throw new Error("Error generando PDF después de crear ruta");
                            }
                        }
                    }
                } else {
                    throw new Error(errorData.error || "Error generando PDF");
                }
            }

            // 3. Una vez generado (o confirmado que existe), abrir el visor
            const pdfUrl = `/api/facturas/viewPdf?id=${facturaId}&t=${Date.now()}`; // Añadir timestamp para evitar caché
            const pdfName = `Factura ${numFactura}`;

            setSelectedPdfUrl(pdfUrl);
            setSelectedPdfName(pdfName);
            setShowPdfViewer(true);

            addNotification("PDF listo para visualización", "success");

        } catch (error) {
            console.error("Error preparando PDF:", error);
            addNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Función para extraer mes y año de una fecha
    function getDateParts(dateString) {
        if (!dateString) return { mes: '', año: '' };
        try {
            const date = new Date(dateString);
            return {
                mes: (date.getMonth() + 1).toString(), // JavaScript cuenta meses desde 0
                año: date.getFullYear().toString()
            };
        } catch (error) {
            return { mes: '', año: '' };
        }
    }

    // Obtener todas las fechas disponibles de las facturas
    const fechasDisponibles = useMemo(() => {
        const meses = new Set();
        const años = new Set();

        facturas.forEach(factura => {
            if (factura.Fecha_emision) {
                const { mes, año } = getDateParts(factura.Fecha_emision);
                meses.add(mes);
                años.add(año);
            }
        });

        return {
            meses: Array.from(meses).sort((a, b) => parseInt(a) - parseInt(b)),
            años: Array.from(años).sort((a, b) => parseInt(a) - parseInt(b))
        };
    }, [facturas]);

    // Obtener fechas filtradas según las selecciones actuales
    const fechasFiltradas = useMemo(() => {
        // Filtrar facturas según los filtros de fecha seleccionados
        const facturasFiltradas = facturas.filter(factura => {
            if (!factura.Fecha_emision) return false;

            const { mes, año } = getDateParts(factura.Fecha_emision);

            if (filterMes && mes !== filterMes) return false;
            if (filterAño && año !== filterAño) return false;

            return true;
        });

        // Extraer meses y años disponibles de las facturas filtradas
        const meses = new Set();
        const años = new Set();

        facturasFiltradas.forEach(factura => {
            const { mes, año } = getDateParts(factura.Fecha_emision);
            meses.add(mes);
            años.add(año);
        });

        return {
            meses: Array.from(meses).sort((a, b) => parseInt(a) - parseInt(b)),
            años: Array.from(años).sort((a, b) => parseInt(a) - parseInt(b))
        };
    }, [facturas, filterMes, filterAño]);

    // Formatear nombre de mes
    const getNombreMes = (numeroMes) => {
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        return meses[parseInt(numeroMes) - 1] || numeroMes;
    };

    // Lista de proveedores y departamentos únicos para filtros
    const [departamentosList, setDepartamentosList] = useState([])
    const [proveedoresList, setProveedoresList] = useState([])

    // Estado de dropdown abierto
    const [openDropdown, setOpenDropdown] = useState(null)

    // Estado para selección de facturas
    const [selectedFacturas, setSelectedFacturas] = useState([])

    // Estado para modal de subir factura
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [selectedFacturaId, setSelectedFacturaId] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)

    // Estado para modal de edición de factura
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingFactura, setEditingFactura] = useState(null)
    const [formFactura, setFormFactura] = useState({
        num_factura: "",
        fecha_emision: "",
        estado: "",
        ruta_pdf: "",
        importe: "",
        // Mantenemos los campos no editables para referencia
        idFactura: null,
        num_orden: "",
        proveedor: "",
        departamento: "",
        // Control de archivo nuevo
        newFile: null,
        hasNewFile: false
    })

    // Función para limpiar todos los filtros
    const handleClearFilters = () => {
        setSearchTerm("");
        setFilterMes("");
        setFilterAño("");
        setFilterImporte("");
        setFilterEstado("");
        setFilterProveedor("");
        if (userRole !== "Jefe de Departamento") {
            setFilterDepartamento("");
        }

        // Mostrar notificación opcional
        addNotification("Filtros eliminados", "info");
    };

    // Referencia al input de archivo
    const fileInputRef = useRef(null)
    const editFileInputRef = useRef(null)

    // Lista de posibles estados
    const estadoOptions = ["Pendiente", "Contabilizada", "Anulada"]

    // NUEVO: Efecto para cargar la biblioteca SheetJS cuando sea necesaria
    useEffect(() => {
        if (showExportModal && !sheetJSRef.current) {
            const loadSheetJS = async () => {
                try {
                    // Cargar la biblioteca XLSX (SheetJS)
                    const XLSX = await import('xlsx');
                    sheetJSRef.current = XLSX;
                    console.log("Biblioteca SheetJS cargada correctamente");
                } catch (error) {
                    console.error("Error al cargar SheetJS:", error);
                    addNotification("Error al cargar las herramientas de exportación", "error");
                }
            };

            loadSheetJS();
        }
    }, [showExportModal, addNotification]);

    useEffect(() => {
        // Función para obtener el rol del usuario
        async function fetchUserRole() {
            try {
                const response = await fetch('/api/getSessionUser');
                if (response.ok) {
                    const data = await response.json();
                    const userRol = data.usuario?.rol || '';
                    setUserRole(userRol);

                    // Si es Jefe de Departamento, establecer el filtro automáticamente
                    if (userRol === "Jefe de Departamento" && departamento) {
                        setFilterDepartamento(departamento);

                        // También hay que asegurar que se mantenga esta selección
                        // Esto es importante por si la app se reinicia o cambia de estado
                        const handleBeforeUnload = () => {
                            localStorage.setItem('selectedDepartamento', departamento);
                        };

                        window.addEventListener('beforeunload', handleBeforeUnload);
                        return () => {
                            window.removeEventListener('beforeunload', handleBeforeUnload);
                        };
                    }
                }
            } catch (error) {
                console.error("Error obteniendo información del usuario:", error);
            }
        }

        // Función para obtener las facturas
        async function fetchFacturas() {
            try {
                const response = await fetch('/api/getFacturas')
                const data = await response.json()

                if (Array.isArray(data) && data.length > 0) {
                    setFacturas(data)

                    // Extraer la lista de departamentos y proveedores únicos
                    const departamentos = [...new Set(data.map(f => f.Departamento))]
                    const proveedores = [...new Set(data.map(f => f.Proveedor))]

                    setDepartamentosList(departamentos)
                    setProveedoresList(proveedores)

                    return data
                } else {
                    console.log("No se encontraron facturas o el formato es incorrecto")
                    setError("No se encontraron facturas")
                    return []
                }
            } catch (error) {
                console.error("Error fetching facturas:", error)
                setError("Error al cargar las facturas: " + error.message)
                return []
            }
        }

        // Función principal que coordina todo
        async function loadData() {
            const role = await fetchUserRole()
            const facturasData = await fetchFacturas()

            // Filtrar facturas según el rol y departamento
            if ((role === "Jefe de Departamento" || role === "Jefe Departamento") && departamento) {
                // Normalizar nombres para comparación
                const normalizedUserDept = departamento.trim().toLowerCase()

                const filtered = facturasData.filter(f => {
                    const facturaDept = f.Departamento?.trim().toLowerCase() || '';
                    return facturaDept === normalizedUserDept;
                })

                setFilteredFacturas(filtered)
            } else {
                // Admin o Contable ven todas las facturas
                setFilteredFacturas(facturasData)
            }

            setIsLoading(false)
        }

        loadData()
    }, [departamento])

    // Filtrar facturas cuando cambien los criterios de búsqueda
    useEffect(() => {
        if (facturas.length > 0) {
            const filtered = facturas.filter((factura) => {
                // Filtro por término de búsqueda (número factura, número orden)
                const matchesSearch =
                    searchTerm === "" ||
                    (factura.Num_factura && factura.Num_factura.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (factura.Num_orden && factura.Num_orden.toLowerCase().includes(searchTerm.toLowerCase()));

                // Filtro por fecha (mes y año)
                let matchesFecha = true;
                if (filterMes || filterAño) {
                    if (!factura.Fecha_emision) {
                        matchesFecha = false;
                    } else {
                        const { mes, año } = getDateParts(factura.Fecha_emision);

                        if (filterMes && mes !== filterMes) matchesFecha = false;
                        if (filterAño && año !== filterAño) matchesFecha = false;
                    }
                }

                // Filtro por importe
                let matchesImporte = true;
                if (filterImporte && factura.Importe !== undefined) {
                    const importe = parseFloat(factura.Importe);

                    switch (filterImporte) {
                        case "0-500":
                            matchesImporte = importe < 500;
                            break;
                        case "500-1000":
                            matchesImporte = importe >= 500 && importe < 1000;
                            break;
                        case "1000-5000":
                            matchesImporte = importe >= 1000 && importe < 5000;
                            break;
                        case "5000+":
                            matchesImporte = importe >= 5000;
                            break;
                        default:
                            matchesImporte = true;
                    }
                }

                // Filtro por proveedor
                const matchesProveedor =
                    filterProveedor === "" ||
                    factura.Proveedor === filterProveedor;

                // Filtro por estado
                const matchesEstado =
                    filterEstado === "" ||
                    factura.Estado === filterEstado;

                // Filtro por departamento
                const matchesDepartamento =
                    filterDepartamento === "" ||
                    factura.Departamento === filterDepartamento;

                return matchesSearch && matchesFecha && matchesImporte && matchesProveedor && matchesEstado && matchesDepartamento;
            });

            setFilteredFacturas(filtered);
        }
    }, [facturas, searchTerm, filterMes, filterAño, filterImporte, filterProveedor, filterEstado, filterDepartamento]);

    // Función para formatear fechas para mostrar
    function formatDate(dateString) {
        if (!dateString) return "-"

        if (dateString instanceof Date) {
            return dateString.toLocaleDateString()
        }
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString()
        } catch (error) {
            return dateString
        }
    }

    // Función para formatear fechas para input type="date"
    function formatDateForInput(dateString) {
        if (!dateString) return ""

        try {
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
        } catch (error) {
            return ""
        }
    }

    // Seleccionar o deseleccionar una factura
    const toggleSelectFactura = (facturaId) => {
        if (selectedFacturas.includes(facturaId)) {
            setSelectedFacturas(selectedFacturas.filter(id => id !== facturaId))
        } else {
            setSelectedFacturas([...selectedFacturas, facturaId])
        }
    }

    // Seleccionar/deseleccionar todas las facturas
    const toggleSelectAll = () => {
        if (selectedFacturas.length === filteredFacturas.length) {
            setSelectedFacturas([])
        } else {
            setSelectedFacturas(filteredFacturas.map(f => f.idFactura))
        }
    }

    // NUEVO: Preparar datos para exportación a Excel
    const prepareExportData = () => {
        // Si hay facturas seleccionadas, usar esas; si no, usar todas las filtradas
        const facturasToExport = selectedFacturas.length > 0
            ? filteredFacturas.filter(f => selectedFacturas.includes(f.idFactura))
            : filteredFacturas;

        // Crear la estructura de datos para Excel
        const data = facturasToExport.map(factura => ({
            'Número Factura': factura.Num_factura || '',
            'Número Orden': factura.Num_orden || '',
            'Proveedor': factura.Proveedor || '',
            'Departamento': factura.Departamento || '',
            'Fecha Emisión': formatDate(factura.Fecha_emision) || '',
            'Importe (€)': factura.Importe || 0,
            'Estado': factura.Estado || ''
        }));

        return data;
    };

    // NUEVO: Función para generar Excel (.xlsx)
    const generateExcel = async () => {
        try {
            setIsGeneratingExcel(true);

            // Verificar que SheetJS esté cargado
            if (!sheetJSRef.current) {
                throw new Error("La biblioteca de Excel no está cargada");
            }

            const XLSX = sheetJSRef.current;

            // Crear un nuevo libro de trabajo
            const workbook = XLSX.utils.book_new();

            // Convertir los datos a una hoja de trabajo
            const worksheet = XLSX.utils.json_to_sheet(exportData);

            // Agregar la hoja al libro
            XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");

            // Configurar el ancho de las columnas para mejor visualización
            const colWidths = Object.keys(exportData[0] || {}).map(key => ({
                wch: Math.max(key.length, 15) // Ancho mínimo de 15 caracteres
            }));
            worksheet['!cols'] = colWidths;

            // Generar el archivo Excel
            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array',
                compression: true
            });

            // Convertir a Blob
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Crear URL para descarga
            const url = URL.createObjectURL(blob);

            return {
                url,
                blob,
                filename: `${excelFileName}.xlsx`
            };

        } catch (error) {
            console.error("Error generando archivo Excel:", error);
            addNotification("Error al generar el archivo Excel", "error");
            return null;
        } finally {
            setIsGeneratingExcel(false);
        }
    };

    // NUEVO: Función para descargar el Excel generado
    const downloadExcel = async () => {
        const excelData = await generateExcel();

        if (!excelData) return;

        // Crear enlace para descarga y hacer clic
        const downloadLink = document.createElement('a');
        downloadLink.href = excelData.url;
        downloadLink.download = excelData.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Liberar URL
        URL.revokeObjectURL(excelData.url);

        // Cerrar modal
        setShowExportModal(false);

        addNotification("Archivo Excel descargado correctamente", "success");
    };

    // NUEVO: Manejar apertura del modal de exportación
    const handleDescargarSeleccionadas = () => {
        // Verificar si hay facturas seleccionadas
        if (selectedFacturas.length === 0) {
            addNotification("Por favor, selecciona al menos una factura para exportar", "warning");
            return;
        }

        // Preparar datos para exportación
        const data = prepareExportData();

        if (data.length === 0) {
            addNotification("No hay datos para exportar", "warning");
            return;
        }

        setExportData(data);

        // Generar nombre de archivo con fecha actual
        const today = new Date();
        const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        // Añadir el departamento al nombre del archivo si está seleccionado
        const deptSuffix = filterDepartamento ? `_${filterDepartamento.toLowerCase().replace(/\s+/g, '_')}` : '';
        setExcelFileName(`facturas${deptSuffix}_${formattedDate}`);

        // Mostrar modal
        setShowExportModal(true);
    };

    // Función para manejar el click en "Insertar Factura"
    const handleInsertarFactura = (facturaId) => {
        setSelectedFacturaId(facturaId);
        setSelectedFile(null);
        setUploadProgress(0);
        setShowUploadModal(true);
    };

    // Función para manejar la selección de archivos en el modal de inserción
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else {
            addNotification("Por favor, selecciona un archivo PDF válido", "error");
            setSelectedFile(null);
        }
    };

    // Función para manejar la selección de archivos en el modal de edición
    const handleEditFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFormFactura(prev => ({
                ...prev,
                newFile: file,
                hasNewFile: true
            }));
        } else if (file) {
            addNotification("Por favor, selecciona un archivo PDF válido", "error");
            setFormFactura(prev => ({
                ...prev,
                newFile: null,
                hasNewFile: false
            }));
        }
    };

    // Función para generar PDF
    const generatePdf = async (facturaId) => {
        try {
            setIsLoading(true);
            addNotification("Generando PDF...", "info");

            const response = await fetch(`/api/facturas/generate?id=${facturaId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error generando PDF");
            }

            const data = await response.json();
            addNotification("PDF generado correctamente", "success");

            // Opcional: Refrescar la factura específica o recargar todas las facturas
            // Podrías implementar esto si notas que los PDFs no se actualizan en la interfaz
        } catch (error) {
            console.error("Error generando PDF:", error);
            addNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Función para abrir el modal de edición
    const handleEditFactura = (factura) => {
        // Llenamos el formulario con los datos de la factura
        setFormFactura({
            num_factura: factura.Num_factura || "",
            fecha_emision: formatDateForInput(factura.Fecha_emision) || "",
            estado: factura.Estado || "",
            ruta_pdf: factura.Ruta_pdf || "",
            importe: factura.Importe || "",
            // Campos no editables
            idFactura: factura.idFactura,
            num_orden: factura.Num_orden || "",
            proveedor: factura.Proveedor || "",
            departamento: factura.Departamento || "",
            // Control de archivo nuevo
            newFile: null,
            hasNewFile: false
        });

        setEditingFactura(factura);
        setShowEditModal(true);
    };

    // Función para manejar cambios en el formulario de edición
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setFormFactura(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para guardar cambios de factura
    const handleSaveFacturaChanges = async () => {
        // Validaciones básicas
        if (!formFactura.num_factura || !formFactura.fecha_emision || !formFactura.estado) {
            addNotification("Por favor, completa todos los campos obligatorios", "warning");
            return;
        }

        setIsUploading(true);

        try {
            // Si hay un nuevo archivo, primero habría que subirlo
            if (formFactura.hasNewFile && formFactura.newFile) {
                // Simulación de progreso para el archivo
                const simulateProgress = () => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 10;
                        setUploadProgress(progress);
                        if (progress >= 100) {
                            clearInterval(interval);
                        }
                    }, 200);
                    return interval;
                };

                const progressInterval = simulateProgress();

                // Simulamos la subida del archivo
                await new Promise((resolve) => setTimeout(resolve, 2000));
                clearInterval(progressInterval);
                setUploadProgress(100);

                // En una implementación real, aquí se subiría el archivo y se obtendría su ruta
                // Simulamos una nueva ruta
                const fechaActual = new Date();
                const año = fechaActual.getFullYear();
                const nombreArchivo = `fac-${formFactura.proveedor.toLowerCase().substring(0, 3)}-${formFactura.num_factura.toLowerCase()}`;
                const nuevaRuta = `/facturas/${año}/${formFactura.departamento?.toLowerCase().substring(0, 4) || 'dept'}/${nombreArchivo}.pdf`;

                // Actualizamos la ruta en el formulario
                setFormFactura(prev => ({
                    ...prev,
                    ruta_pdf: nuevaRuta
                }));
            }

            // En una implementación real, aquí se enviarían los datos a la API
            // Simulamos la actualización localmente
            const updatedFacturas = facturas.map(factura =>
                factura.idFactura === formFactura.idFactura
                    ? {
                        ...factura,
                        Num_factura: formFactura.num_factura,
                        Fecha_emision: new Date(formFactura.fecha_emision),
                        Estado: formFactura.estado,
                        Importe: parseFloat(formFactura.importe),
                        Ruta_pdf: formFactura.hasNewFile ? formFactura.ruta_pdf : factura.Ruta_pdf
                    }
                    : factura
            );

            setFacturas(updatedFacturas);

            // Mostrar notificación de éxito
            addNotification("Factura actualizada correctamente", "success");

            // Cerrar el modal después de un breve retraso
            setTimeout(() => {
                setShowEditModal(false);
                setEditingFactura(null);
                setUploadProgress(0);
            }, 1000);

        } catch (error) {
            console.error("Error actualizando factura:", error);
            addNotification(`Error al actualizar la factura: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // Función para manejar el envío del formulario de subida
    const handleFileUpload = async () => {
        if (!selectedFile || !selectedFacturaId) {
            addNotification("Por favor, selecciona un archivo PDF", "warning");
            return;
        }

        setIsUploading(true);

        // Crear FormData para enviar el archivo
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('facturaId', selectedFacturaId);

        try {
            // Simulación de progreso (en una implementación real, podrías usar un endpoint que soporte reportar progreso)
            const simulateProgress = () => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    setUploadProgress(progress);
                    if (progress >= 100) {
                        clearInterval(interval);
                    }
                }, 300);
                return interval;
            };

            const progressInterval = simulateProgress();

            // En una implementación real, aquí iría la llamada al endpoint de API
            // const response = await fetch('/api/facturas/upload', {
            //     method: 'POST',
            //     body: formData,
            // });

            // Simulamos una carga exitosa después de que el progreso llegue al 100%
            await new Promise((resolve) => setTimeout(resolve, 3500));
            clearInterval(progressInterval);
            setUploadProgress(100);

            // Actualizamos el estado de la factura localmente
            const facturaIndex = facturas.findIndex(f => f.idFactura === selectedFacturaId);
            if (facturaIndex !== -1) {
                const updatedFacturas = [...facturas];
                // En una implementación real, obtendrías la ruta real del servidor
                const fechaActual = new Date();
                const año = fechaActual.getFullYear();
                const factura = updatedFacturas[facturaIndex];
                // Generamos una ruta siguiendo el patrón observado
                const nombreArchivo = `fac-${factura.Proveedor.toLowerCase().substring(0, 3)}-${factura.Num_factura.toLowerCase()}`;
                const ruta = `/facturas/${año}/${factura.Departamento?.toLowerCase().substring(0, 4) || 'dept'}/${nombreArchivo}.pdf`;

                updatedFacturas[facturaIndex] = {
                    ...updatedFacturas[facturaIndex],
                    Ruta_pdf: ruta
                };
                setFacturas(updatedFacturas);
            }

            addNotification("Factura subida correctamente", "success");

            // Cerrar el modal después de un breve retraso para mostrar el 100%
            setTimeout(() => {
                setShowUploadModal(false);
                setSelectedFacturaId(null);
                setSelectedFile(null);
                setUploadProgress(0);
            }, 1000);

        } catch (error) {
            console.error("Error subiendo factura:", error);
            addNotification(`Error al subir la factura: ${error.message}`, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // Función para cerrar dropdown cuando se hace clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (openDropdown !== null && !event.target.closest('.estado-dropdown')) {
                setOpenDropdown(null);
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [openDropdown]);

    // Función para actualizar el estado de una factura
    const handleUpdateEstado = async (facturaId, nuevoEstado) => {
        // Solo admin y contable pueden cambiar estados
        if (userRole !== 'Administrador' && userRole !== 'Contable') {
            addNotification("No tienes permisos para cambiar el estado de las facturas", "error");
            setOpenDropdown(null);
            return;
        }

        setUpdatingFactura(facturaId);

        try {
            // Implementar llamada a la API para actualizar el estado
            // En una implementación real, esta sería la ruta a tu API
            const response = await fetch('/api/facturas/actualizarEstado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idFactura: facturaId,
                    nuevoEstado: nuevoEstado
                }),
            });

            // Si no existe la API, simulamos el cambio localmente
            if (!response.ok) {
                // Actualización local para demo
                const updatedFacturas = facturas.map(factura =>
                    factura.idFactura === facturaId
                        ? { ...factura, Estado: nuevoEstado }
                        : factura
                );

                setFacturas(updatedFacturas);

                addNotification(`Estado de factura actualizado a: ${nuevoEstado}`, "success");
            } else {
                const data = await response.json();

                // Actualizar facturas con la respuesta del servidor
                const updatedFacturas = facturas.map(factura =>
                    factura.idFactura === facturaId
                        ? { ...factura, Estado: nuevoEstado }
                        : factura
                );

                setFacturas(updatedFacturas);

                addNotification(data.message || `Estado actualizado a: ${nuevoEstado}`, "success");
            }
        } catch (error) {
            console.error("Error al actualizar estado:", error);

            // Para demo, actualizamos localmente incluso si hay error en API
            const updatedFacturas = facturas.map(factura =>
                factura.idFactura === facturaId
                    ? { ...factura, Estado: nuevoEstado }
                    : factura
            );

            setFacturas(updatedFacturas);

            addNotification("Estado actualizado localmente (la API no está disponible)", "warning");
        } finally {
            setUpdatingFactura(null);
            setOpenDropdown(null);
        }
    };

    // Verificar si hay facturas con PDF para descargar
    const hayFacturasDescargables = useMemo(() => {
        return selectedFacturas.some(id => {
            const factura = facturas.find(f => f.idFactura === id);
            return factura && factura.Ruta_pdf;
        });
    }, [selectedFacturas, facturas]);

    if (loading || isDepartamentoLoading) {
        return <div className="p-6">Cargando...</div>
    }

    return (
        <div className="p-6 h-[calc(100vh-8rem)] flex flex-col">
            {/* Mostrar notificaciones */}
            {notificationComponents}

            {/* Encabezado */}
            <div className="mb-4">
                <h1 className="text-3xl font-bold">Facturas</h1>
                <h2 className="text-xl text-gray-400">Departamento {departamento}</h2>
            </div>

            {/* Estado de error */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="flex justify-end" >
                    <button
                        onClick={handleClearFilters}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                        <X className="w-4 h-4 cursor-pointer" />
                        Limpiar filtros
                    </button>
                </div>
            </div>
            {/* Filtros y búsqueda */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por número de factura o orden..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md pl-10"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                </div>

                {/* Filtro de mes */}
                <div className="relative">
                    <select
                        value={filterMes}
                        onChange={(e) => setFilterMes(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
                    >
                        <option value="">Todos los meses</option>
                        {fechasFiltradas.meses.map((mes) => (
                            <option key={`mes-${mes}`} value={mes}>
                                {getNombreMes(mes)}
                            </option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                </div>

                {/* Filtro de año */}
                <div className="relative">
                    <select
                        value={filterAño}
                        onChange={(e) => setFilterAño(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
                    >
                        <option value="">Todos los años</option>
                        {fechasFiltradas.años.map((año) => (
                            <option key={`año-${año}`} value={año}>
                                {año}
                            </option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                </div>

                {/* Nuevo filtro de importe */}
                <div className="relative">
                    <select
                        value={filterImporte}
                        onChange={(e) => setFilterImporte(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
                    >
                        <option value="">Todos los importes</option>
                        <option value="0-500">Menos de 500€</option>
                        <option value="500-1000">500€ - 1,000€</option>
                        <option value="1000-5000">1,000€ - 5,000€</option>
                        <option value="5000+">Más de 5,000€</option>
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Euro className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
                    >
                        <option value="">Todos los estados</option>
                        <option value="Contabilizada">Contabilizada</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Anulada">Anulada</option>
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Filter className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={filterDepartamento}
                        onChange={(e) => setFilterDepartamento(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
                        disabled={userRole === "Jefe de Departamento"} // Deshabilitar si es jefe de departamento
                    >
                        <option value="">Todos los departamentos</option>
                        {departamentosList.map((departamento, index) => (
                            <option key={`dep-${index}`} value={departamento}>
                                {departamento}
                            </option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Filter className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                </div>


            </div>

            {/* Indicador de resultados */}
            <div className="mb-2 text-sm text-gray-500">
                Mostrando {filteredFacturas.length} de {facturas.length} facturas
            </div>

            {/* Tabla de facturas */}
            <div className="border border-gray-200 rounded-lg overflow-hidden flex-grow">
                <div className="h-full overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="border-b border-gray-200">
                                <th className="py-3 px-3 w-12">
                                    {filteredFacturas.length > 0 && (
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedFacturas.length === filteredFacturas.length && filteredFacturas.length > 0}
                                                onChange={toggleSelectAll}
                                                className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Nº Factura</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Proveedor</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Fecha emisión</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Importe</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Num Orden</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Estado</th>
                                <th className="py-3 px-4 text-left font-medium text-gray-600">Departamento</th>
                                <th className="py-3 px-4 text-center font-medium text-gray-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFacturas.length > 0 ? (
                                filteredFacturas.map((factura) => (
                                    <tr
                                        key={factura.idFactura}
                                        className={`border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedFacturas.includes(factura.idFactura) ? "bg-red-50 hover:bg-red-100" : ""
                                            }`}
                                        onClick={() => toggleSelectFactura(factura.idFactura)}
                                    >
                                        <td className="py-3 px-3 w-12" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFacturas.includes(factura.idFactura)}
                                                    onChange={() => toggleSelectFactura(factura.idFactura)}
                                                    className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">{factura.Num_factura}</td>
                                        <td className="py-3 px-4">{factura.Proveedor}</td>
                                        <td className="py-3 px-4">{formatDate(factura.Fecha_emision)}</td>
                                        <td className="py-3 px-4">{factura.Importe ? `${factura.Importe.toLocaleString()}€` : '-'}</td>
                                        <td className="py-3 px-4">{factura.Num_orden}</td>
                                        <td className="py-3 px-4">
                                            <div className="relative w-32 estado-dropdown">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdown(openDropdown === factura.idFactura ? null : factura.idFactura);
                                                    }}
                                                    className={`border rounded px-3 py-1 w-full text-sm cursor-pointer ${factura.Estado === "Contabilizada"
                                                        ? "bg-green-50 text-green-800"
                                                        : factura.Estado === "Pendiente"
                                                            ? "bg-yellow-50 text-yellow-800"
                                                            : "bg-red-50 text-red-800"
                                                        }`}
                                                    disabled={updatingFactura === factura.idFactura}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span>{updatingFactura === factura.idFactura ? "Actualizando..." : factura.Estado}</span>
                                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                </button>

                                                {/* Dropdown para cambiar estado */}
                                                {openDropdown === factura.idFactura && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20">
                                                        {estadoOptions.map((estado) => (
                                                            <button
                                                                key={estado}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateEstado(factura.idFactura, estado);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${estado === factura.Estado ? "font-semibold bg-gray-50" : ""
                                                                    }`}
                                                            >
                                                                {estado}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                                {factura.Departamento}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <div className="flex justify-center gap-2 items-center">
                                                {/* Icono de ojo para previsualizar PDF cuando existe */}
                                                {factura.Ruta_pdf && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewPdf(factura.idFactura, factura.Num_factura);
                                                        }}
                                                        className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 cursor-pointer"
                                                        title="Ver PDF"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="py-6 text-center text-gray-500">
                                        {userRole === "Jefe de Departamento"
                                            ? `No se encontraron facturas para el departamento de ${departamento}`
                                            : searchTerm || filterMes || filterAño || filterImporte || filterProveedor || filterEstado
                                                ? "No se encontraron facturas con los criterios de búsqueda actuales"
                                                : "No se encontraron facturas."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Visor de PDF */}
            {showPdfViewer && (
                <PdfViewer
                    pdfUrl={selectedPdfUrl}
                    fileName={selectedPdfName}
                    onClose={() => setShowPdfViewer(false)}
                />
            )}

            {/* Botones de acción */}
            <div className="flex justify-between mt-4 mb-4">
                {/* Botón para descargar facturas seleccionadas como Excel */}
                <button
                    onClick={handleDescargarSeleccionadas}
                    disabled={selectedFacturas.length === 0}
                    className={`flex items-center gap-2 bg-red-600 opacity-80 text-white px-6 py-2 rounded-md ${selectedFacturas.length > 0
                        ? "hover:bg-red-700 cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Exportar a Excel {selectedFacturas.length > 0 ? `(${selectedFacturas.length})` : ""}</span>
                </button>
            </div>

            {/* Modal para subir factura */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(2px)"
                    }}
                >
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Subir Factura PDF</h2>
                            <button
                                onClick={() => !isUploading && setShowUploadModal(false)}
                                className="text-gray-500 hover:text-red-600"
                                disabled={isUploading}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Selecciona un archivo PDF:</label>
                                <div className="flex items-center">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        ref={fileInputRef}
                                        disabled={isUploading}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center gap-2"
                                        disabled={isUploading}
                                    >
                                        <Upload className="w-4 h-4" />
                                        Seleccionar PDF
                                    </button>
                                    <span className="ml-3 text-sm text-gray-500">
                                        {selectedFile ? selectedFile.name : "Ningún archivo seleccionado"}
                                    </span>
                                </div>
                            </div>

                            {isUploading && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1 text-center">
                                        {uploadProgress < 100 ? 'Subiendo...' : 'Completado!'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => !isUploading && setShowUploadModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                                disabled={isUploading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleFileUpload}
                                disabled={!selectedFile || isUploading}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isUploading ? "Subiendo..." : "Subir Factura"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para editar factura */}
            {showEditModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(2px)"
                    }}
                >
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Editar Factura</h2>
                            <button
                                onClick={() => !isUploading && setShowEditModal(false)}
                                className="text-gray-500 hover:text-red-600"
                                disabled={isUploading}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Campos editables */}
                            <div>
                                <label className="block text-gray-700 mb-1">Número de Factura</label>
                                <input
                                    type="text"
                                    name="num_factura"
                                    value={formFactura.num_factura}
                                    onChange={handleEditFormChange}
                                    className="border border-gray-300 rounded px-3 py-2 w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-1">Fecha de Emisión</label>
                                <input
                                    type="date"
                                    name="fecha_emision"
                                    value={formFactura.fecha_emision}
                                    onChange={handleEditFormChange}
                                    className="border border-gray-300 rounded px-3 py-2 w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-1">Importe (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="importe"
                                    value={formFactura.importe}
                                    onChange={handleEditFormChange}
                                    className="border border-gray-300 rounded px-3 py-2 w-full"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-1">Estado</label>
                                <div className="relative">
                                    <select
                                        name="estado"
                                        value={formFactura.estado}
                                        onChange={handleEditFormChange}
                                        className="appearance-none border border-gray-300 rounded px-3 py-2 w-full pr-8"
                                        required
                                    >
                                        <option value="">Seleccionar estado</option>
                                        {estadoOptions.map((estado) => (
                                            <option key={estado} value={estado}>
                                                {estado}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Campos no editables (informativos) */}
                            <div>
                                <label className="block text-gray-700 mb-1">Número de Orden</label>
                                <input
                                    type="text"
                                    value={formFactura.num_orden}
                                    className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-1">Proveedor</label>
                                <input
                                    type="text"
                                    value={formFactura.proveedor}
                                    className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-1">Departamento</label>
                                <input
                                    type="text"
                                    value={formFactura.departamento}
                                    className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                                    disabled
                                />
                            </div>

                            {/* Sección para cambiar el PDF */}
                            <div className="md:col-span-2 mt-4">
                                <div className="border-t border-gray-200 pt-4">
                                    <h3 className="font-medium mb-2">Archivo de Factura</h3>

                                    {formFactura.ruta_pdf ? (
                                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-red-600 text-xs">PDF</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Factura actual</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-xs">{formFactura.ruta_pdf}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/api/facturas/descargar?id=${formFactura.idFactura}`}
                                                    className="text-xs text-blue-600 hover:underline"
                                                    target="_blank"
                                                >
                                                    Ver
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay archivo PDF asociado a esta factura.</p>
                                    )}

                                    <div className="mt-3">
                                        <div className="flex items-center">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleEditFileChange}
                                                className="hidden"
                                                ref={editFileInputRef}
                                                disabled={isUploading}
                                            />
                                            <button
                                                onClick={() => editFileInputRef.current?.click()}
                                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center gap-2"
                                                disabled={isUploading}
                                            >
                                                <Upload className="w-4 h-4" />
                                                {formFactura.ruta_pdf ? "Cambiar PDF" : "Subir PDF"}
                                            </button>
                                            <span className="ml-3 text-sm text-gray-500">
                                                {formFactura.hasNewFile && formFactura.newFile
                                                    ? formFactura.newFile.name
                                                    : "Ningún archivo nuevo seleccionado"}
                                            </span>
                                        </div>
                                    </div>

                                    {isUploading && formFactura.hasNewFile && (
                                        <div className="mt-4">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-green-600 h-2.5 rounded-full"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1 text-center">
                                                {uploadProgress < 100 ? 'Subiendo...' : 'Completado!'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => !isUploading && setShowEditModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                                disabled={isUploading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveFacturaChanges}
                                disabled={isUploading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isUploading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para previsualizar y exportar Excel */}
            {showExportModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Exportar a Excel</h2>
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="text-gray-500 hover:text-red-600"
                                disabled={isGeneratingExcel}
                            >
                                <X className="w-6 h-6 cursor-pointer" />
                            </button>
                        </div>

                        {/* Nombre del archivo */}
                        <div className="mb-6">
                            <label className="block text-gray-700 mb-1">Nombre del archivo</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={excelFileName}
                                    onChange={(e) => setExcelFileName(e.target.value)}
                                    className="border border-gray-300 rounded px-3 py-2 flex-grow"
                                    disabled={isGeneratingExcel}
                                />
                                <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded px-3 py-2">.xlsx</span>
                            </div>
                        </div>

                        {/* Vista previa de los datos */}
                        <div className="mb-6">
                            <h3 className="font-medium text-gray-700 mb-2">Vista previa de los datos</h3>
                            <div className="border border-gray-200 rounded overflow-x-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            {exportData.length > 0 && Object.keys(exportData[0]).map(header => (
                                                <th key={header} className="py-2 px-4 text-left text-xs font-medium text-gray-600 uppercase">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exportData.length > 0 ? (
                                            exportData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="border-t border-gray-200">
                                                    {Object.values(row).map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="py-2 px-4">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="py-4 text-center text-gray-500">
                                                    No hay datos para exportar
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Se exportarán {exportData.length} facturas {selectedFacturas.length > 0 ? 'seleccionadas' : 'filtradas'}.
                            </p>
                        </div>

                        {/* Información sobre qué se exportará */}
                        <div className="mb-6 bg-blue-50 p-4 rounded-md text-blue-700 text-sm">
                            <p className="font-medium mb-1">Información sobre la exportación:</p>
                            <ul className="list-disc list-inside">
                                <li>Se exportarán {exportData.length} facturas en formato Excel (.xlsx)</li>
                                <li>Las columnas incluidas son: Número de factura, Número de orden, Proveedor, Departamento, Fecha de emisión, Importe y Estado</li>
                                <li>
                                    {selectedFacturas.length > 0
                                        ? `Has seleccionado ${selectedFacturas.length} facturas para exportar`
                                        : 'Se exportarán todas las facturas visibles según los filtros aplicados'}
                                </li>
                                <li>El archivo generado se podrá abrir directamente en Microsoft Excel u otras aplicaciones de hojas de cálculo</li>
                            </ul>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
                                disabled={isGeneratingExcel}
                            >
                                Cancelar
                            </button>

                            {/* Botón descargar */}
                            <button
                                onClick={downloadExcel}
                                disabled={isGeneratingExcel || exportData.length === 0}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                            >
                                {isGeneratingExcel ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Descargar Excel
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}