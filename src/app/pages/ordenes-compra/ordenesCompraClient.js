"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Pencil, X, Search, Filter, Check, Info, Calendar, Download, FileText } from "lucide-react";
import Button from "@/app/components/ui/button"
import useNotifications from "@/app/hooks/useNotifications"
import ConfirmationDialog from "@/app/components/ui/confirmation-dialog"
import useUserDepartamento from "@/app/hooks/useUserDepartamento"
import OrdenModal from "@/app/components/modals/OrdenModal";

export default function OrdenesCompraClient({
  initialOrdenes,
  initialDepartamentos,
  initialProveedores,
}) {
  // Obtener el departamento del usuario
  const { departamento, userRole, isLoading: isDepartamentoLoading } = useUserDepartamento();
  const canEdit = userRole !== "Contable";

  // Obtener el año actual
  const currentYear = new Date().getFullYear().toString().substring(2); // Solo tomamos los 2 últimos dígitos

  // Estados para los tipos de ordenes
  const [estadosOrden, setEstadosOrden] = useState([
    { id_EstadoOrden: 1, tipo: 'En proceso' },
    { id_EstadoOrden: 2, tipo: 'Anulada' },
    { id_EstadoOrden: 3, tipo: 'Confirmada' }
  ]);

  // Estados principales
  const [ordenes, setOrdenes] = useState(initialOrdenes);
  const [departamentos, setDepartamentos] = useState(Array.isArray(initialDepartamentos) ? initialDepartamentos : []);
  const [proveedores] = useState(initialProveedores);
  const [selectedOrdenes, setSelectedOrdenes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' o 'edit'
  const [formError, setFormError] = useState("");

  // Añadir este nuevo useEffect para normalizar el campo Factura en todas las órdenes
  useEffect(() => {
    if (initialOrdenes) {
      console.log("Datos originales de órdenes:", initialOrdenes);

      const ordenesNormalizadas = initialOrdenes.map(orden => {
        // Verificar el valor de Factura que llega inicialmente
        console.log(`Orden ${orden.idOrden} - Factura original:`, orden.Factura);

        return {
          ...orden,
          // Asegurarse de que Factura sea un valor numérico o booleano
          Factura: orden.Factura === 1 || orden.Factura === true ? 1 : 0
        };
      });

      console.log("Órdenes normalizadas:", ordenesNormalizadas);
      setOrdenes(ordenesNormalizadas);
    }
  }, [initialOrdenes]);

  // Estado para tooltips/popovers de información detallada
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Estados para búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [filterInventariable, setFilterInventariable] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  // Estados para los filtros de fecha
  const [filterMes, setFilterMes] = useState("");
  const [filterAño, setFilterAño] = useState("");

  // NUEVO: Estados para exportación a Excel
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [excelFileName, setExcelFileName] = useState("ordenes_compra");
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  // Hook de notificaciones
  const { addNotification, notificationComponents } = useNotifications();

  // Estado del formulario
  const [formularioOrden, setFormularioOrden] = useState({
    idOrden: null,
    numero: "",
    esInversion: false, // ← ASEGURAR que siempre tenga un valor inicial definido
    numInversion: "",
    importe: "",
    fecha: "",
    descripcion: "",
    inventariable: false, // ← ASEGURAR que siempre tenga un valor inicial definido
    cantidad: "",
    departamento: "",
    proveedor: "",
    factura: false,
    estadoOrden: "En proceso",
  });
  // Calcular la fecha límite (5 años atrás)
  const getFechaLimite = () => {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setFullYear(hoy.getFullYear() - 5);
    return fechaLimite;
  };

  const fechaLimite = getFechaLimite();
  const fechaLimiteFormatted = fechaLimite.toISOString().split('T')[0];

  // 3. Asegurarnos que el useEffect para establecer el departamento del Jefe funciona correctamente
  useEffect(() => {
    // Si es Jefe de Departamento, establecer el filtro automáticamente
    if (userRole === "Jefe de Departamento" && departamento) {
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
  }, [userRole, departamento]);

  // Obtenemos el siguiente número de orden para un departamento
  const getNextNumeroOrden = (departamentoCodigo) => {
    // Filtrar órdenes del mismo departamento y año
    const ordenesDelDepartamento = ordenes.filter(orden => {
      // Extraer el código de departamento de Num_orden (primeras letras antes de /)
      const ordenDepCodigo = orden.Num_orden?.split('/')[0];
      return ordenDepCodigo === departamentoCodigo;
    });

    // Si no hay órdenes previas, empezar con 001
    if (ordenesDelDepartamento.length === 0) {
      return '001';
    }

    // Buscar el número más alto y sumar 1
    let maxNumero = 0;
    ordenesDelDepartamento.forEach(orden => {
      // Extraer el número de orden (segundo segmento después del primer /)
      const numOrden = parseInt(orden.Num_orden?.split('/')[1], 10);
      if (!isNaN(numOrden) && numOrden > maxNumero) {
        maxNumero = numOrden;
      }
    });

    // Incrementar y formatear con leading zeros
    return (maxNumero + 1).toString().padStart(3, '0');
  };

  // Generar el código de orden automáticamente
  const generarNumeroOrden = () => {
    if (!formularioOrden.departamento) return "";

    // Obtener las primeras 3 letras del departamento para el código
    const departamentoCodigo = formularioOrden.departamento.substring(0, 3).toUpperCase();

    const numeroOrden = getNextNumeroOrden(departamentoCodigo);
    const esInventariable = formularioOrden.inventariable ? "1" : "0";

    // Formato: [DEPCOD]/[NUMORDEN]/[AÑO]/[0-1]
    return `${departamentoCodigo}/${numeroOrden}/${currentYear}/${esInventariable}`;
  };

  // Actualizar número orden cuando cambia departamento o inventariable
  useEffect(() => {
    if (modalMode === "add" && formularioOrden.departamento) {
      const nuevoNumeroOrden = generarNumeroOrden();
      setFormularioOrden(prev => ({
        ...prev,
        numero: nuevoNumeroOrden
      }));
    }
  }, [formularioOrden.departamento, formularioOrden.inventariable, modalMode]);

  // Generar número de inversión automáticamente
  const generarNumeroInversion = () => {
    if (!formularioOrden.departamento || !formularioOrden.esInversion) return "";

    // Buscar el departamento seleccionado para obtener su ID
    const departamentoSeleccionado = departamentos.find(
      dep => dep.Nombre === formularioOrden.departamento
    );

    if (!departamentoSeleccionado) return "";

    const idDepartamento = departamentoSeleccionado.id_Departamento;

    // Filtrar inversiones previas del mismo departamento
    const inversionesDepartamento = ordenes.filter(orden => {
      const ordenDep = orden.Departamento === formularioOrden.departamento;
      return ordenDep && orden.Num_inversion;
    });

    // Determinar el siguiente número
    let siguienteNumero = inversionesDepartamento.length + 1;

    // CORREGIDO: Formato numérico de 7 dígitos: [ID_DEPARTAMENTO][000000X]
    // Por ejemplo: 1000001, 2000001, etc.
    const numeroInversion = parseInt(`${idDepartamento}${siguienteNumero.toString().padStart(6, '0')}`);

    return numeroInversion;
  };

  // Actualizar número de inversión cuando se activa la casilla
  useEffect(() => {
    if (formularioOrden.esInversion && !formularioOrden.numInversion) {
      setFormularioOrden(prev => ({
        ...prev,
        numInversion: generarNumeroInversion()
      }));
    } else if (!formularioOrden.esInversion) {
      setFormularioOrden(prev => ({
        ...prev,
        numInversion: ""
      }));
    }
  }, [formularioOrden.esInversion, formularioOrden.departamento]);

  // Función para formatear fechas
  function formatDate(dateString) {
    if (!dateString) return "-";
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString();
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }

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

  // Función para formatear inventariable
  function formatInventariable(value) {
    if (value === 1 || value === "1" || value === true) return "Sí";
    if (value === 0 || value === "0" || value === false) return "No";
    return value || "-";
  }

  // Obtener fechas filtradas según las selecciones actuales
  const fechasFiltradas = useMemo(() => {
    // Filtrar órdenes según los filtros de fecha seleccionados
    const ordenesFiltradas = ordenes.filter(orden => {
      if (!orden.Fecha) return false;

      const { mes, año } = getDateParts(orden.Fecha);

      if (filterMes && mes !== filterMes) return false;
      if (filterAño && año !== filterAño) return false;

      return true;
    });

    // Extraer meses y años disponibles de las órdenes filtradas
    const meses = new Set();
    const años = new Set();

    ordenesFiltradas.forEach(orden => {
      const { mes, año } = getDateParts(orden.Fecha);
      meses.add(mes);
      años.add(año);
    });

    return {
      meses: Array.from(meses).sort((a, b) => parseInt(a) - parseInt(b)),
      años: Array.from(años).sort((a, b) => parseInt(a) - parseInt(b))
    };
  }, [ordenes, filterMes, filterAño]);

  // Obtener proveedores filtrados por departamento
  const proveedoresFiltrados = useMemo(() => {
    // Para todos los roles, mostrar solo proveedores que estén en órdenes
    let proveedoresDisponibles = [];

    // Si hay departamento seleccionado, mostrar solo proveedores de ese departamento
    if (filterDepartamento) {
      proveedoresDisponibles = proveedores.filter(proveedor => {
        return initialOrdenes.some(orden =>
          orden.Proveedor === proveedor.Nombre && orden.Departamento === filterDepartamento
        );
      });
    } else {
      // Si no hay departamento seleccionado, mostrar todos los proveedores que aparecen en órdenes
      // Esto es para Admin/Contable cuando no filtran por departamento
      const proveedoresEnOrdenes = new Set();
      initialOrdenes.forEach(orden => {
        proveedoresEnOrdenes.add(orden.Proveedor);
      });

      proveedoresDisponibles = proveedores.filter(proveedor =>
        proveedoresEnOrdenes.has(proveedor.Nombre)
      );
    }

    return proveedoresDisponibles;
  }, [filterDepartamento, proveedores, initialOrdenes]);

  // Reset proveedor cuando cambia departamento
  useMemo(() => {
    // Solo resetear el proveedor para el rol Jefe de Departamento
    if (userRole === "Jefe de Departamento") {
      setFilterProveedor("");
    }
  }, [filterDepartamento, userRole]);

  // Filtrar órdenes según los criterios de búsqueda y filtrado
  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((orden) => {
      // Filtro por término de búsqueda (número, descripción)
      const matchesSearch =
        searchTerm === "" ||
        orden.Num_orden?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.Descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (orden.Num_inversion?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por departamento
      const matchesDepartamento = filterDepartamento === "" ||
        orden.Departamento === filterDepartamento;

      // Filtro por proveedor
      const matchesProveedor = filterProveedor === "" ||
        orden.Proveedor === filterProveedor;

      // Filtro por estado
      const matchesEstado = filterEstado === "" ||
        orden.Estado === filterEstado;

      // Filtro por inventariable
      const matchesInventariable = filterInventariable === "" ||
        (filterInventariable === "inventariable" && orden.Inventariable === 1) ||
        (filterInventariable === "no-inventariable" && orden.Inventariable === 0);

      // Filtro por fecha
      let matchesFecha = true;
      if (filterMes || filterAño) {
        if (!orden.Fecha) return false;

        const { mes, año } = getDateParts(orden.Fecha);

        if (filterMes && mes !== filterMes) matchesFecha = false;
        if (filterAño && año !== filterAño) matchesFecha = false;
      }

      return matchesSearch && matchesDepartamento && matchesProveedor && matchesInventariable && matchesFecha && matchesEstado;
    });
  }, [ordenes, searchTerm, filterDepartamento, filterProveedor, filterInventariable, filterMes, filterAño, filterEstado]);

  // NUEVO: Preparar datos para Excel según órdenes seleccionadas
  const prepareExportData = () => {
    // Si no hay órdenes seleccionadas, usar todas las filtradas
    const ordenesToExport = selectedOrdenes.length > 0
      ? ordenes.filter(o => selectedOrdenes.includes(o.idOrden))
      : filteredOrdenes;

    // Crear la estructura de datos para Excel
    const data = ordenesToExport.map(orden => ({
      'Número Orden': orden.Num_orden || '',
      'Descripción': orden.Descripcion || '',
      'Fecha': formatDate(orden.Fecha),
      'Importe (€)': orden.Importe || 0,
      'Inventariable': formatInventariable(orden.Inventariable),
      'Cantidad': orden.Cantidad || 0,
      'Departamento': orden.Departamento || '',
      'Proveedor': orden.Proveedor || '',
      'Número Inversión': orden.Num_inversion || '',
      'Factura': formatInventariable(orden.Factura),
      'Estado': orden.Estado || 'En proceso'
    }));

    return data;
  };

  // NUEVO: Función para generar Excel
  // Función para generar CSV
  const generateExcel = async () => {
    try {
      setIsGeneratingExcel(true);

      // Crear cabeceras del CSV
      const headers = Object.keys(exportData[0]);
      let csvContent = headers.join(',') + '\n';

      // Añadir filas de datos
      exportData.forEach(row => {
        const values = headers.map(header => {
          const cellValue = row[header] || '';
          // Escapar comillas y encerrar en comillas cualquier valor que contenga comas
          return typeof cellValue === 'string' && (cellValue.includes(',') || cellValue.includes('"'))
            ? `"${cellValue.replace(/"/g, '""')}"`
            : cellValue;
        });
        csvContent += values.join(',') + '\n';
      });

      // Convertir a Blob para descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Crear URL para previsualización
      const url = URL.createObjectURL(blob);

      // Configurar opciones para descarga
      return {
        url,
        blob,
        filename: `${excelFileName}.csv`
      };

    } catch (error) {
      console.error("Error generando archivo CSV:", error);
      addNotification("Error al generar el archivo CSV", "error");
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
  const handleExportClick = () => {
    // Si no hay órdenes seleccionadas y el usuario presionó el botón Exportar
    if (selectedOrdenes.length === 0) {
      // Mostrar alerta para seleccionar órdenes
      addNotification("Por favor, selecciona al menos una orden de compra para exportar", "warning");
      return;
    }

    // Si hay órdenes filtradas pero ninguna seleccionada específicamente
    if (selectedOrdenes.length === 0 && filteredOrdenes.length === 0) {
      addNotification("No hay órdenes para exportar", "warning");
      return;
    }

    // Preparar datos para exportación
    const data = prepareExportData();
    setExportData(data);

    // Generar nombre de archivo con fecha actual
    const today = new Date();
    const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    setExcelFileName(`ordenes_compra_${formattedDate}`);

    // Mostrar modal
    setShowExportModal(true);
  };
  // Toggle selección de orden
  const toggleSelectOrden = (ordenId) => {
    if (selectedOrdenes.includes(ordenId)) {
      setSelectedOrdenes(selectedOrdenes.filter((id) => id !== ordenId));
    } else {
      setSelectedOrdenes([...selectedOrdenes, ordenId]);
    }
  };

  // Función para seleccionar/deseleccionar todas las órdenes mostradas
  const toggleSelectAll = () => {
    if (selectedOrdenes.length === filteredOrdenes.length) {
      setSelectedOrdenes([]);
    } else {
      setSelectedOrdenes(filteredOrdenes.map((o) => o.idOrden));
    }
  };

  // Función para limpiar los filtros de fecha
  const limpiarFiltros = () => {
    setFilterMes("");
    setFilterAño("");
    setFilterProveedor("");
    if (userRole !== "Jefe de Departamento") {
      setFilterDepartamento("");
    }
    setSearchTerm("");
    setSelectedOrdenes([]);
    setFilterInventariable("");
    setFilterEstado("");

  };

  // Abrir modal de añadir orden
  const handleOpenAddModal = () => {
    limpiarFormulario();

    // Si es Jefe de Departamento, preseleccionamos su departamento
    if (userRole === "Jefe de Departamento" && departamento) {
      setFormularioOrden(prev => ({
        ...prev,
        departamento: departamento,
        esInversion: false, // ← Asegurar que esté definido
        inventariable: false // ← Asegurar que esté definido
      }));
    }

    setModalMode("add");
    setShowModal(true);
  };

  // Añade la propiedad estadoOrden al objeto
  const handleOpenEditModal = (orden) => {
    const esInventariable = !!(orden.Inventariable === 1 || orden.Inventariable === true);
    const esInversion = !!(orden.Num_inversion && orden.Num_inversion !== null);
    const tieneFactura = !!(orden.Factura === 1 || orden.Factura === true);

    setFormularioOrden({
      idOrden: orden.idOrden,
      numero: orden.Num_orden || "",
      esInversion: esInversion, // ← Garantiza que sea booleano
      numInversion: orden.Num_inversion || "",
      importe: orden.Importe || "",
      fecha: formatDateForInput(orden.Fecha) || "",
      descripcion: orden.Descripcion || "",
      inventariable: esInventariable, // ← Garantiza que sea booleano
      cantidad: orden.Cantidad || "",
      departamento: orden.Departamento || "",
      proveedor: orden.Proveedor || "",
      factura: tieneFactura,
      estadoOrden: orden.Estado || "En proceso",
    });
    setModalMode("edit");
    setShowModal(true);
  };

  // Formatear fecha para input
  function formatDateForInput(dateString) {
    if (!dateString) return "";
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateString;
    }
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
  };

  // Limpiar el formulario
  // Añade la propiedad estadoOrden al objeto que se resetea
  // Actualizar el estado inicial del formulario
  const limpiarFormulario = () => {
    setFormularioOrden({
      idOrden: null,
      numero: "",
      esInversion: false,
      numInversion: "",
      importe: "",
      fecha: formatDateForInput(new Date()), // fecha actual por defecto
      descripcion: "",
      inventariable: false,
      cantidad: "",
      departamento: "",
      proveedor: "",
      factura: false,
      estadoOrden: "En proceso",
    });
    setFormError("");
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Para inputs de checkbox - asegurar que siempre sean booleanos
    if (type === 'checkbox') {
      setFormularioOrden(prev => ({
        ...prev,
        [name]: Boolean(checked), // ← Asegurar que sea booleano
      }));
      return;
    }

    // Para todos los demás inputs
    setFormularioOrden(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validar formulario
  const validarFormulario = () => {
    if (!formularioOrden.departamento) {
      setFormError("Por favor, selecciona un departamento");
      return false;
    }
    if (!formularioOrden.proveedor) {
      setFormError("Por favor, selecciona un proveedor");
      return false;
    }
    if (!formularioOrden.importe) {
      setFormError("Por favor, ingresa el importe");
      return false;
    }
    // NUEVA VALIDACIÓN: Importe debe ser mayor que 0
    if (parseFloat(formularioOrden.importe) <= 0) {
      setFormError("El importe debe ser mayor que 0");
      return false;
    }
    if (!formularioOrden.fecha) {
      setFormError("Por favor, ingresa la fecha");
      return false;
    }
    if (!formularioOrden.descripcion) {
      setFormError("Por favor, ingresa la descripción");
      return false;
    }
    if (!formularioOrden.cantidad) {
      setFormError("Por favor, ingresa la cantidad");
      return false;
    }
    // NUEVA VALIDACIÓN: Cantidad debe ser mayor que 0
    if (parseInt(formularioOrden.cantidad) <= 0) {
      setFormError("La cantidad debe ser mayor que 0");
      return false;
    }
    if (formularioOrden.esInversion && !formularioOrden.numInversion) {
      setFormError("Por favor, ingresa el número de inversión");
      return false;
    }
    if (formularioOrden.fecha) {
      const fechaSeleccionada = new Date(formularioOrden.fecha);
      if (fechaSeleccionada < fechaLimite) {
        setFormError("La fecha de la orden no puede ser anterior a 5 años desde hoy");
        return false;
      }
    }
    setFormError("");
    return true;
  };

  // Guardar orden
  const handleGuardarOrden = async () => {
    if (!validarFormulario()) return;

    setIsLoading(true);

    try {
      // Encontrar los IDs necesarios
      const departamentoSeleccionado = departamentos.find(
        dep => dep.Nombre === formularioOrden.departamento
      );

      const proveedorSeleccionado = proveedores.find(
        prov => prov.Nombre === formularioOrden.proveedor
      );

      if (!departamentoSeleccionado || !proveedorSeleccionado) {
        throw new Error("No se encontró el departamento o proveedor seleccionado");
      }

      // Encontrar el ID del estado según su tipo
      const estadoSeleccionado = estadosOrden.find(
        estado => estado.tipo === formularioOrden.estadoOrden
      );

      if (!estadoSeleccionado) {
        throw new Error("No se encontró el estado seleccionado");
      }

      // Preparar los datos base para enviar
      const ordenData = {
        Num_orden: formularioOrden.numero || generarNumeroOrden(),
        Importe: parseFloat(formularioOrden.importe),
        Fecha: formularioOrden.fecha,
        Descripcion: formularioOrden.descripcion,
        Inventariable: formularioOrden.inventariable ? 1 : 0,
        Cantidad: parseInt(formularioOrden.cantidad),
        id_DepartamentoFK: departamentoSeleccionado.id_Departamento,
        id_ProveedorFK: proveedorSeleccionado.idProveedor,
        id_UsuarioFK: 1, // TODO: Obtener el usuario actual de la sesión
        Factura: formularioOrden.factura ? 1 : 0,
        id_EstadoOrdenFK: estadoSeleccionado.id_EstadoOrden,
      };

      const esInversion = formularioOrden.esInversion && formularioOrden.numInversion && formularioOrden.numInversion.toString().trim() !== '';

      if (esInversion) {
        // ES UNA INVERSIÓN
        ordenData.Num_inversion = formularioOrden.numInversion;
        ordenData.id_InversionFK = null; // El backend lo calculará
        ordenData.id_PresupuestoFK = null;
      } else {
        // ES UNA ORDEN NORMAL (NO INVERSIÓN)
        ordenData.Num_inversion = null;
        ordenData.id_InversionFK = null;
        ordenData.id_PresupuestoFK = null; // El backend lo calculará
      }

      let response;
      if (modalMode === "add") {
        // Crear nueva orden
        response = await fetch("/api/getOrden", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ordenData),
        });
      } else {
        // Editar orden existente
        ordenData.idOrden = formularioOrden.idOrden;
        response = await fetch(`/api/getOrden/${formularioOrden.idOrden}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ordenData),
        });
      }

      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}`;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            console.error("❌ Error detallado:", errorData);
          }
        } catch (parseError) {
          console.error("❌ Error al parsear respuesta:", parseError);
        }
        throw new Error(errorMessage);
      }

      // Procesar respuesta exitosa
      let responseData = {};
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        }
      } catch (parseError) {
        console.warn("⚠️ No se pudo parsear respuesta JSON:", parseError);
      }

      // ACTUALIZACIÓN INMEDIATA DEL ESTADO LOCAL ANTES DE RECARGAR
      if (modalMode === "edit") {
        setOrdenes(ordenes.map((orden) =>
          orden.idOrden === formularioOrden.idOrden
            ? {
              ...orden,
              Num_orden: ordenData.Num_orden,
              Importe: ordenData.Importe,
              Fecha: ordenData.Fecha,
              Descripcion: ordenData.Descripcion,
              Inventariable: ordenData.Inventariable,
              Cantidad: ordenData.Cantidad,
              Departamento: formularioOrden.departamento,
              Proveedor: formularioOrden.proveedor,
              Num_inversion: esInversion ? formularioOrden.numInversion : null,
              Estado: formularioOrden.estadoOrden,
              Factura: formularioOrden.factura ? 1 : 0, // Añadir esta línea
            }
            : orden
        ));
      } else if (modalMode === "add") {
        // NUEVA FUNCIONALIDAD: Actualizar estado local cuando se añade una nueva orden
        const nuevaOrden = {
          idOrden: responseData.insertedId || Date.now(), // Usar ID del servidor si está disponible
          Num_orden: ordenData.Num_orden,
          Importe: ordenData.Importe,
          Fecha: ordenData.Fecha,
          Descripcion: ordenData.Descripcion,
          Inventariable: ordenData.Inventariable,
          Cantidad: ordenData.Cantidad,
          Departamento: formularioOrden.departamento,
          Proveedor: formularioOrden.proveedor,
          Num_inversion: esInversion ? formularioOrden.numInversion : null,
          Estado: formularioOrden.estadoOrden,
          Factura: formularioOrden.factura ? 1 : 0,
        };
        setOrdenes([...ordenes, nuevaOrden]);
      }

      // Recargar órdenes desde servidor para garantizar consistencia (pero sin bloquear la UI)
      fetch("/api/getOrden")
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Error al recargar');
        })
        .then(updatedOrders => {
          setOrdenes(updatedOrders);
        })
        .catch(error => {
          console.warn("⚠️ Error recargando desde servidor (usando estado local):", error);
        });

      addNotification(
        modalMode === "add" ? "Orden creada correctamente" : "Orden actualizada correctamente",
        "success"
      );

      handleCloseModal();
    } catch (error) {
      console.error("❌ Error al guardar la orden:", error);
      addNotification(`Error al guardar la orden: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar órdenes seleccionadas
  const handleEliminarOrdenes = () => {
    if (selectedOrdenes.length === 0) {
      addNotification("Por favor, selecciona al menos una orden para eliminar", "warning");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Confirmar eliminación",
      message: `¿Estás seguro de que deseas eliminar ${selectedOrdenes.length} orden(es)? Esta acción no se puede deshacer.`,
      onConfirm: confirmDeleteOrdenes,
    });
  };

  // Confirmar eliminación de órdenes
  const confirmDeleteOrdenes = async () => {
    setIsLoading(true);

    try {
      // Cambiar a POST con un parámetro de acción
      const response = await fetch("/api/getOrden/eliminar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          ids: selectedOrdenes
        }),
      });

      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}`;
        throw new Error(errorMessage);
      }

      // Procesar respuesta
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error al parsear la respuesta:", parseError);
        data = { deletedCount: selectedOrdenes.length };
      }

      // Actualizar lista local
      setOrdenes(ordenes.filter((o) => !selectedOrdenes.includes(o.idOrden)));
      setSelectedOrdenes([]);

      // Mostrar notificación de éxito
      addNotification(
        `${data?.deletedCount || selectedOrdenes.length} orden(es) eliminadas correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al eliminar órdenes:", error);
      addNotification(`Error al eliminar órdenes: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambio en filtro de mes
  const handleMesChange = (e) => {
    const nuevoMes = e.target.value;
    setFilterMes(nuevoMes);

    // Si hay un mes seleccionado, filtrar años disponibles para ese mes
    if (nuevoMes) {
      // No reseteamos los otros filtros para permitir refinamiento
    } else {
      // Si se limpia el mes, mantener los filtros de año
    }
  };

  // Manejar cambio en filtro de año
  const handleAñoChange = (e) => {
    const nuevoAño = e.target.value;
    setFilterAño(nuevoAño);

    // Si hay un año seleccionado, filtrar meses disponibles para ese año
    if (nuevoAño) {
      // No reseteamos los otros filtros para permitir refinamiento
    } else {
      // Si se limpia el año, mantener los filtros de mes
    }
  };

  // Formatear nombre de mes
  const getNombreMes = (numeroMes) => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return meses[parseInt(numeroMes) - 1] || numeroMes;
  };

  // Mostramos un indicador de carga si estamos esperando el departamento
  if (isDepartamentoLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Notificaciones */}
      {notificationComponents}

      {/* Diálogo de confirmación */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Encabezado */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Orden de Compra</h1>
        <h2 className="text-xl text-gray-400">Departamento {departamento}</h2>
      </div>

      {/* Filtros de fecha - NUEVO */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <label className="block text-gray-700 text-sm mb-1">Mes</label>
          <div className="relative">
            <select
              value={filterMes}
              onChange={handleMesChange}
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
        </div>

        <div className="relative">
          <label className="block text-gray-700 text-sm mb-1">Año</label>
          <div className="relative">
            <select
              value={filterAño}
              onChange={handleAñoChange}
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
        </div>

        <div className="relative">
          <label className="block text-gray-700 text-sm mb-1">Estado de Ordenes</label>
          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
            >
              <option value="">Todos los estados</option>
              <option value="En proceso">En proceso</option>
              <option value="Anulada">Anulada</option>
              <option value="Confirmada">Confirmada</option>
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={limpiarFiltros}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 w-full cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por número, descripción..."
            value={searchTerm}
            maxLength={100}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="relative">
          <select
            value={filterDepartamento}
            onChange={(e) => setFilterDepartamento(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
            disabled={userRole === "Jefe de Departamento"} // Deshabilitar si es jefe de departamento
          >
            {/* Si es Jefe, mostrar solo su departamento, si no mostrar todos */}
            {userRole === "Jefe de Departamento" ? (
              <option value={departamento}>{departamento}</option>
            ) : (
              <>
                <option value="">Todos los departamentos</option>
                {Array.isArray(departamentos) && departamentos.map(dep => (
                  <option key={dep.id_Departamento || dep.id || dep._id} value={dep.Nombre}>
                    {dep.Nombre}
                  </option>
                ))}
              </>
            )}
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
            value={filterProveedor}
            onChange={(e) => setFilterProveedor(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
          >
            <option value="">Todos los proveedores</option>
            {/* Siempre usamos los proveedores filtrados según la lógica corregida arriba */}
            {proveedoresFiltrados.map((proveedor, index) => (
              <option key={`${proveedor.idProveedor}-${index}`} value={proveedor.Nombre}>
                {proveedor.Nombre}
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

        <div className="relative">
          <select
            value={filterInventariable}
            onChange={(e) => setFilterInventariable(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md appearance-none"
          >
            <option value="">Todos</option>
            <option value="inventariable">Inventariable</option>
            <option value="no-inventariable">Fungible</option>
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Indicador de resultados */}
      <div className="mb-2 text-sm text-gray-500">
        Mostrando {filteredOrdenes.length} de {ordenes.length} órdenes
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-lg overflow-hidden flex-grow">
        <div className="h-full overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="py-3 px-3 w-12">
                  {filteredOrdenes.length > 0 && (
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedOrdenes.length === filteredOrdenes.length &&
                          filteredOrdenes.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </th>
                {/* Columnas */}
                <th className="text-left py-3 px-4 font-medium text-gray-600">Num.Orden</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Descripción</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Fecha</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Importe</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Inv.</th>
                <th className="text-center py-3 px-3 font-medium text-gray-600">Cant.</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Dep./Prov.</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Factura</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Estado</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrdenes.length > 0 ? (
                filteredOrdenes.map((orden) => (
                  <tr
                    key={orden.idOrden}
                    className={`border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedOrdenes.includes(orden.idOrden) ? "bg-red-50 hover:bg-red-100" : ""
                      }`}
                    onClick={() => toggleSelectOrden(orden.idOrden)}
                  >
                    <td className="py-3 px-3 w-12" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedOrdenes.includes(orden.idOrden)}
                          onChange={() => toggleSelectOrden(orden.idOrden)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Número de Orden con tooltip para Inversión */}
                    <td className="py-3 px-4 relative">
                      <div className="flex items-center">
                        <span className="truncate max-w-[120px]" title={orden.Num_orden}>{orden.Num_orden}</span>
                        {orden.Num_inversion && (
                          <div className="ml-2 relative"
                            onMouseEnter={() => setActiveTooltip(`inv-${orden.idOrden}`)}
                            onMouseLeave={() => setActiveTooltip(null)}>
                            <Info className="h-4 w-4 text-blue-500" />

                            {activeTooltip === `inv-${orden.idOrden}` && (
                              <div className="absolute z-50 top-6 left-0 bg-white border border-gray-200 rounded p-3 shadow-lg w-48">
                                <p className="font-semibold">Núm. Inversión:</p>
                                <p>{orden.Num_inversion}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="py-3 px-4">
                      <div className="truncate max-w-[200px]" title={orden.Descripcion}>{orden.Descripcion}</div>
                    </td>

                    {/* Fecha */}
                    <td className="py-2 px-2 text-center">
                      {formatDate(orden.Fecha)}
                    </td>

                    {/* Importe */}
                    <td className="py-3 px-4 text-center font-medium">
                      {orden.Importe}€
                    </td>

                    {/* Inventariable */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex justify-center">
                        {orden.Inventariable === 1 || orden.Inventariable === true ? (
                          "Sí"
                        ) : (
                          "No"
                        )}
                      </div>
                    </td>

                    {/* Cantidad */}
                    <td className="py-3 px-3 text-center">
                      {orden.Cantidad}
                    </td>

                    {/* Departamento y Proveedor (combinados) */}
                    <td className="py-3 px-4 relative">
                      <div className="flex flex-col">
                        <span className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs truncate max-w-[120px]"
                          title={orden.Departamento}>
                          {orden.Departamento}
                        </span>
                        <span className="text-xs mt-1 truncate max-w-[120px]" title={orden.Proveedor}>
                          {orden.Proveedor}
                        </span>
                      </div>
                    </td>

                    {/* Facturas */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex justify-center">
                        {orden.Factura === 1 || orden.Factura === true ? (
                          <div
                            className="relative group"
                            onMouseEnter={() => setActiveTooltip(`factura-check-${orden.idOrden}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            <Check className="w-5 h-5 text-green-500" />
                            {activeTooltip === `factura-check-${orden.idOrden}` && (
                              <div className="border border-black/10 absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white bg-opacity-80 text-black text-xs rounded py-1 px-2 whitespace-nowrap">
                                Factura adjuntada
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="relative group"
                            onMouseEnter={() => setActiveTooltip(`factura-x-${orden.idOrden}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            <X className="w-5 h-5 text-red-500" />
                            {activeTooltip === `factura-x-${orden.idOrden}` && (
                              <div className="border border-black/10 absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white bg-opacity-80 text-black text-xs rounded py-1 px-2 whitespace-nowrap">
                                Pendiente de factura
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium inline-block
                          ${orden.Estado === 'En proceso' ? 'bg-yellow-200 text-yellow-800' :
                            orden.Estado === 'Anulada' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'}`}
                      >
                        {orden.Estado || "En proceso"}
                      </span>
                    </td>

                    {/* Editar */}
                    <td className="py-3 px-3 text-center w-12">
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(orden);
                          }}
                          className="text-gray-500 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-gray-500">
                    No se encontraron órdenes{" "}
                    {searchTerm || filterDepartamento || filterProveedor || filterInventariable || filterMes || filterAño
                      ? "con los criterios de búsqueda actuales"
                      : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between mt-4">
        <div className="flex gap-4">
          {canEdit && <Button onClick={handleOpenAddModal}>Nueva Orden</Button>}

          {/* NUEVO: Botón de exportar */}
          <Button
            onClick={handleExportClick}
            disabled={filteredOrdenes.length === 0}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Exportar a Excel</span>
            </div>
          </Button>
        </div>

        {canEdit && (
          <Button
            onClick={handleEliminarOrdenes}
            disabled={selectedOrdenes.length === 0 || isLoading}
          >
            {isLoading
              ? "Procesando..."
              : `Eliminar ${selectedOrdenes.length > 0 ? `(${selectedOrdenes.length})` : ""}`}
          </Button>
        )}
      </div>

      {/* Modal para añadir/editar orden */}
      <OrdenModal
        showModal={showModal}
        modalMode={modalMode}
        formularioOrden={formularioOrden}
        setFormularioOrden={setFormularioOrden}
        departamentos={departamentos}
        proveedores={proveedores}
        estadosOrden={estadosOrden}
        onClose={handleCloseModal}
        onSave={handleGuardarOrden}
        isLoading={isLoading}
        formError={formError}
        userRole={userRole}
        fechaLimiteFormatted={fechaLimiteFormatted}
      />

      {/* NUEVO: Modal para previsualizar y exportar Excel */}
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
                <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded px-3 py-2">.csv</span>
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
                        <td colSpan="10" className="py-4 text-center text-gray-500">
                          No hay datos para exportar
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Se exportarán {exportData.length} órdenes {selectedOrdenes.length > 0 ? 'seleccionadas' : 'filtradas'}.
              </p>
            </div>

            {/* Información sobre qué se exportará */}
            <div className="mb-6 bg-blue-50 p-4 rounded-md text-blue-700 text-sm">
              <p className="font-medium mb-1">Información sobre la exportación:</p>
              <ul className="list-disc list-inside">
                <li>Se exportarán {exportData.length} órdenes en formato Excel (.csv)</li>
                <li>
                  {selectedOrdenes.length > 0
                    ? `Has seleccionado ${selectedOrdenes.length} órdenes para exportar`
                    : 'Se exportarán todas las órdenes visibles según los filtros aplicados'}
                </li>
                <li>El archivo incluirá todos los campos mostrados en la vista previa</li>
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
                    Descargar CSV
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