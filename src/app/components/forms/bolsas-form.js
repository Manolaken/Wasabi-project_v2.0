"use client"

import { useState, useEffect } from "react"
import { ChevronDown, X, Calendar, Save, Plus } from "lucide-react"
import useNotifications from "@/app/hooks/useNotifications"

/**
 * Componente de formulario para crear/editar bolsas presupuestarias
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.departamentos - Lista de departamentos disponibles
 * @param {Function} props.refreshData - Función para recargar datos después de enviar el formulario
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object} props.initialData - Datos iniciales para edición (opcional)
 * @param {boolean} props.isEditing - Indica si estamos editando una bolsa existente
 */
export default function BolsasForm({
  departamentos = [],
  refreshData,
  onClose,
  initialData = null,
  isEditing = false
}) {
  // Estado para el formulario
  const [formData, setFormData] = useState({
    departamento: '',
    año: new Date().getFullYear() + 1, // Por defecto, próximo año
    cantidadPresupuesto: '',
    cantidadInversion: ''
  });
  
  // Estado para errores y carga
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook de notificaciones
  const { addNotification } = useNotifications();
  
  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        departamento: initialData.departamentoId || '',
        año: initialData.año || new Date().getFullYear() + 1,
        cantidadPresupuesto: initialData.cantidadPresupuesto || '',
        cantidadInversion: initialData.cantidadInversion || ''
      });
    }
  }, [isEditing, initialData]);
  
  // Manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cantidadPresupuesto' || name === 'mcantidadInversion') {
      // Validar que sea un número válido
      const numValue = value.replace(/,/g, '.');
      if (value === '' || /^\d*\.?\d*$/.test(numValue)) {
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  /**
   * Función handleSubmit para el formulario de creación/edición de bolsas presupuestarias
   * Incluye validación para evitar modificar bolsas con órdenes asociadas
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar datos del formulario
    if (!formData.departamento) {
      setError('Debe seleccionar un departamento');
      return;
    }
    
    if (!formData.año) {
      setError('Debe ingresar un año');
      return;
    }
    
    // Validar que al menos uno de los montos sea mayor que 0
    const cantidadPresupuesto = parseFloat(formData.mcantidadPresupuesto) || 0;
    const cantidadInversion = parseFloat(formData.cantidadInversion) || 0;
    
    if (cantidadPresupuesto <= 0 && cantidadInversion <= 0) {
      setError('Debe ingresar un cantidad válido para presupuesto y/o inversión');
      return;
    }
    
    // Limpiar error anterior y mostrar estado de carga
    setError('');
    setIsSubmitting(true);
    
    try {
      // Preparar los datos para enviar
      const data = {
        departamentoId: Number(formData.departamento),
        año: Number(formData.año),
        cantidadPresupuesto: cantidadPresupuesto,
        cantidadInversion: cantidadInversion,
        esActualizacion: isEditing // Indicar si es actualización o creación nueva
      };
      
      console.log('Enviando datos:', data);
      
      // Realizar la petición al servidor
      const response = await fetch('/api/createBolsas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Manejar el caso específico de bolsas con órdenes asociadas
        if (response.status === 403 && result.tieneOrdenes) {
          const totalOrdenes = 
            (result.totalOrdenes?.presupuesto || 0) + 
            (result.totalOrdenes?.inversion || 0);
          
          setError(
            `No se pueden modificar bolsas que ya tienen ${totalOrdenes} orden(es) asociada(s). ` +
            `Si desea modificar los cantidad, primero debe eliminar todas las órdenes vinculadas a estas bolsas.`
          );
          return;
        }
        
        // Otros errores
        throw new Error(result.error || 'Error al procesar las bolsas');
      }
      
      // Éxito - Mostrar notificación
      addNotification(
        isEditing 
          ? 'Bolsas actualizadas correctamente' 
          : 'Bolsas creadas correctamente',
        'success'
      );
      
      // Limpiar formulario
      setFormData({
        departamento: formData.departamento, // Mantener el departamento seleccionado
        año: '',
        cantidadPresupuesto: '',
        cantidadInversion: ''
      });
      
      // Recargar los datos de la tabla/lista
      if (refreshData && typeof refreshData === 'function') {
        refreshData();
      }
      
      // Cerrar modal si es necesario
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
      
    } catch (err) {
      console.error('Error procesando bolsas:', err);
      setError(err.message || 'Ocurrió un error al procesar las bolsas');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generar años para el selector (5 años atrás y 5 años adelante)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    return years;
  };
  
  // Formatear montos para mostrar
  const formatAmount = (value) => {
    if (!value) return '';
    return parseFloat(value).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  return (
    <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          {isEditing ? 'Editar Bolsas Presupuestarias' : 'Crear Nuevas Bolsas'}
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-red-600 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Selector de departamento */}
          <div>
            <label className="block text-gray-700 mb-2">
              Departamento <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="departamento"
                value={formData.departamento}
                onChange={handleInputChange}
                className="appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-red-500"
                disabled={isEditing} // Deshabilitar en modo edición
              >
                <option value="">Seleccionar departamento</option>
                {departamentos.map(dep => (
                  <option key={dep.id_Departamento} value={dep.id_Departamento}>
                    {dep.Nombre}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          {/* Selector de año */}
          <div>
            <label className="block text-gray-700 mb-2">
              Año <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="año"
                value={formData.año}
                onChange={handleInputChange}
                className="appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-red-500"
                disabled={isEditing} // Deshabilitar en modo edición
              >
                <option value="">Seleccionar año</option>
                {getYearOptions().map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
          
          {/* Campo para monto de presupuesto */}
          <div>
            <label className="block text-gray-700 mb-2">
              Presupuesto (€)
            </label>
            <input
              type="text"
              name="cantidadPresupuesto"
              value={formData.cantidadPresupuesto}
              onChange={handleInputChange}
              placeholder="0.00"
              className="border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-red-500"
            />
          </div>
          
          {/* Campo para monto de inversión */}
          <div>
            <label className="block text-gray-700 mb-2">
              Inversión (€)
            </label>
            <input
              type="text"
              name="montoInversion"
              value={formData.cantidadInversion}
              onChange={handleInputChange}
              placeholder="0.00"
              className="border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
        
        {/* Resumen de los datos */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Resumen:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Presupuesto Anual:</span>
            </div>
            <div className="text-right font-medium">
              {formData.cantidadPresupuesto ? `${formatAmount(formData.cantidadPresupuesto)}€` : '0,00€'}
            </div>
            
            <div>
              <span className="text-gray-500">Inversión Anual:</span>
            </div>
            <div className="text-right font-medium">
              {formData.cantidadInversion ? `${formatAmount(formData.cantidadInversion)}€` : '0,00€'}
            </div>
            
            <div>
              <span className="text-gray-500">Presupuesto Mensual:</span>
            </div>
            <div className="text-right font-medium">
              {formData.cantidadPresupuesto 
                ? `${formatAmount(parseFloat(formData.cantidadPresupuesto) / 12)}€` 
                : '0,00€'}
            </div>
            
            <div>
              <span className="text-gray-500">Inversión Mensual:</span>
            </div>
            <div className="text-right font-medium">
              {formData.cantidadInversion 
                ? `${formatAmount(parseFloat(formData.cantidadInversion) / 12)}€` 
                : '0,00€'}
            </div>
          </div>
        </div>
        
        {/* Aviso sobre actualización */}
        {isEditing && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-sm text-yellow-800">
            <p className="font-medium">⚠️ Aviso sobre actualización:</p>
            <p>No se podrán actualizar bolsas que ya tengan órdenes asociadas. Si necesita modificar 
            estas bolsas, primero deberá eliminar todas las órdenes vinculadas.</p>
          </div>
        )}
        
        {/* Botones del formulario */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-red-600 opacity-80 text-white px-6 py-2 rounded-md hover:bg-red-700 cursor-pointer disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">Procesando...</span>
              </>
            ) : (
              <>
                {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isEditing ? 'Actualizar bolsas' : 'Crear bolsas'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}