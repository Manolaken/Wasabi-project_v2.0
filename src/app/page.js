"use client"

import { Inter } from "next/font/google"
import "./globals.css"
import { useEffect, useState } from "react"
import Image from "next/image"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import SessionWarning from "./components/ui/session-warning"
import { Check } from 'lucide-react';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export default function Login() {
  const [usuario, setUsuario] = useState("")
  const [contraseña, setContraseña] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Verificar si vienen de un logout exitoso
  useEffect(() => {
    const loggedOut = searchParams.get('logged_out')
    const wasExplicitLogout = typeof window !== 'undefined' ? 
      localStorage.getItem('wasabi_explicit_logout') === 'true' : false

    if (loggedOut === 'true' && wasExplicitLogout) {
      setShowLogoutSuccess(true)
      // Limpiar el flag DESPUÉS de mostrar el mensaje
      setTimeout(() => {
        localStorage.removeItem('wasabi_explicit_logout')
      }, 500) // Pequeño delay para asegurar que se ve el mensaje
      
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => setShowLogoutSuccess(false), 5000)
    }
  }, [searchParams])

  // Redirigir si ya está autenticado, comprobando el rol
  useEffect(() => {
    if (session) {
      // Obtener el rol del usuario para determinar la redirección
      const checkUserRole = async () => {
        try {
          const response = await fetch(`/api/getUsuarios/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            
            // Redireccionar según el rol
            if (userData.Rol === "Jefe de Departamento" && userData.Departamento) {
              router.push(`/pages/resumen/${userData.Departamento}`);
            } else {
              // Para Admin y Contable
              router.push("/pages/home");
            }
          } else {
            // Si hay algún error, redirigir por defecto a home
            router.push("/pages/home");
          }
        } catch (error) {
          console.error("Error obteniendo información del usuario:", error);
          router.push("/pages/home");
        }
      };
      
      checkUserRole();
    }
  }, [session, router]);

  // Este efecto se ejecuta en el cliente para ocultar solo el header y navbar
  useEffect(() => {
    // Ocultar navbar y header, pero mantener el footer
    const navbar = document.querySelector(".w-64.border-r")
    const header = document.querySelector("header")

    if (navbar) navbar.style.display = "none"
    if (header) header.style.display = "none"

    // Ajustar el estilo del contenedor principal para quitar el margen izquierdo
    const mainContainer = document.querySelector(".ml-64")
    if (mainContainer) {
      mainContainer.classList.remove("ml-64")
      mainContainer.classList.add("ml-0")
    }

    // Restaurar todo cuando el componente se desmonte
    return () => {
      if (navbar) navbar.style.display = ""
      if (header) header.style.display = ""

      if (mainContainer) {
        mainContainer.classList.add("ml-64")
        mainContainer.classList.remove("ml-0")
      }
    }
  }, [])

  // Limpiar el flag de logout explícito al iniciar sesión
  const handleLogin = async (e) => {
    e.preventDefault()

    if (!usuario || !contraseña) {
      setError("Por favor, completa todos los campos")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Limpiar cualquier flag de logout explícito antes del login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wasabi_explicit_logout');
      }

      // Usar NextAuth.js para autenticación con credenciales
      const result = await signIn("credentials", {
        redirect: false,
        username: usuario,
        password: contraseña,
      })

      if (result?.error) {
        setError("Usuario o contraseña incorrectos")
        setIsLoading(false)
      }
      // No redirigimos aquí, el useEffect con session se encargará de la redirección
    } catch (err) {
      setError("Error al iniciar sesión")
      console.error(err)
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      // Limpiar cualquier flag de logout explícito antes del login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wasabi_explicit_logout');
      }

      // Usar NextAuth.js para autenticación con Google
      // No especificamos callbackUrl para que el useEffect maneje la redirección
      await signIn("google", { callbackUrl: undefined })
    } catch (err) {
      console.error("Error al iniciar sesión con Google:", err)
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      {/* Mostrar advertencia de sesión si es necesario */}
      <SessionWarning />
      
      {/* Mostrar mensaje de logout exitoso */}
      {showLogoutSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm font-medium text-green-800">
                Sesión cerrada correctamente
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md p-10 bg-gray-50 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 relative">
            <Image src="/images/logo-salesianos.png" alt="Salesianos" fill className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-600">Iniciar Sesión</h1>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="usuario" className="block text-gray-700 mb-2">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full bg-white px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="contraseña" className="block text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="contraseña"
              type="password"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className="w-full bg-white px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 opacity-80 text-white py-3 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
          >
            {isLoading ? "Cargando..." : "Acceder"}
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400">o</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span className="text-gray-700">{isLoading ? "Cargando..." : "Iniciar sesión con Google"}</span>
          </button>
        </form>
      </div>
    </div>
  )
}