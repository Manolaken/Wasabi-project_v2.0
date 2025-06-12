"use client"
// MODAL PARA AÑADIR O EDITAR ORDENES DE COMPRA

import { useState, useEffect, useRef } from "react"
import { ChevronDown, X } from "lucide-react";
import Button from "@/app/components/ui/button"

export default function OrdenModal({
  showModal,
  modalMode,
  formularioOrden,
  setFormularioOrden,
  departamentos,
  proveedores,
  estadosOrden,
  onClose,
  onSave,
  isLoading,
  formError,
  userRole,
  fechaLimiteFormatted
}) {
  const [descripcionLocal, setDescripcionLocal] = useState("");
  const [numeroFacturaLocal, setNumeroFacturaLocal] = useState("");
  const timeoutRef = useRef(null);
  const facturaTimeoutRef = useRef(null);

  // Calcular fecha límite dentro del modal
  const getFechaLimite = () => {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setFullYear(hoy.getFullYear() - 5);
    return fechaLimite;
  };
  const fechaLimite = getFechaLimite();

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (facturaTimeoutRef.current) {
        clearTimeout(facturaTimeoutRef.current);
      }
    };
  }, []);

  // Sincronizar estados locales con formulario
  useEffect(() => {
    setDescripcionLocal(formularioOrden.descripcion || "");
    setNumeroFacturaLocal(formularioOrden.numeroFactura || "");
  }, [formularioOrden.descripcion, formularioOrden.numeroFactura]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Manejo especial para descripción con debounce
    if (name === 'descripcion') {
      setDescripcionLocal(value);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setFormularioOrden(prev => ({
          ...prev,
          descripcion: value,
        }));
      }, 300);
      
      return;
    }

    // Manejo especial para número de factura con debounce
    if (name === 'numeroFactura') {
      setNumeroFacturaLocal(value);
      
      if (facturaTimeoutRef.current) {
        clearTimeout(facturaTimeoutRef.current);
      }
      
      facturaTimeoutRef.current = setTimeout(() => {
        setFormularioOrden(prev => ({
          ...prev,
          numeroFactura: value,
        }));
      }, 300);
      
      return;
    }

    // Para inputs de checkbox
    if (type === 'checkbox') {
      setFormularioOrden(prev => ({
        ...prev,
        [name]: Boolean(checked),
      }));
      return;
    }

    // Validaciones optimizadas
    if (name === 'fecha') {
      const fechaSeleccionada = new Date(value);
      if (fechaSeleccionada < fechaLimite) return;
    }

    if (name === 'importe') { 
      // Validación más simple y rápida
      if (value !== '' && !/^([1-9]\d{0,5}(\.\d{0,2})?|0\.[1-9]\d?|0\.0[1-9])$/.test(value)) return;
      if (value !== '' && parseFloat(value) > 100000) return;
    }

    if (name === 'cantidad') {
      // Validación más simple y rápida
      if (value !== '' && !/^[1-9]\d{0,4}$/.test(value)) return;
      if (value !== '' && parseInt(value) > 10000) return;
    }

    // Actualizar estado
    setFormularioOrden(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!showModal) return null; // Si no se debe mostrar el modal, no renderizar nada

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {modalMode === "add" ? "Añadir Nueva Orden" : "Editar Orden"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600">
            <X className="w-6 h-6 cursor-pointer" />
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
          {/* Departamento */}
          <div>
            <label className="block text-gray-700 mb-1">Departamento *</label>
            <div className="relative">
              <select
                name="departamento"
                value={formularioOrden.departamento}
                onChange={handleInputChange}
                className="appearance-none border border-gray-300 rounded px-3 py-2 w-full pr-8 text-gray-500"
                required
                disabled={userRole === "Jefe de Departamento"}
              >
                <option value="">Seleccionar departamento</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id_Departamento} value={departamento.Nombre}>
                    {departamento.Nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-gray-700 mb-1">Proveedor *</label>
            <div className="relative">
              <select
                name="proveedor"
                value={formularioOrden.proveedor}
                onChange={handleInputChange}
                className="appearance-none border border-gray-300 rounded px-3 py-2 w-full pr-8 text-gray-500"
                required
              >
                <option value="">Seleccionar proveedor</option>
                {Array.isArray(proveedores) && proveedores.map((proveedor, index) => (
                  <option key={`prov-${proveedor.idProveedor}-${index}`} value={proveedor.Nombre}>
                    {proveedor.Nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Importe */}
          <div>
            <label className="block text-gray-700 mb-1">Importe (€) *</label>
            <input
              type="text"
              name="importe"
              value={formularioOrden.importe}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder=""
              required
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-gray-700 mb-1">Fecha *</label>
            <input
              type="date"
              name="fecha"
              value={formularioOrden.fecha}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-3 py-2 w-full text-gray-500"
              min={fechaLimiteFormatted}
              required
            />
          </div>

          {/* Descripción - CON DEBOUNCE Y CONTADOR OPTIMIZADO */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 mb-1">Descripción *</label>
            <input
              type="text"
              name="descripcion"
              value={descripcionLocal}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="Descripción del artículo o servicio"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {descripcionLocal ? 
                `${descripcionLocal.length}/100 caracteres` : 
                "0/100 caracteres"}
            </p>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-gray-700 mb-1">Cantidad *</label>
            <input
              type="text"
              name="cantidad"
              value={formularioOrden.cantidad}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              required
            />
          </div>

          {/* Inventariable */}
          <div className="flex flex-col">
            <label className="block text-gray-700 mb-1">Tipo *</label>
            <div className="flex items-center space-x-6 py-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="inventariable"
                  checked={formularioOrden.inventariable}
                  onChange={handleInputChange}
                  className="form-checkbox h-5 w-5 text-red-600 cursor-pointer"
                />
                <span className="ml-2">Inventariable</span>
              </label>
              <span className="text-gray-500">
                {!formularioOrden.inventariable && "Fungible"}
              </span>
            </div>
          </div>

          {/* Número Orden */}
          <div>
            <label className="block text-gray-700 mb-1">Número Orden</label>
            <input
              type="text"
              name="numero"
              value={formularioOrden.numero}
              className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
              disabled
            />
          </div>

          {/* Inversión */}
          <div className="flex flex-col">
            <label className="block text-gray-700 mb-1">Inversión</label>
            <div className="flex items-center space-x-4 py-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="esInversion"
                  checked={formularioOrden.esInversion}
                  onChange={handleInputChange}
                  className="form-checkbox h-5 w-5 text-red-600 cursor-pointer"
                />
                <span className="ml-2">Es inversión</span>
              </label>
            </div>
          </div>

          {/* Número Inversión */}
          {formularioOrden.esInversion && (
            <div>
              <label className="block text-gray-700 mb-1">Número Inversión *</label>
              <input
                type="text"
                name="numInversion"
                value={formularioOrden.numInversion}
                className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-100"
                disabled
              />
            </div>
          )}

          {/* Factura - ACTUALIZADO PARA v2.0 */}
          <div className="flex flex-col">
            <label className="block text-gray-700 mb-1">Factura</label>
            <div className="flex items-center space-x-4 py-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="tieneFactura"
                  checked={formularioOrden.tieneFactura}
                  onChange={handleInputChange}
                  className="form-checkbox h-5 w-5 text-red-600 cursor-pointer"
                />
                <span className="ml-2">
                  {formularioOrden.tieneFactura ? "Factura adjuntada" : "¿Tiene Factura?"}
                </span>
              </label>
            </div>
          </div>

          {/* Número de Factura - NUEVO CAMPO PARA v2.0 */}
          {formularioOrden.tieneFactura && (
            <div>
              <label className="block text-gray-700 mb-1">Número de Factura</label>
              <input
                type="text"
                name="numeroFactura"
                value={numeroFacturaLocal}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="Ej: FAC-001-2025"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {numeroFacturaLocal ? 
                  `${numeroFacturaLocal.length}/50 caracteres` : 
                  "0/50 caracteres"}
              </p>
            </div>
          )}

          {/* Estado */}
          <div>
            <label className="block text-gray-700 mb-1">Estado</label>
            <div className="relative">
              <select
                name="estadoOrden"
                value={formularioOrden.estadoOrden}
                onChange={handleInputChange}
                className="appearance-none border border-gray-300 rounded px-3 py-2 w-full pr-8 text-gray-500"
              >
                {estadosOrden.map(estado => (
                  <option key={estado.id_EstadoOrden} value={estado.tipo}>
                    {estado.tipo}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}