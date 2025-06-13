// Archivo: src/app/pages/inventario/inventarioClient.js
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FileText, 
  Plus, 
  X, 
  ChevronDown, 
  Search,
  RotateCcw
} from "lucide-react";
import Button from "../../components/ui/button";
import useNotifications from "../../hooks/useNotifications";

export default function InventarioClient({
  initialInventarios = [],
  initialDepartamentos = [], 
  initialProveedores = []
}) {
  // Estados principales - usar datos iniciales directamente
  const [uniqueInventarios, setUniqueInventarios] = useState(initialInventarios);
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [departamentos, setDepartamentos] = useState(initialDepartamentos);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userDepartamento, setUserDepartamento] = useState("");
  const [isDepartamentoLoading, setIsDepartamentoLoading] = useState(true);

  // Estados de interfaz
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedItems, setSelectedItems] = useState([]);
  const [formError, setFormError] = useState("");

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [filterInventariable, setFilterInventariable] = useState("");

  // NUEVO: Estados para exportación
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState([]);
  const sheetJSRef = useRef(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [excelFileName, setExcelFileName] = useState("inventario");
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Hook de notificaciones
  const { addNotification, notificationComponents } = useNotifications();

  // Estado del formulario
  const [formularioItem, setFormularioItem] = useState({
    idOrden: null,
    descripcion: "",
    proveedor: "",
    departamento: "",
    cantidad: "",
    inventariable: "",
  });

  // Efecto para obtener el rol del usuario y configurar filtros iniciales
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/getSessionUser')
        if (response.ok) {
          const data = await response.json()
          const role = data.usuario?.rol || ''
          const departamento = data.usuario?.departamento || ''
          
          setUserRole(role)
          setUserDepartamento(departamento)
          
          // Si es Jefe de Departamento, establecer el filtro automáticamente
          if (role === "Jefe de Departamento" && departamento) {
            setFilterDepartamento(departamento)
          }
        }
      } catch (error) {
        console.error('Error al obtener el rol del usuario:', error)
      } finally {
        setIsDepartamentoLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  // Resto de efectos y funciones (no necesitamos fetch ya que usamos datos iniciales)
  useEffect(() => {
    // Solo necesitamos obtener el rol del usuario, los datos ya están disponibles
    // No hacemos fetch de inventarios, proveedores ni departamentos
  }, []);

  // No necesitamos las funciones de fetch ya que usamos datos iniciales
  // Si necesitamos refrescar datos, podemos implementar estas funciones más tarde

  // Inventarios filtrados
  const filteredInventarios = useMemo(() => {
    return uniqueInventarios.filter((item) => {
      // Filtro por término de búsqueda
      const matchesSearch = item.Descripcion?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por departamento
      const matchesDepartamento = filterDepartamento === "" || 
        item.Departamento === filterDepartamento;

      // Filtro por proveedor
      const matchesProveedor = filterProveedor === "" || 
        item.Proveedor === filterProveedor;

      // Filtro por inventariable
      const matchesInventariable = filterInventariable === "" || 
        (filterInventariable === "inventariable" && item.Inventariable === 1) ||
        (filterInventariable === "no-inventariable" && item.Inventariable === 0);

      return matchesSearch && matchesDepartamento && matchesProveedor && matchesInventariable;
    });
  }, [uniqueInventarios, searchTerm, filterDepartamento, filterProveedor, filterInventariable]);

  // Proveedores filtrados por departamento
  const proveedoresFiltrados = useMemo(() => {
    if (!filterDepartamento) return proveedores;
    
    return proveedores.filter(proveedor => {
      return uniqueInventarios.some(item => 
        item.Proveedor === proveedor.Nombre && item.Departamento === filterDepartamento
      );
    });
  }, [filterDepartamento, proveedores, uniqueInventarios]);

  // Reset proveedor cuando cambia departamento
  useMemo(() => {
    setFilterProveedor("");
  }, [filterDepartamento]);

  // Preparar datos para exportación
  const prepareExportData = () => {
    const itemsToExport = selectedItems.length > 0
      ? uniqueInventarios.filter(item => selectedItems.includes(item.idOrden))
      : filteredInventarios;
    
    const data = itemsToExport.map(item => ({
      'ID Orden': item.idOrden || '',
      'Descripción': item.Descripcion || '',
      'Proveedor': item.Proveedor || '',
      'Departamento': item.Departamento || '',
      'Cantidad': item.Cantidad || 0,
      'Inventariable': formatInventariable(item.Inventariable),
      'Fecha': formatDate(item.Fecha) || '',
      'Importe': item.Importe || 0
    }));
    
    return data;
  };

  // Efecto para cargar SheetJS
  useEffect(() => {
    if (showExportModal && !sheetJSRef.current) {
      const loadSheetJS = async () => {
        try {
          const XLSX = await import('xlsx');
          sheetJSRef.current = XLSX;
        } catch (error) {
          console.error("Error al cargar SheetJS:", error);
          addNotification("Error al cargar las herramientas de exportación", "error");
        }
      };
      
      loadSheetJS();
    }
  }, [showExportModal, addNotification]);

  // Manejar clic en exportar
  const handleExportClick = () => {
    if (selectedItems.length === 0 && filteredInventarios.length === 0) {
      addNotification("No hay items para exportar", "warning");
      return;
    }

    if (selectedItems.length === 0) {
      const shouldExportFiltered = window.confirm(
        `No has seleccionado items específicos. ¿Deseas exportar todos los ${filteredInventarios.length} items mostrados?`
      );
      
      if (!shouldExportFiltered) {
        addNotification("Por favor, selecciona los items que deseas exportar", "info");
        return;
      }
    }

    const data = prepareExportData();
    setExportData(data);

    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const depName = filterDepartamento ? `_${filterDepartamento}` : '';
    setExcelFileName(`inventario${depName}_${currentDate}`);
    
    setShowExportModal(true);
  };

  // Función para generar Excel
  const generateExcel = async () => {
    try {
      setIsGeneratingExcel(true);
      
      if (!sheetJSRef.current) {
        throw new Error("SheetJS no está cargado");
      }

      const XLSX = sheetJSRef.current;
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
      
      const colWidths = [
        { wch: 12 }, // ID Orden
        { wch: 40 }, // Descripción
        { wch: 25 }, // Proveedor
        { wch: 20 }, // Departamento
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Inventariable
        { wch: 12 }, // Fecha
        { wch: 12 }  // Importe
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.writeFile(workbook, `${excelFileName}.xlsx`);
      
      addNotification(`Archivo ${excelFileName}.xlsx descargado exitosamente`, "success");
      setShowExportModal(false);
      
    } catch (error) {
      console.error("Error al generar Excel:", error);
      addNotification("Error al generar el archivo Excel", "error");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  // Función para descargar Excel
  const downloadExcel = () => {
    generateExcel();
  };

  // Toggle selección de item
  const toggleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  // Seleccionar/deseleccionar todos
  const toggleSelectAll = () => {
    if (selectedItems.length === filteredInventarios.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventarios.map((i) => i.idOrden));
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterProveedor("");
    setFilterInventariable("");
    
    if (userRole !== "Jefe de Departamento") {
      setFilterDepartamento("");
    }
    
    addNotification("Filtros eliminados", "info");
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormularioItem({
      ...formularioItem,
      [name]: value,
    });
  };

  // Abrir modal para añadir
  const handleOpenAddModal = () => {
    setModalMode("add");
    setFormularioItem({
      idOrden: null,
      descripcion: "",
      proveedor: "",
      departamento: userRole === "Jefe de Departamento" ? userDepartamento : "",
      cantidad: "",
      inventariable: "",
    });
    setFormError("");
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
  };

  // Función para formatear inventariable
  function formatInventariable(value) {
    if (value === 1 || value === "1" || value === true) return "Sí";
    if (value === 0 || value === "0" || value === false) return "No";
    return value || "-";
  }

  // Función para formatear fecha
  function formatDate(dateString) {
    if (!dateString) return "-";
    
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString();
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "-";
    }
  }

  // Mostrar loading si está cargando el departamento
  if (isDepartamentoLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Componentes de notificación */}
      {notificationComponents}

      {/* NUEVA CABECERA - Similar a Órdenes de Compra */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <h2 className="text-xl text-gray-400">
            Departamento {userDepartamento || filterDepartamento || "Todos"}
          </h2>
        </div>
        
        {/* BOTONES REUBICADOS - Arriba a la derecha y juntos */}
        <div className="flex gap-3">
          <Button
            variant="export"
            onClick={handleExportClick}
            disabled={isLoading || filteredInventarios.length === 0}
          >
            <FileText className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          
          <Button
            variant="add"
            onClick={handleOpenAddModal}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Item</span>
          </Button>
        </div>
      </div>

      {/* Filtros y controles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro departamento */}
        {userRole !== "Jefe de Departamento" && (
          <div className="relative">
            <select
              value={filterDepartamento}
              onChange={(e) => setFilterDepartamento(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 appearance-none"
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map(dep => (
                <option key={dep.id_Departamento || dep.id || dep._id} value={dep.Nombre}>
                  {dep.Nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        )}

        {/* Filtro proveedor */}
        <div className="relative">
          <select
            value={filterProveedor}
            onChange={(e) => setFilterProveedor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 appearance-none"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresFiltrados.map((proveedor, index) => (
              <option key={`${proveedor.idProveedor}-${index}`} value={proveedor.Nombre}>
                {proveedor.Nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        {/* Filtro inventariable */}
        <div className="relative">
          <select
            value={filterInventariable}
            onChange={(e) => setFilterInventariable(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 appearance-none"
          >
            <option value="">Todos</option>
            <option value="inventariable">Inventariable</option>
            <option value="no-inventariable">No inventariable</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        {/* Botón limpiar filtros */}
        <Button
          variant="outline"
          onClick={handleClearFilters}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Limpiar</span>
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filteredInventarios.length} de {uniqueInventarios.length} items
        {selectedItems.length > 0 && ` (${selectedItems.length} seleccionados)`}
      </div>

      {/* Tabla de inventario */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredInventarios.length && filteredInventarios.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventariable
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importe
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-4 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredInventarios.length > 0 ? (
                filteredInventarios.map((item) => (
                  <tr key={item.idOrden} className="hover:bg-gray-50">
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.idOrden)}
                        onChange={() => toggleSelectItem(item.idOrden)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.idOrden}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={item.Descripcion}>
                        {item.Descripcion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.Proveedor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.Departamento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {item.Cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.Inventariable === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {formatInventariable(item.Inventariable)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {item.Importe ? `${item.Importe.toLocaleString('es-ES')} €` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    No hay items que coincidan 
                    {searchTerm || filterDepartamento || filterProveedor || filterInventariable
                      ? " con los criterios de búsqueda actuales"
                      : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para añadir/editar item */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)"
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === "add" ? "Añadir Nuevo Item" : "Editar Item"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mensaje de error del formulario */}
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}

            {/* Formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={formularioItem.descripcion}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="Descripción"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  value={formularioItem.cantidad}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="Cantidad"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Proveedor</label>
                <select
                  name="proveedor"
                  value={formularioItem.proveedor}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="">Seleccionar proveedor</option>
                  {Array.isArray(proveedores) && proveedores.map((proveedor, index) => (
                    <option key={`prov-${proveedor.idProveedor}-${index}`} value={proveedor.Nombre}>
                      {proveedor.Nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Departamento</label>
                <select
                  name="departamento"
                  value={formularioItem.departamento}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  disabled={userRole === "Jefe de Departamento"}
                >
                  <option value="">Seleccionar departamento</option>
                  {departamentos.map((departamento) => (
                    <option key={departamento.id_Departamento} value={departamento.Nombre}>
                      {departamento.Nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Inventariable</label>
                <select
                  name="inventariable"
                  value={formularioItem.inventariable}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  <option value="">Seleccionar</option>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>

            {/* Botones del modal */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Aquí iría la lógica para guardar
                  console.log("Guardar:", formularioItem);
                  handleCloseModal();
                }}
              >
                {modalMode === "add" ? "Añadir" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
             style={{
               backgroundColor: "rgba(0, 0, 0, 0.3)",
               backdropFilter: "blur(2px)"
             }}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Exportar Inventario</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Vista previa de datos */}
            <div className="mb-6 max-h-60 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {exportData.length > 0 && Object.keys(exportData[0]).map((header) => (
                      <th key={header} className="py-2 px-4 text-left font-medium">
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
              Se exportarán {exportData.length} items {selectedItems.length > 0 ? 'seleccionados' : 'filtrados'}.
            </p>

            {/* Información sobre qué se exportará */}
            <div className="mb-6 bg-blue-50 p-4 rounded-md text-blue-700 text-sm">
              <p className="font-medium mb-1">Información sobre la exportación:</p>
              <ul className="list-disc list-inside">
                <li>Se exportarán {exportData.length} items en formato XLSX (Excel)</li>
                <li>Las columnas se ajustarán automáticamente para mejor visualización</li>
                <li>
                  {selectedItems.length > 0 
                    ? `Has seleccionado ${selectedItems.length} items para exportar` 
                    : 'Se exportarán todos los items visibles según los filtros aplicados'}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Descargar Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmación */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
             style={{
               backgroundColor: "rgba(0, 0, 0, 0.3)",
               backdropFilter: "blur(2px)"
             }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-4">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}