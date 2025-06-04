'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function useUserDepartamento() {
  const [departamento, setDepartamento] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/getSessionUser');
        if (response.ok) {
          const data = await response.json();
          setDepartamento(data.usuario?.departamento || '');
          setUserRole(data.usuario?.rol || '');
          
          // Verificar si el usuario es administrador
          const isUserAdmin = data.usuario?.rol === 'Administrador';
          setIsAdmin(isUserAdmin);
        } else {
          // Si hay error en la sesión, redirigir al login
          router.push('/');
        }
      } catch (error) {
        console.error('Error obteniendo información del usuario:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserInfo();
  }, [router]);

  return { departamento, userRole, isAdmin, isLoading };
}