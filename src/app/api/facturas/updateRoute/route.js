import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";

export async function POST(request) {
  try {
    const { facturaId, rutaPdf } = await request.json();
    
    if (!facturaId || !rutaPdf) {
      return NextResponse.json(
        { error: "ID de factura y ruta PDF son requeridos" },
        { status: 400 }
      );
    }
    
    // Actualizar la ruta del PDF en la base de datos
    const [result] = await pool.query(
      'UPDATE Factura SET Ruta_pdf = ? WHERE idFactura = ?',
      [rutaPdf, facturaId]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Ruta de PDF actualizada correctamente",
      facturaId,
      rutaPdf
    });
    
  } catch (error) {
    console.error("Error actualizando ruta de PDF:", error);
    return NextResponse.json(
      { error: "Error al actualizar ruta de PDF: " + error.message },
      { status: 500 }
    );
  }
}