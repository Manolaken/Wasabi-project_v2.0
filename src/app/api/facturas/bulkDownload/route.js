import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export async function POST(request) {
  try {
    // Obtener los IDs de las facturas del cuerpo de la solicitud
    const data = await request.json();
    const { facturaIds } = data;

    if (!facturaIds || !Array.isArray(facturaIds) || facturaIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs de facturas" },
        { status: 400 }
      );
    }

    // Limitar el número de facturas para evitar sobrecarga
    if (facturaIds.length > 50) {
      return NextResponse.json(
        { error: "No se pueden descargar más de 50 facturas a la vez" },
        { status: 400 }
      );
    }

    // Crear un nuevo objeto ZIP
    const zip = new JSZip();

    // Para cada ID de factura
    for (const facturaId of facturaIds) {
      // Buscar la factura en la base de datos
      // Corregimos la consulta SQL para usar los nombres correctos de las columnas
      const [facturas] = await pool.query(
        `SELECT f.Ruta_pdf, f.Num_factura, p.Nombre as NombreProveedor, f.Fecha_emision 
         FROM Factura f
         JOIN Orden o ON f.idOrdenFK = o.idOrden
         JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
         WHERE f.idFactura = ?`,
        [facturaId]
      );

      if (facturas.length === 0) {
        console.warn(`Factura con ID ${facturaId} no encontrada`);
        continue;
      }

      const factura = facturas[0];

      // Verificar si hay una ruta de archivo PDF
      if (!factura.Ruta_pdf) {
        console.warn(`Factura con ID ${facturaId} no tiene PDF asociado`);
        continue;
      }

      // Construir la ruta real al archivo
      const rutaRelativa = factura.Ruta_pdf.startsWith('/')
        ? factura.Ruta_pdf.substring(1)
        : factura.Ruta_pdf;
      
      const rutaCompleta = path.join(process.cwd(), "public", rutaRelativa);

      // Verificar si el archivo existe
      if (!fs.existsSync(rutaCompleta)) {
        console.warn(`Archivo no encontrado para factura ${facturaId}: ${rutaCompleta}`);
        continue;
      }

      try {
        // Leer el archivo PDF
        const fileBuffer = fs.readFileSync(rutaCompleta);
        
        // Crear un nombre de archivo para el ZIP basado en los datos
        const fileName = `Factura_${factura.Num_factura}_${factura.NombreProveedor.replace(/\s+/g, "_")}.pdf`;
        
        // Añadir el archivo al ZIP
        zip.file(fileName, fileBuffer);
      } catch (fileError) {
        console.error(`Error leyendo archivo para factura ${facturaId}:`, fileError);
      }
    }

    // Generar el ZIP como un buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Crear nombre para el archivo ZIP
    const fechaActual = new Date().toISOString().substring(0, 10);
    const zipFileName = `Facturas_${fechaActual}.zip`;

    // Devolver el ZIP como respuesta
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
        "Content-Length": zipBuffer.length.toString()
      },
    });
  } catch (error) {
    console.error("Error en la API de descarga masiva de facturas:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}