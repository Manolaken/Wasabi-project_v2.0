"use client"

import { useState, useEffect } from "react"
import { X, Plus, Pencil } from "lucide-react"

export default function CreateBolsaModal({
  showModal,
  onClose,
  onSubmit,
  departamento,
  departamentoId,
  existingYears = [],
  isLoading = false,
  error = "",
  añoActual
}) {
  const [formData, setFormData] = useState({
    cantidadPresupuesto: '',
    cantidadInversion: '',
    año: añoActual,
    departamentoId: departamentoId
  });

  // Actualizar formData cuando cambien las props
  useEffect(() => {
    if (showModal) {
      setFormData({
        cantidadPresupuesto: '',
        cantidadInversion: '',
        año: añoActual,
        departamentoId: departamentoId
      });
    }
  }, [showModal, añoActual, departamentoId]);

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;

    // Para inputs de checkbox
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: Boolean(checked),
      }));
      return;
    }

    // Validaciones para campos de cantidad
    if ((name === 'cantidadPresupuesto' || name === 'cantidadInversion')) {
      // Permitir solo números y punto decimal, rechazar incluso la 'e'
      if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) {
        return;
      }

      // Convertir la coma a punto para procesar correctamente
      const processedValue = value.replace(',', '.');
      // Verificar que no exceda el máximo de 200.000
      const numericValue = parseFloat(processedValue || 0);
      if (numericValue > 200000) {
        return;
      }
    }

    // Para el cambio de año, verificar si hay bolsas existentes y cargar sus cantidades
    if (name === 'año' && value) {
      const nuevoAño = parseInt(value);

      // Si el año ya tiene bolsas asignadas, cargar sus valores actuales
      if (existingYears.includes(nuevoAño)) {
        try {
          // Consultar datos de bolsas existentes para ese año
          const response = await fetch(`/api/getBolsasByYear?departamentoId=${departamentoId}&year=${nuevoAño}`);

          if (response.ok) {
            const data = await response.json();
            console.log(`Bolsas existentes para ${nuevoAño}:`, data);

            // Establecer las cantidades existentes en el formulario
            let nuevoCantidadPresupuesto = '';
            let nuevoCantidadInversion = '';

            if (data && data.bolsas) {
              // Recorrer las bolsas recibidas
              data.bolsas.forEach(bolsa => {
                if (bolsa.tipo === 'presupuesto') {
                  nuevoCantidadPresupuesto = bolsa.cantidad.toString();
                } else if (bolsa.tipo === 'inversion') {
                  nuevoCantidadInversion = bolsa.cantidad.toString();
                }
              });
            }

            // Actualizar el formulario con las cantidades existentes
            setFormData(prev => ({
              ...prev,
              año: nuevoAño,
              cantidadPresupuesto: nuevoCantidadPresupuesto,
              cantidadInversion: nuevoCantidadInversion,
              [name]: value
            }));

            return; // Retornar aquí para evitar la actualización genérica abajo
          }
        } catch (error) {
          console.error('Error al obtener cantidades existentes:', error);
        }
      }
    }

    // Actualización genérica para cualquier otro campo
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    // Resetear formulario al cerrar
    setFormData({
      cantidadPresupuesto: '',
      cantidadInversion: '',
      año: añoActual,
      departamentoId: departamentoId
    });
    onClose();
  };

  if (!showModal) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        // Cerrar el modal solo si se hace clic en el fondo, no en el contenido
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Añadir Nueva Bolsa</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="h-6 w-6 cursor-pointer" />
          </button>
        </div>

        {/* Mensaje de error del formulario */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Año con select personalizado */}
            <div>
              <label className="block text-gray-700 mb-1">Año *</label>
              <div className="relative">
                <select
                  id="año"
                  name="año"
                  value={formData.año}
                  onChange={handleInputChange}
                  className="appearance-none border border-gray-300 rounded px-3 py-2 w-full pr-8"
                  required
                >
                  {/* Generar opciones para todos los años, incluyendo los que tienen bolsas */}
                  {Array.from({ length: 6 }, (_, i) => añoActual + i).map(year => {
                    const tieneAsignacion = existingYears.includes(year);
                    return (
                      <option
                        key={year}
                        value={year}
                      >
                        {year} {tieneAsignacion ? "(tiene bolsas)" : ""}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7l3 3 3-3" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {existingYears.includes(parseInt(formData.año))
                  ? "Este año ya tiene bolsas. Al guardar, se actualizarán los valores existentes."
                  : "Selecciona el año para la nueva bolsa."}
              </p>
            </div>

            {/* Departamento (solo informativo) */}
            <div>
              <label className="block text-gray-700 mb-1">Departamento</label>
              <input
                type="text"
                value={departamento}
                className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                disabled
              />
            </div>

            {/* Cantidad Presupuesto */}
            <div>
              <label className="block text-gray-700 mb-1">Cantidad Presupuesto (€) *</label>
              <input
                id="cantidadPresupuesto"
                name="cantidadPresupuesto"
                type="text"
                inputMode="decimal"
                value={formData.cantidadPresupuesto}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="0.00"
                maxLength={9}
              />
              <p className="text-xs text-gray-500 mt-1">Dejar en blanco si no se quiere crear bolsa de presupuesto</p>
            </div>

            {/* Cantidad Inversión */}
            <div>
              <label className="block text-gray-700 mb-1">Cantidad Inversión (€) *</label>
              <input
                id="cantidadInversion"
                name="cantidadInversion"
                type="text"
                inputMode="decimal"
                value={formData.cantidadInversion}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="0.00"
                maxLength={9}
              />
              <p className="text-xs text-gray-500 mt-1">Dejar en blanco si no se quiere crear bolsa de inversión</p>
            </div>
          </div>

          {/* Botones del formulario */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 opacity-80 flex items-center gap-2 text-white px-4 py-3 rounded-md hover:bg-red-700 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {existingYears.includes(parseInt(formData.año)) ? 'Modificando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  {existingYears.includes(parseInt(formData.año)) ? (
                    // Para modificación, mostrar un icono diferente y texto "Modificar"
                    <>
                      <Pencil className="w-5 h-5" size={18} />
                      <span>Modificar</span>
                    </>
                  ) : (
                    // Para nueva bolsa, mostrar el icono de Plus y texto "Guardar"
                    <>
                      <Plus className="w-5 h-5" size={18} />
                      <span>Guardar</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}