import { NextResponse } from "next/server";
import { getProveedores } from "@/app/api/functions/proveedores";

export async function GET() {
  try {
    const proveedores = await getProveedores();
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error("Error fetching proveedores:", error);
    return NextResponse.json(
      { error: "Error fetching proveedores: " + error.message },
      { status: 500 }
    );
  }
}