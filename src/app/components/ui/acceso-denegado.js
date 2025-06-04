'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AccesoDenegado({ mensaje = "No tienes permisos suficientes para acceder a esta página. Esta sección está reservada para administradores del sistema." }) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Obtener información del usuario
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const res = await fetch('/api/getSessionUser');
        if (res.ok) {
          const data = await res.json();
          setUserInfo(data.usuario);
        }
      } catch (error) {
        console.error("Error obteniendo información del usuario:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getUserInfo();
  }, []);

  // Función para manejar la redirección según el rol
  const handleRedirect = () => {
    if (userInfo) {
      if (userInfo.rol === "Jefe de Departamento" && userInfo.departamento) {
        // Redireccionar a la página de resumen del departamento
        router.push(`/pages/resumen/${userInfo.departamento}`);
      } else if (userInfo.rol === "Contable" || userInfo.rol === "Administrador") {
        // Redireccionar a la página de inicio
        router.push('/pages/home');
      } else {
        // Si no se reconoce el rol, ir a home por defecto
        router.push('/pages/home');
      }
    } else {
      // Si no hay información de usuario, ir a home por defecto
      router.push('/pages/home');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6">
      <div className="w-full max-w-md text-center">
        <div className="bg-red-100 border-l-4 border-red-500 p-8 rounded-lg shadow-md">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-500 text-white rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Acceso Denegado</h2>
          <p className="text-gray-700 mb-6">
            {mensaje}
          </p>
          <button
            onClick={handleRedirect}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isLoading ? "Cargando..." : "Volver al inicio"}
          </button>
        </div>
      </div>
    </div>
  );
}