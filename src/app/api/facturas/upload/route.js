import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";
import formidable from "formidable";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Configurar formidable para manejar archivos
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  try {
    // Crear directorio temporal para almacenar archivos
    const uploadDir = path.join(os.tmpdir(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Configurar formidable para manejar la carga de archivos
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // Procesar el archivo y los campos del formulario
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(request, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Obtener el ID de la factura y el archivo cargado
    const facturaId = fields.facturaId[0];
    const file = files.file[0];

    if (!facturaId) {
      return NextResponse.json(
        { error: "ID de factura no proporcionado" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado un archivo" },
        { status: 400 }
      );
    }

    // Verificar tipo de archivo (debe ser PDF)
    if (file.mimetype !== "application/pdf") {
      await fs.unlink(file.filepath);
      return NextResponse.json(
        { error: "El archivo debe ser un PDF" },
        { status: 400 }
      );
    }

    // Generar una ruta para el PDF
    const fecha = new Date();
    const año = fecha.getFullYear();
    
    // Obtener información de la factura
    const [facturas] = await pool.query(
      `SELECT f.Num_factura, p.Nombre as Proveedor, d.Nombre as Departamento
       FROM Factura f
       JOIN Orden o ON f.idOrdenFK = o.idOrden
       JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
       JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
       WHERE f.idFactura = ?`,
      [facturaId]
    );
    
    if (facturas.length === 0) {
      await fs.unlink(file.filepath);
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }
    
    const factura = facturas[0];
    
    // Generar nombre del archivo
    const proveedorCod = factura.Proveedor.substring(0, 3).toLowerCase();
    const departamentoCod = factura.Departamento.substring(0, 4).toLowerCase();
    const nombreArchivo = `fac-${proveedorCod}-${factura.Num_factura.toLowerCase().replace(/\s+/g, "")}.pdf`;
    
    // MODIFICACIÓN: Crear la estructura de directorios sin el prefijo '/public'
    const directorioDestino = `facturas/${año}/${departamentoCod}`;
    const rutaPdf = `/${directorioDestino}/${nombreArchivo}`;
    
    // Crear la estructura de directorios necesaria
    const directorioCompleto = path.join(process.cwd(), "public", directorioDestino);
    await fs.mkdir(directorioCompleto, { recursive: true });
    
    // Copiar el archivo a su ubicación final
    const destinoArchivo = path.join(directorioCompleto, nombreArchivo);
    await fs.copyFile(file.filepath, destinoArchivo);
    
    // Eliminar el archivo temporal
    await fs.unlink(file.filepath);
    
    // Actualizar la ruta del PDF en la base de datos
    await pool.query(
      "UPDATE Factura SET Ruta_pdf = ? WHERE idFactura = ?",
      [rutaPdf, facturaId]
    );

    return NextResponse.json({
      success: true,
      message: "Factura subida correctamente",
      ruta: rutaPdf,
      ruta_completa: destinoArchivo
    });
  } catch (error) {
    console.error("Error en la API de carga de facturas:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}