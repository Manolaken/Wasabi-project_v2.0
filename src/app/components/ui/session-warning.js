// En src/app/components/ui/session-warning.js
"use client"

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, AlertTriangle } from 'lucide-react';

export default function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningDetail, setWarningDetail] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    const wasAborted = typeof window !== 'undefined' ? 
      localStorage.getItem('wasabi_session_aborted') === 'true' : false;
    
    if (message === 'session_expired') {
      setWarningMessage('Tu sesión expiró. Por favor, inicia sesión nuevamente.');
      setWarningDetail('Recuerda hacer logout antes de cerrar la ventana.');
      setShowWarning(true);
      
      // Limpiar el flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wasabi_session_aborted');
      }
    } else if (wasAborted) {
      setWarningMessage('Se detectó un cierre anormal de tu sesión anterior.');
      setWarningDetail('Siempre debes hacer logout antes de cerrar la ventana del navegador.');
      setShowWarning(true);
      
      // Limpiar el flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wasabi_session_aborted');
      }
    }
  }, [searchParams]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {warningMessage}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              {warningDetail}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500"
              onClick={() => setShowWarning(false)}
            >
              <X className="h-5 w-5 cursor-pointer" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}