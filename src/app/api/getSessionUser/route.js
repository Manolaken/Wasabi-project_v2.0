import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUsuarioPorId } from "../functions/usuarios";

export async function GET() {
  try {
    // Obtener la sesión actual
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }
    
    // Obtener información completa del usuario
    const usuario = await getUsuarioPorId(session.user.id);
    
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    
    // Devolver la información del usuario junto con los datos de sesión
    return NextResponse.json({
      ...session,
      usuario: {
        id: usuario.idUsuario,
        nombre: usuario.Nombre,
        apellidos: usuario.Apellidos,
        email: usuario.Email,
        rol: usuario.Rol,
        departamento: usuario.Departamento
      }
    });
  } catch (error) {
    console.error("Error al obtener información de sesión:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}