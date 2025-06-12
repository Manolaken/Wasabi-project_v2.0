// src/app/components/modals/OrdenExportModal.js
"use client"

import { useState, useEffect } from "react"
import { X, Download } from "lucide-react"
import * as XLSX from 'xlsx'

export default function OrdenExportModal({
  isOpen,
  onClose,
  exportData,
  selectedCount,
  onNotification,
  departamentoSeleccionado // NUEVA PROP
}) {
  // DEBUG: Mostrar el departamento recibido
  console.log('📁 Modal recibió departamento:', departamentoSeleccionado);

  const [excelFileName, setExcelFileName] = useState(() => {
    const today = new Date()
    const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`
    
    let fileName = 'ordenes_compra'
    if (departamentoSeleccionado && departamentoSeleccionado.trim() !== '') {
      console.log('🏷️ Procesando departamento para nombre:', departamentoSeleccionado);
      // Limpiar el nombre del departamento para usar en archivo
      const depLimpio = departamentoSeleccionado
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con _
        .replace(/_+/g, '_') // Reemplazar múltiples _ con uno solo
        .replace(/^_|_$/g, '') // Quitar _ al inicio y final
      
      console.log('✅ Nombre limpio del departamento:', depLimpio);
      fileName = `ordenes_${depLimpio}`
    }
    
    const finalFileName = `${fileName}_${formattedDate}`;
    console.log('📄 Nombre final del archivo:', finalFileName);
    return finalFileName;
  })
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)

  // Regenerar nombre del archivo cuando cambie el departamento
  useEffect(() => {
    console.log('🔄 useEffect del modal ejecutado:', { isOpen, departamentoSeleccionado });
    
    if (isOpen) {
      const today = new Date()
      const formattedDate = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`
      
      let fileName = 'ordenes_compra'
      if (departamentoSeleccionado && departamentoSeleccionado.trim() !== '') {
        console.log('🏗️ Regenerando nombre con departamento:', departamentoSeleccionado);
        const depLimpio = departamentoSeleccionado
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
        
        fileName = `ordenes_${depLimpio}`
        console.log('✨ Nuevo nombre de archivo:', fileName);
      } else {
        console.log('ℹ️ No hay departamento, usando nombre genérico');
      }
      
      const finalFileName = `${fileName}_${formattedDate}`;
      console.log('📝 Estableciendo nombre final:', finalFileName);
      setExcelFileName(finalFileName);
    }
  }, [departamentoSeleccionado, isOpen])

  // Función para generar Excel (.xlsx)
  const generateExcel = async () => {
    try {
      setIsGeneratingExcel(true)

      // Crear un nuevo libro de trabajo
      const workbook = XLSX.utils.book_new()

      // Convertir datos a formato de hoja de cálculo
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Configurar el ancho de las columnas para mejor legibilidad
      const columnWidths = [
        { wch: 15 }, // Número Orden
        { wch: 30 }, // Descripción
        { wch: 12 }, // Fecha
        { wch: 12 }, // Importe (€)
        { wch: 12 }, // Inventariable
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Departamento
        { wch: 20 }, // Proveedor
        { wch: 15 }, // Número Inversión
        { wch: 10 }, // Factura
        { wch: 12 }  // Estado
      ]

      worksheet['!cols'] = columnWidths

      // Agregar la hoja al libro de trabajo
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes de Compra')

      // Generar el archivo Excel como array buffer
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        compression: true
      })

      // Convertir a Blob para descarga
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })

      // Crear URL para previsualización
      const url = URL.createObjectURL(blob)

      // Configurar opciones para descarga
      return {
        url,
        blob,
        filename: `${excelFileName}.xlsx`
      }

    } catch (error) {
      console.error("Error generando archivo Excel:", error)
      onNotification("Error al generar el archivo Excel", "error")
      return null
    } finally {
      setIsGeneratingExcel(false)
    }
  }

  // Función para descargar el Excel generado
  const downloadExcel = async () => {
    const excelData = await generateExcel()

    if (!excelData) return

    // Crear enlace para descarga y hacer clic
    const downloadLink = document.createElement('a')
    downloadLink.href = excelData.url
    downloadLink.download = excelData.filename
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)

    // Liberar URL
    URL.revokeObjectURL(excelData.url)

    // Cerrar modal
    onClose()

    onNotification("Archivo Excel descargado correctamente", "success")
  }

  if (!isOpen) return null

  return (
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
            onClick={onClose}
            className="text-gray-500 hover:text-red-600"
            disabled={isGeneratingExcel}
          >
            <X className="w-6 h-6 cursor-pointer" />
          </button>
        </div>

        {/* Nombre del archivo */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-1">Nombre del archivo</label>
          {departamentoSeleccionado && (
            <p className="text-xs text-blue-600 mb-2">
              📁 Exportando órdenes del departamento: <strong>{departamentoSeleccionado}</strong>
            </p>
          )}
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
          <p className="text-xs text-gray-500 mt-1">
            El nombre incluye la fecha actual y el departamento seleccionado
          </p>
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
            Se exportarán {exportData.length} órdenes {selectedCount > 0 ? 'seleccionadas' : 'filtradas'}.
          </p>
        </div>

        {/* Información sobre qué se exportará */}
        <div className="mb-6 bg-blue-50 p-4 rounded-md text-blue-700 text-sm">
          <p className="font-medium mb-1">Información sobre la exportación:</p>
          <ul className="list-disc list-inside">
            <li>Se exportarán {exportData.length} órdenes en formato Excel (.xlsx)</li>
            <li>
              {selectedCount > 0
                ? `Has seleccionado ${selectedCount} órdenes para exportar`
                : 'Se exportarán todas las órdenes visibles según los filtros aplicados'}
            </li>
            <li>El archivo incluirá todos los campos mostrados en la vista previa</li>
            <li>Las columnas tendrán un ancho optimizado para mejor legibilidad</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
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
                Generando...
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
  )
}