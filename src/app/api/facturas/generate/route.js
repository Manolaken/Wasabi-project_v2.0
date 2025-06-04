import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";
import path from "path";
import fs from "fs";

// Importar jsPDF (solo cuando sea necesario)
let jsPDF;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facturaId = searchParams.get("id");

    if (!facturaId) {
      return NextResponse.json(
        { error: "ID de factura no proporcionado" },
        { status: 400 }
      );
    }

    // Cargar jsPDF dinámicamente
    if (!jsPDF) {
      const jsPDFModule = await import('jspdf');
      jsPDF = jsPDFModule.default;
    }

    // Buscar la factura en la base de datos
    const [facturas] = await pool.query(
      `SELECT 
        f.idFactura,
        f.Num_factura,
        f.Fecha_emision,
        f.Ruta_pdf,
        o.Num_orden,
        o.Importe,
        o.Descripcion,
        o.Cantidad,
        p.Nombre AS Proveedor,
        p.NIF,
        p.Direccion,
        p.Telefono,
        d.Nombre AS Departamento,
        e.Tipo AS Estado
      FROM Factura f
      JOIN Orden o ON f.idOrdenFK = o.idOrden
      JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Estado e ON f.idEstadoFK = e.idEstado
      WHERE f.idFactura = ?`,
      [facturaId]
    );

    if (facturas.length === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const factura = facturas[0];

    // Si no hay ruta definida, generarla automáticamente
    if (!factura.Ruta_pdf || factura.Ruta_pdf.trim() === '') {
      console.log(`📝 Generando ruta automática para factura ${factura.Num_factura}...`);
      
      const año = new Date(factura.Fecha_emision || new Date()).getFullYear();
      const departamentoCodigo = factura.Departamento?.substring(0, 3).toLowerCase() || 'gen';
      const numeroLimpio = factura.Num_factura.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rutaPdf = `/facturas/${año}/${departamentoCodigo}/fac-${numeroLimpio}.pdf`;
      
      // Actualizar la ruta en la base de datos
      await pool.query(
        'UPDATE Factura SET Ruta_pdf = ? WHERE idFactura = ?',
        [rutaPdf, facturaId]
      );
      
      factura.Ruta_pdf = rutaPdf;
      console.log(`✅ Ruta generada: ${rutaPdf}`);
    }

    // Normalizar la ruta
    let rutaRelativa = factura.Ruta_pdf;
    if (rutaRelativa.startsWith('/')) {
      rutaRelativa = rutaRelativa.substring(1);
    }
    
    // Construir la ruta completa
    const rutaCompleta = path.join(process.cwd(), "public", rutaRelativa);
    
    // Asegurarse de que el directorio existe
    const directorio = path.dirname(rutaCompleta);
    if (!fs.existsSync(directorio)) {
      fs.mkdirSync(directorio, { recursive: true });
      console.log(`📁 Directorio creado: ${directorio}`);
    }
    
    // Generar el PDF con jsPDF
    const success = await generateInvoicePDFWithJsPDF(factura, rutaCompleta);
    
    if (!success) {
      return NextResponse.json(
        { error: "Error al generar el PDF" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "PDF generado correctamente",
      ruta: factura.Ruta_pdf,
      factura: factura.Num_factura,
      regenerated: true
    });
  } catch (error) {
    console.error("Error en la API de generación de PDF:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * Genera un PDF de factura con estilo usando jsPDF
 */
async function generateInvoicePDFWithJsPDF(facturaData, outputPath) {
  try {
    // Crear nuevo documento PDF con jsPDF
    const doc = new jsPDF();
    
    // CABECERA
    // Título principal en rojo corporativo
    doc.setFontSize(28);
    doc.setTextColor(224, 45, 57); // #E02D39
    doc.text('FACTURA', 20, 25);
    
    // Número de factura y fecha
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Factura Nº: ${facturaData.Num_factura}`, 20, 45);
    doc.text(`Fecha: ${formatDate(facturaData.Fecha_emision)}`, 130, 45);
    
    // Rectángulo de información (simulando el estilo original)
    doc.setFillColor(246, 246, 246); // #f6f6f6
    doc.setDrawColor(204, 204, 204); // #cccccc
    doc.rect(20, 55, 170, 25, 'FD'); // F=fill, D=draw
    
    doc.setFontSize(11);
    doc.text('INFORMACIÓN DE LA FACTURA', 25, 67);
    
    doc.setFontSize(10);
    doc.text(`ID Factura: ${facturaData.idFactura}`, 25, 75);
    doc.text(`Departamento: ${facturaData.Departamento}`, 105, 75);
    
    // Información del proveedor
    doc.setFontSize(14);
    doc.text('Datos del Proveedor', 20, 95);
    
    doc.setFontSize(10);
    doc.text(`Proveedor: ${facturaData.Proveedor || 'Información no disponible'}`, 20, 110);
    doc.text(`NIF: ${facturaData.NIF || 'Información no disponible'}`, 20, 120);
    doc.text(`Dirección: ${facturaData.Direccion || 'Información no disponible'}`, 20, 130);
    doc.text(`Teléfono: ${facturaData.Telefono || 'Información no disponible'}`, 20, 140);
    
    // Descripción de la orden
    doc.setFontSize(14);
    doc.text('Descripción de la Orden de Compra', 20, 160);
    
    // Tabla de conceptos - Cabecera
    const tableY = 175;
    doc.setFillColor(224, 45, 57); // Color rojo corporativo
    doc.rect(20, tableY, 170, 10, 'F');
    
    doc.setTextColor(255, 255, 255); // Blanco
    doc.setFontSize(10);
    doc.text('Descripción', 25, tableY + 7);
    doc.text('Cantidad', 85, tableY + 7);
    doc.text('Importe Unit.', 125, tableY + 7);
    doc.text('Importe Total', 165, tableY + 7);
    
    // Datos de la tabla
    const cantidad = facturaData.Cantidad || 1;
    const importe = facturaData.Importe || 0;
    const importeUnitario = cantidad ? importe / cantidad : 0;
    
    doc.setFillColor(248, 249, 250); // Fondo alternativo
    doc.rect(20, tableY + 10, 170, 10, 'F');
    
    doc.setTextColor(0, 0, 0);
    
    // Truncar descripción si es muy larga
    let descripcion = facturaData.Descripcion || 'Orden de compra estándar';
    if (descripcion.length > 25) {
      descripcion = descripcion.substring(0, 22) + '...';
    }
    
    doc.text(descripcion, 25, tableY + 17);
    doc.text(cantidad.toString(), 85, tableY + 17);
    doc.text(`${importeUnitario.toFixed(2)}€`, 125, tableY + 17);
    doc.text(`${importe.toFixed(2)}€`, 165, tableY + 17);
    
    // Resumen económico
    doc.setFontSize(14);
    doc.text('Resumen Económico', 20, tableY + 40);
    
    const summaryY = tableY + 55;
    doc.setFontSize(11);
    
    // Subtotal
    doc.text('Subtotal:', 130, summaryY);
    doc.text(`${importe.toFixed(2)}€`, 170, summaryY);
    
    // IVA
    const iva = importe * 0.21;
    doc.text('IVA (21%):', 130, summaryY + 10);
    doc.text(`${iva.toFixed(2)}€`, 170, summaryY + 10);
    
    // Línea separadora
    doc.setDrawColor(204, 204, 204);
    doc.line(130, summaryY + 15, 190, summaryY + 15);
    
    // Total
    const total = importe + iva;
    doc.setFontSize(14);
    doc.setTextColor(224, 45, 57);
    doc.text('TOTAL:', 130, summaryY + 25);
    doc.text(`${total.toFixed(2)}€`, 170, summaryY + 25);
    
    // Estado de la factura
    doc.setTextColor(0, 0, 0);
    if (facturaData.Estado) {
      let estadoColor;
      switch(facturaData.Estado) {
        case 'Contabilizada':
          estadoColor = [0, 128, 0]; // Verde
          break;
        case 'Pendiente':
          estadoColor = [255, 165, 0]; // Naranja
          break;
        default:
          estadoColor = [255, 0, 0]; // Rojo
      }
      
      doc.setTextColor(...estadoColor);
      doc.setFontSize(12);
      doc.text(`Estado: ${facturaData.Estado}`, 20, summaryY + 35);
    }
    
    // Pie de página
    doc.setTextColor(102, 102, 102); // Gris
    doc.setFontSize(9);
    doc.text('Esta factura fue generada automáticamente por el sistema de gestión.', 20, 270);
    doc.text('Sin el sello y la firma correspondiente, este documento carece de valor contable.', 20, 280);
    
    // Fecha de generación y copyright
    doc.setFontSize(8);
    doc.text(`Documento generado el: ${new Date().toLocaleString('es-ES')}`, 20, 285);
    doc.text('© 2025 Salesianos Zaragoza', 105, 290, { align: 'center' });
    
    // Guardar el PDF
    const pdfBuffer = doc.output('arraybuffer');
    await fs.promises.writeFile(outputPath, Buffer.from(pdfBuffer));
    
    console.log(`✅ PDF generado con jsPDF: ${outputPath}`);
    return true;
    
  } catch (error) {
    console.error('Error generando PDF con jsPDF:', error);
    return false;
  }
}

/**
 * Formatea una fecha para mostrar
 */
function formatDate(dateString) {
  if (!dateString) return new Date().toLocaleDateString('es-ES');
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  } catch (error) {
    return new Date().toLocaleDateString('es-ES');
  }
}