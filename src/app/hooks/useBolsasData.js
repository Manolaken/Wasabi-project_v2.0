"use client"

import { useState, useCallback } from 'react';

/**
 * Hook personalizado para obtener y actualizar datos de bolsas presupuestarias
 */
export default function useBolsasData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Función para obtener los datos más recientes de bolsas
   * @param {number} departamentoId - ID del departamento
   * @param {number} year - Año (opcional)
   * @param {string} type - Tipo de bolsa ('all', 'presupuesto', 'inversion')
   * @returns {Promise<Object>} - Datos de bolsas
   */
  const fetchBolsasData = useCallback(async (departamentoId, year = null, type = 'all') => {
    if (!departamentoId) {
      throw new Error('ID de departamento no proporcionado');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir la URL con los parámetros
      let url = `/api/getBolsasRecientes?departamentoId=${departamentoId}`;
      if (year) url += `&year=${year}`;
      if (type) url += `&type=${type}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener datos de bolsas');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error en useBolsasData:', err);
      setError(err.message || 'Error al obtener datos de bolsas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Función para crear nuevas bolsas presupuestarias
   */
  const createBolsas = useCallback(async (departamentoId, año, cantidadPresupuesto, cantidadInversion, esActualizacion = false) => {
      setIsLoading(true);
      setError(null);
      
      try {
          const dataToSend = {
          departamentoId,
          año: parseInt(año),
          cantidadPresupuesto: cantidadPresupuesto ? parseFloat(cantidadPresupuesto) : 0,
          cantidadInversion: cantidadInversion ? parseFloat(cantidadInversion) : 0,
          esActualizacion // Nuevo parámetro para indicar si es actualización
          };
          
          console.log(`Enviando solicitud para ${esActualizacion ? 'actualizar' : 'crear'} bolsas:`, dataToSend);
          
          const response = await fetch('/api/createBolsas', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(dataToSend)
          });
          
          // Verificar respuesta
          const text = await response.text();
          let result;
          
          try {
          result = JSON.parse(text);
          } catch (parseError) {
          console.error('Error al parsear respuesta:', parseError, 'Texto recibido:', text);
          throw new Error('Error en formato de respuesta del servidor');
          }
          
          if (!response.ok) {
          throw new Error(result?.error || 'Error al procesar la solicitud');
          }
          
          // Después de crear/actualizar las bolsas, obtener datos actualizados
          const updatedData = await fetchBolsasData(departamentoId, año);
          
          return {
          ...result,
          updatedData
          };
      } catch (err) {
          console.error(`Error al ${esActualizacion ? 'actualizar' : 'crear'} bolsas:`, err);
          setError(err.message || `Error al ${esActualizacion ? 'actualizar' : 'crear'} bolsas`);
          throw err;
      } finally {
          setIsLoading(false);
      }
  }, [fetchBolsasData]); 
  
  /**
   * Obtener años que ya tienen bolsas asociadas a un departamento
   */
  const getExistingYears = useCallback(async (departamentoId) => {
      if (!departamentoId) {
          // Si no hay ID, devolver array vacío en lugar de lanzar error
          console.warn('ID de departamento no proporcionado para getExistingYears');
          return [];
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
          const response = await fetch(`/api/getExistingYears?departamentoId=${departamentoId}`);
          
          // Verificar respuesta
          if (!response.ok) {
              const errorData = await response.json();
              console.error('Error en respuesta de getExistingYears:', errorData);
              throw new Error(errorData.error || 'Error al obtener años con bolsas');
          }
          
          // Intentar analizar el JSON
          const data = await response.json();
          
          // Verificar si la respuesta tiene el formato esperado
          if (!data || !Array.isArray(data.years)) {
              console.warn('Formato de respuesta inválido para getExistingYears:', data);
              return [];
          }
          
          return data.years;
      } catch (err) {
          console.error('Error al obtener años con bolsas:', err);
          setError(err.message || 'Error al obtener años con bolsas');
          return []; // Devolver array vacío en caso de error
      } finally {
          setIsLoading(false);
      }
  }, []);
  
  return {
    isLoading,
    error,
    fetchBolsasData,
    createBolsas,
    getExistingYears
  };
}