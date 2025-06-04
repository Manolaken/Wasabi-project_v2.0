import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoginPage = request.nextUrl.pathname === "/"
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  
  // No aplicar middleware a rutas de API
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Si no hay token y no es la página de login, redirigir
  if (!token && !isLoginPage) {
    const loginUrl = new URL("/", request.url)
    loginUrl.searchParams.set("message", "session_expired")
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token y está en la página de login, redirigir según su rol
  if (token && isLoginPage) {
    try {
      // Verificar si fue un logout explícito
      const logoutHeader = request.headers.get('x-logout-explicit')
      if (logoutHeader === 'true') {
        return NextResponse.next()
      }

      // Obtener información del usuario para redirección inteligente
      const userResponse = await fetch(new URL(`/api/getUsuarios/${token.id}`, request.url).toString())
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        
        if (userData.Rol === "Jefe de Departamento" && userData.Departamento) {
          return NextResponse.redirect(new URL(`/pages/resumen/${userData.Departamento}`, request.url))
        } else {
          return NextResponse.redirect(new URL(`/pages/home`, request.url))
        }
      }
    } catch (error) {
      console.error("Error in middleware:", error)
    }
    
    return NextResponse.redirect(new URL("/pages/home", request.url))
  }

  // Verificación de rol para páginas protegidas (usuarios)
  if (token && (request.nextUrl.pathname === "/pages/usuarios" || 
                request.nextUrl.pathname.startsWith("/pages/usuarios/"))) {
    try {
      const userResponse = await fetch(new URL(`/api/getUsuarios/${token.id}`, request.url).toString())
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        
        if (userData.Rol !== "Administrador") {
          return NextResponse.redirect(new URL(`/pages/home`, request.url))
        }
      }
    } catch (error) {
      console.error("Error verificando rol de usuario:", error)
    }
  }

  return NextResponse.next()
}

// Configurar las rutas que deben ser protegidas
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. /api/auth (rutas de autenticación)
     * 2. /_next (archivos de Next.js)
     * 3. /images (archivos estáticos)
     * 4. /favicon.ico (favicon)
     */
    "/((?!api/auth|_next|images|favicon.ico).*)",
  ],
}