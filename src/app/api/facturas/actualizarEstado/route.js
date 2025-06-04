import { NextResponse } from "next/server";
import { updateFacturaEstado } from "@/app/api/functions/facturas";

export async function POST(request) {
  try {
    const data = await request.json();
    const { idFactura, nuevoEstado } = data;
    
    if (!idFactura) {
      return NextResponse.json(
        { error: "ID de factura no proporcionado" },
        { status: 400 }
      );
    }
    
    if (!nuevoEstado) {
      return NextResponse.json(
        { error: "Estado no proporcionado" },
        { status: 400 }
      );
    }
    
    // Obtener el ID del estado a partir del nombre
    let idEstado;
    switch(nuevoEstado) {
      case "Pendiente":
        idEstado = 1;
        break;
      case "Contabilizada":
        idEstado = 2;
        break;
      case "Anulada":
        idEstado = 3;
        break;
      default:
        return NextResponse.json(
          { error: "Estado no válido" },
          { status: 400 }
        );
    }
    
    // Actualizar el estado de la factura
    const result = await updateFacturaEstado(idFactura, idEstado);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al actualizar estado de factura:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud: " + error.message },
      { status: 500 }
    );
  }
}