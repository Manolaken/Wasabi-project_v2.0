import { getUsuariosConPermisos } from "@/app/api/functions/usuarios"
import { getRol } from "@/app/api/functions/rol"
import { getDepartamentos } from "@/app/api/functions/departamentos" 
import UsuariosClient from "./usuariosClient" 
import { getServerSession } from "next-auth/next" 
import { authOptions } from "@/app/api/auth/[...nextauth]/route" 
import AccesoDenegado from "@/app/components/ui/acceso-denegado" 

export const metadata = { 
  title: 'Gestión de Usuarios - WASABI', 
  description: 'Administración de usuarios y permisos del sistema WASABI', 
} 

export default async function Usuarios() { 
  try { 
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions) 
    
    if (!session) { 
      // Mostrar componente de acceso denegado si no hay sesión
      return <AccesoDenegado mensaje="Debes iniciar sesión para acceder a esta página" />
    } 
    
    // Verificar el rol del usuario
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/getUsuarios/${session.user.id}`) 
    const userData = await userResponse.json() 
    
    // Si el usuario no es administrador, mostrar acceso denegado
    if (userData.Rol !== "Administrador") { 
      return <AccesoDenegado mensaje="Esta sección está reservada para administradores" />
    } 
    
    // Cargar datos necesarios para la página
    const usuarios = await getUsuariosConPermisos() 
    const roles = await getRol() 
    const departamentos = await getDepartamentos() 
    
    return ( 
      <UsuariosClient 
        initialUsuarios={usuarios} 
        initialRoles={roles} 
        initialDepartamentos={departamentos} 
      /> 
    ) 
  } catch (error) { 
    console.error("Error cargando datos para la página de usuarios:", error) 
    
    // Mostrar un estado de error al usuario
    return ( 
      <div className="p-6"> 
        <div className="mb-6"> 
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1> 
        </div> 
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"> 
          <p className="font-bold">Error al cargar datos</p> 
          <p>No se pudieron cargar los datos necesarios o no tienes permisos para acceder a esta página.</p> 
        </div> 
      </div> 
    ) 
  } 
}