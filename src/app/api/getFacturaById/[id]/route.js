import { NextResponse } from "next/server";
import { getFacturaById } from "@/app/api/functions/facturas";

export async function GET(request, { params }) {
  try {
    const awaitedParams = await params;
    const facturaId = awaitedParams.id;
    
    if (!facturaId) {
      return NextResponse.json(
        { error: "ID de factura no proporcionado" },
        { status: 400 }
      );
    }
    
    const factura = await getFacturaById(facturaId);
    
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(factura);
  } catch (error) {
    console.error("Error al obtener factura:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}