// En src/app/hooks/useSecureLogout.js
"use client"

import { useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function useSecureLogout() {
  const router = useRouter();

  const secureLogout = useCallback(async () => {
    try {
      // 1. Marcar en localStorage que fue un logout explícito para evitar advertencias
      if (typeof window !== 'undefined') {
        localStorage.setItem('wasabi_explicit_logout', 'true');
        
        // También limpiar cualquier dato sensible del localStorage
        localStorage.removeItem('selectedDepartamento');
        localStorage.removeItem('userDepartamento');
        localStorage.removeItem('wasabi_session_aborted');
      }

      // 2. Hacer la llamada a signOut con configuración especial
      await signOut({ 
        callbackUrl: '/?logged_out=true',
        redirect: false // No redirigir automáticamente
      });

      // 3. Limpiar el estado del navegador y redirigir manualmente
      if (typeof window !== 'undefined') {
        window.location.href = '/?logged_out=true';
      }
    } catch (error) {
      console.error('Error durante logout seguro:', error);
      // Como backup, intentar redirigir al login
      router.push('/?error=logout_failed');
    }
  }, [router]);

  return { secureLogout };
}