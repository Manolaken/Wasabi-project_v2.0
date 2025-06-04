import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    // Obtener ID de la factura de los parámetros de consulta
    const { searchParams } = new URL(request.url);
    const facturaId = searchParams.get("id");

    if (!facturaId) {
      return NextResponse.json(
        { error: "ID de factura no proporcionado" },
        { status: 400 }
      );
    }

    // Buscar la factura en la base de datos
    const [facturas] = await pool.query(
      `SELECT f.Ruta_pdf, f.Num_factura, p.Nombre as NombreProveedor, f.Fecha_emision 
       FROM Factura f
       JOIN Orden o ON f.idOrdenFK = o.idOrden
       JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
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

    // Verificar si hay una ruta de archivo PDF
    if (!factura.Ruta_pdf) {
      return NextResponse.json(
        { error: "No hay archivo PDF asociado a esta factura" },
        { status: 400 }
      );
    }

    // MODIFICACIÓN: Construir la ruta real al archivo
    // Eliminar '/public' del inicio si existe, ya que process.cwd() + 'public' ya apunta a la carpeta public
    let rutaRelativa = factura.Ruta_pdf;
    if (rutaRelativa.startsWith('/public/')) {
      rutaRelativa = rutaRelativa.substring(7); // Quitar '/public/'
    } else if (rutaRelativa.startsWith('public/')) {
      rutaRelativa = rutaRelativa.substring(6); // Quitar 'public/'
    } else if (rutaRelativa.startsWith('/')) {
      rutaRelativa = rutaRelativa.substring(1); // Quitar solo '/'
    }
    
    // Construir la ruta completa
    const rutaCompleta = path.join(process.cwd(), "public", rutaRelativa);
    
    console.log("Buscando archivo en:", rutaCompleta);

    // Verificar si el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      console.error(`Archivo no encontrado: ${rutaCompleta}`);
      return NextResponse.json(
        { 
          error: "El archivo PDF no se encuentra en el servidor",
          ruta_esperada: rutaCompleta,
          ruta_original: factura.Ruta_pdf
        },
        { status: 404 }
      );
    }

    try {
      // Leer el archivo PDF
      const fileBuffer = fs.readFileSync(rutaCompleta);
      
      // Crear un nombre de archivo para la descarga basado en los datos de la factura
      const fileName = `Factura_${factura.Num_factura}_${factura.NombreProveedor?.replace(/\s+/g, "_") || "SinProveedor"}.pdf`;

      // Devolver el archivo como una respuesta binaria
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fileBuffer.length.toString()
        },
      });
    } catch (fileError) {
      console.error("Error al leer el archivo:", fileError);
      return NextResponse.json(
        { error: "No se pudo leer el archivo PDF" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error en la API de descarga de facturas:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}