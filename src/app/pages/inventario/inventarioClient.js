// src/app/pages/inventario/inventarioClient.js
"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Edit, Trash2, X, FileText } from "lucide-react"
import Button from "@/app/components/ui/button"
import useNotifications from "@/app/hooks/useNotifications"
// IMPORTANTE: Solo importar el modal reutilizable
import ExportModal from "@/app/components/modals/ExportModal"

export default function InventarioClient({
  initialInventarios,
  initialDepartamentos,
  initialProveedores,
}) {
  // Estados principales
  const [uniqueInventarios, setUniqueInventarios] = useState(initialInventarios || [])
  const [departamentos, setDepartamentos] = useState(initialDepartamentos || [])
  const [proveedores, setProveedores] = useState(initialProveedores || [])
  const [userRole, setUserRole] = useState("")

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState("add")
  const [formError, setFormError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItems, setSelectedItems] = useState([])

  // Estados de filtros
  const [filterDepartamento, setFilterDepartamento] = useState("")
  const [filterProveedor, setFilterProveedor] = useState("")
  const [filterInventariable, setFilterInventariable] = useState("")

  // Estados para exportación
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportData, setExportData] = useState([])

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  // Hook de notificaciones
  const { addNotification, notificationComponents } = useNotifications()

  // Estado del formulario
  const [formularioItem, setFormularioItem] = useState({
    idOrden: null,
    descripcion: "",
    proveedor: "",
    departamento: "",
    cantidad: "",
    inventariable: "",
  })

  // Efecto para obtener el rol del usuario y configurar filtros iniciales
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/getSessionUser')
        if (response.ok) {
          const data = await response.json()
          const role = data.usuario?.rol || ''
          setUserRole(role)
          
          // Si es Jefe de Departamento, establecer el filtro automáticamente
          if (role === 'Jefe de Departamento' && data.usuario?.departamento) {
            setFilterDepartamento(data.usuario.departamento)
          }
        }
      } catch (error) {
        console.error('Error obteniendo rol del usuario:', error)
      }
    }
    
    fetchUserRole()
  }, [])

  // Función para formatear inventariable
  const formatInventariable = (inventariable) => {
    return inventariable === 1 ? "Sí" : "No"
  }

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES")
  }

  // Inventarios filtrados
  const filteredInventarios = useMemo(() => {
    return uniqueInventarios.filter(item => {
      // Filtro por término de búsqueda
      const matchesSearch = searchTerm === "" || 
        item.Descripcion?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro por departamento
      const matchesDepartamento = filterDepartamento === "" || 
        item.Departamento === filterDepartamento

      // Filtro por proveedor
      const matchesProveedor = filterProveedor === "" || 
        item.Proveedor === filterProveedor

      // Filtro por inventariable
      const matchesInventariable = filterInventariable === "" || 
        (filterInventariable === "inventariable" && item.Inventariable === 1) ||
        (filterInventariable === "no-inventariable" && item.Inventariable === 0)

      return matchesSearch && matchesDepartamento && matchesProveedor && matchesInventariable
    })
  }, [uniqueInventarios, searchTerm, filterDepartamento, filterProveedor, filterInventariable])

  // Proveedores filtrados por departamento
  const proveedoresFiltrados = useMemo(() => {
    if (!filterDepartamento) return proveedores
    
    return proveedores.filter(proveedor => {
      return uniqueInventarios.some(item => 
        item.Proveedor === proveedor.Nombre && item.Departamento === filterDepartamento
      )
    })
  }, [filterDepartamento, proveedores, uniqueInventarios])

  // Reset proveedor cuando cambia departamento
  useMemo(() => {
    setFilterProveedor("")
  }, [filterDepartamento])

  // Preparar datos para exportación
  const prepareExportData = () => {
    // Si hay items seleccionados, usar esos; si no, usar todos los filtrados
    const itemsToExport = selectedItems.length > 0
      ? uniqueInventarios.filter(item => selectedItems.includes(item.idOrden))
      : filteredInventarios
    
    // Crear la estructura de datos para Excel
    const data = itemsToExport.map(item => ({
      'ID Orden': item.idOrden || '',
      'Descripción': item.Descripcion || '',
      'Proveedor': item.Proveedor || '',
      'Departamento': item.Departamento || '',
      'Cantidad': item.Cantidad || 0,
      'Inventariable': formatInventariable(item.Inventariable),
      'Fecha': formatDate(item.Fecha) || '',
      'Importe': item.Importe || 0
    }))
    
    return data
  }

  // Manejar apertura del modal de exportación
  const handleExportClick = () => {
    // Preparar datos para exportación
    const data = prepareExportData()
    
    if (data.length === 0) {
      addNotification("No hay datos para exportar", "warning")
      return
    }
    
    setExportData(data)
    setShowExportModal(true)
  }

  // Función auxiliar para obtener el departamento correcto para exportar
  const getDepartamentoParaExportar = () => {
    return filterDepartamento || ''
  }

  // Manejar cambios en los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormularioItem(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejar selección de items
  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  // Seleccionar/deseleccionar todos los items
  const handleSelectAll = () => {
    if (selectedItems.length === filteredInventarios.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredInventarios.map(item => item.idOrden))
    }
  }

  // Abrir modal para añadir
  const handleOpenAddModal = () => {
    setModalMode("add")
    setFormularioItem({
      idOrden: null,
      descripcion: "",
      proveedor: "",
      departamento: "",
      cantidad: "",
      inventariable: "",
    })
    setFormError("")
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleOpenEditModal = (item) => {
    setModalMode("edit")
    setFormularioItem({
      idOrden: item.idOrden,
      descripcion: item.Descripcion || "",
      proveedor: item.Proveedor || "",
      departamento: item.Departamento || "",
      cantidad: item.Cantidad || "",
      inventariable: item.Inventariable === 1 ? "inventariable" : "no-inventariable",
    })
    setFormError("")
    setShowModal(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false)
    setFormError("")
  }

  // Guardar item (añadir o editar)
  const handleGuardarItem = async () => {
    // Validaciones básicas
    if (!formularioItem.descripcion.trim()) {
      setFormError("La descripción es obligatoria")
      return
    }

    if (!formularioItem.cantidad || isNaN(formularioItem.cantidad) || formularioItem.cantidad <= 0) {
      setFormError("La cantidad debe ser un número mayor que 0")
      return
    }

    try {
      setIsLoading(true)
      setFormError("")

      const itemData = {
        descripcion: formularioItem.descripcion.trim(),
        proveedor: formularioItem.proveedor,
        departamento: formularioItem.departamento,
        cantidad: parseFloat(formularioItem.cantidad),
        inventariable: formularioItem.inventariable === "inventariable" ? 1 : 0,
      }

      // Aquí harías las llamadas a la API para añadir o actualizar
      // Por simplicidad, lo dejo comentado pero puedes añadir estas funciones
      /*
      if (modalMode === "add") {
        const nuevoItem = await addInventario(itemData)
        setUniqueInventarios(prev => [...prev, nuevoItem])
        addNotification("Item añadido correctamente", "success")
      } else {
        const itemActualizado = await updateInventario(formularioItem.idOrden, itemData)
        setUniqueInventarios(prev => 
          prev.map(item => 
            item.idOrden === formularioItem.idOrden ? itemActualizado : item
          )
        )
        addNotification("Item actualizado correctamente", "success")
      }
      */

      // Simulación para testing
      addNotification(`Item ${modalMode === "add" ? "añadido" : "actualizado"} correctamente`, "success")
      handleCloseModal()
    } catch (error) {
      console.error("Error al guardar item:", error)
      setFormError("Error al guardar el item. Por favor, inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // Eliminar item
  const handleEliminarItem = async (itemId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirmar eliminación",
      message: "¿Estás seguro de que quieres eliminar este item?",
      onConfirm: async () => {
        try {
          setIsLoading(true)
          // Aquí harías la llamada a la API
          // await eliminarInventario(itemId)
          
          // Simulación para testing
          setUniqueInventarios(prev => prev.filter(item => item.idOrden !== itemId))
          setSelectedItems(prev => prev.filter(id => id !== itemId))
          addNotification("Item eliminado correctamente", "success")
        } catch (error) {
          console.error("Error al eliminar item:", error)
          addNotification("Error al eliminar el item", "error")
        } finally {
          setIsLoading(false)
        }
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })
      }
    })
  }

  return (
    <div className="p-6">
      {notificationComponents}

      {/* Título */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <Button onClick={handleOpenAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir Item
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border border-gray-300 rounded px-3 py-2 w-full"
            />
          </div>

          {/* Filtro por departamento */}
          <select
            value={filterDepartamento}
            onChange={(e) => setFilterDepartamento(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
            disabled={userRole === 'Jefe de Departamento'}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((dept, index) => (
              <option key={`${dept.Nombre}-${index}`} value={dept.Nombre}>
                {dept.Nombre}
              </option>
            ))}
          </select>

          {/* Filtro por proveedor */}
          <select
            value={filterProveedor}
            onChange={(e) => setFilterProveedor(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresFiltrados.map((prov, index) => (
              <option key={`${prov.Nombre}-${index}`} value={prov.Nombre}>
                {prov.Nombre}
              </option>
            ))}
          </select>

          {/* Filtro por inventariable */}
          <select
            value={filterInventariable}
            onChange={(e) => setFilterInventariable(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="inventariable">Inventariable</option>
            <option value="no-inventariable">No inventariable</option>
          </select>
        </div>
      </div>

      {/* Tabla de inventario */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredInventarios.length && filteredInventarios.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Orden
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventariable
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importe
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventarios.length > 0 ? (
                filteredInventarios.map((item) => (
                  <tr key={item.idOrden} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.idOrden)}
                        onChange={() => handleItemSelect(item.idOrden)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {item.idOrden}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {item.Descripcion}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {item.Proveedor}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {item.Departamento}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {item.Cantidad}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.Inventariable === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {formatInventariable(item.Inventariable)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {formatDate(item.Fecha)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      €{item.Importe || 0}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminarItem(item.idOrden)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-gray-500">
                    No se encontraron items de inventario
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

      {/* Botones de acción */}
      <div className="flex justify-between mt-4">
        <Button
          onClick={handleExportClick}
          disabled={isLoading || filteredInventarios.length === 0}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Exportar</span>
          </div>
        </Button>
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
                <label className="block text-gray-700 mb-1">Inventariable</label>
                <div className="relative">
                  <select
                    name="inventariable"
                    value={formularioItem.inventariable}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded px-3 py-2 w-full appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="inventariable">Inventariable</option>
                    <option value="no-inventariable">No inventariable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  name="proveedor"
                  value={formularioItem.proveedor}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="Proveedor"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Departamento</label>
                <input
                  type="text"
                  name="departamento"
                  value={formularioItem.departamento}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  placeholder="Departamento"
                />
              </div>
            </div>

            {/* Botones del modal */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <Button
                onClick={handleGuardarItem}
                disabled={isLoading}
              >
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exportación usando el componente reutilizable */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportData={exportData}
        selectedCount={selectedItems.length}
        onNotification={addNotification}
        departamentoSeleccionado={getDepartamentoParaExportar()}
        moduleName="inventario"
        filePrefix="inventario"
      />

      {/* Diálogo de confirmación */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)"
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}