// src/app/api/createBolsas/route.js
import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { 
      departamentoId, 
      año, 
      cantidadPresupuesto, 
      cantidadInversion,
      esActualizacion = false
    } = data;
    
    console.log('API createBolsas: Datos recibidos:', {
      departamentoId, 
      año, 
      cantidadPresupuesto, 
      cantidadInversion,
      esActualizacion
    });
    
    // Validar datos requeridos
    if (!departamentoId) {
      return NextResponse.json(
        { error: 'ID de departamento no proporcionado' },
        { status: 400 }
      );
    }
    
    if (!año) {
      return NextResponse.json(
        { error: 'Año no proporcionado' },
        { status: 400 }
      );
    }
    
    if (cantidadPresupuesto === 0 && cantidadInversion === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una cantidad para presupuesto o inversión' },
        { status: 400 }
      );
    }
    
    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Determinar fechas para el año
      const fechaInicio = `${año}-01-01`;
      const fechaFinal = `${año}-12-31`;
      const resultados = [];
      
      // Si es actualización, verificar si las bolsas existentes tienen órdenes asociadas
      if (esActualizacion) {
        console.log(`Verificando si hay órdenes asociadas a bolsas del año ${año} para departamento ${departamentoId}`);
        
        // Obtener detalles de las bolsas existentes 
        const [bolsasExistentes] = await connection.query(
          `SELECT b.id_Bolsa, b.cantidad_inicial, 
           (SELECT COUNT(*) FROM Bolsa_Presupuesto bp WHERE bp.id_BolsaFK = b.id_Bolsa) as es_presupuesto,
           (SELECT COUNT(*) FROM Bolsa_Inversion bi WHERE bi.id_BolsaFK = b.id_Bolsa) as es_inversion
           FROM Bolsa b 
           WHERE b.id_DepartamentoFK = ? AND YEAR(b.fecha_inicio) = ?`,
          [departamentoId, año]
        );
        
        if (bolsasExistentes.length > 0) {
          const idsExistentes = bolsasExistentes.map(b => b.id_Bolsa);
          
          // Verificar si hay órdenes de compra asociadas a presupuestos
          const [ordenesPresupuesto] = await connection.query(
            `SELECT COUNT(*) as total FROM Orden_Compra WHERE id_PresupuestoFK IN (?)`,
            [idsExistentes]
          );
          
          // Verificar si hay órdenes de inversión asociadas
          const [ordenesInversion] = await connection.query(
            `SELECT COUNT(*) as total FROM Orden_Inversion WHERE id_InversionFK IN (?)`,
            [idsExistentes]
          );
          
          const tieneOrdenesAsociadas = 
            (ordenesPresupuesto[0]?.total > 0) || 
            (ordenesInversion[0]?.total > 0);
          
          if (tieneOrdenesAsociadas) {
            await connection.rollback();
            return NextResponse.json(
              { 
                error: 'No se pueden modificar bolsas que ya tienen órdenes asociadas',
                tieneOrdenes: true,
                totalOrdenes: {
                  presupuesto: ordenesPresupuesto[0]?.total || 0,
                  inversion: ordenesInversion[0]?.total || 0
                }
              },
              { status: 403 }
            );
          }
          
          console.log(`No se encontraron órdenes asociadas, procediendo con la actualización`);
          
          // 1. Primero, eliminar dependencias en tablas Bolsa_Presupuesto y Bolsa_Inversion
          await connection.query(
            `DELETE FROM Bolsa_Presupuesto WHERE id_BolsaFK IN (?)`,
            [idsExistentes]
          );
          
          await connection.query(
            `DELETE FROM Bolsa_Inversion WHERE id_BolsaFK IN (?)`,
            [idsExistentes]
          );
          
          // 2. Eliminar las bolsas existentes
          await connection.query(
            `DELETE FROM Bolsa WHERE id_Bolsa IN (?)`,
            [idsExistentes]
          );
        }
      }
      
      // Crear bolsa de presupuesto si se proporcionó una cantidad
      if (cantidadPresupuesto > 0) {
        // 1. Insertar en la tabla Bolsa
        const [bolsaResult] = await connection.query(
          `INSERT INTO Bolsa (
            id_DepartamentoFK,
            fecha_inicio,
            cantidad_inicial,
            fecha_final
          ) VALUES (?, ?, ?, ?)`,
          [
            departamentoId,
            fechaInicio,
            cantidadPresupuesto,
            fechaFinal
          ]
        );
        
        const bolsaId = bolsaResult.insertId;
        
        // 2. Insertar en la tabla Bolsa_Presupuesto
        await connection.query(
          `INSERT INTO Bolsa_Presupuesto (
            id_BolsaFK
          ) VALUES (?)`,
          [bolsaId]
        );
        
        resultados.push({
          tipo: 'presupuesto',
          id: bolsaId,
          cantidad: cantidadPresupuesto
        });
        
        console.log(`Bolsa de presupuesto ${esActualizacion ? 'actualizada' : 'creada'}: ID=${bolsaId}, Cantidad=${cantidadPresupuesto}`);
      }
      
      // Crear bolsa de inversión si se proporcionó una cantidad
      if (cantidadInversion > 0) {
        // 1. Insertar en la tabla Bolsa
        const [bolsaResult] = await connection.query(
          `INSERT INTO Bolsa (
            id_DepartamentoFK,
            fecha_inicio,
            cantidad_inicial,
            fecha_final
          ) VALUES (?, ?, ?, ?)`,
          [
            departamentoId,
            fechaInicio,
            cantidadInversion,
            fechaFinal
          ]
        );
        
        const bolsaId = bolsaResult.insertId;
        
        // 2. Insertar en la tabla Bolsa_Inversion
        await connection.query(
          `INSERT INTO Bolsa_Inversion (
            id_BolsaFK
          ) VALUES (?)`,
          [bolsaId]
        );
        
        resultados.push({
          tipo: 'inversion',
          id: bolsaId,
          cantidad: cantidadInversion
        });
        
        console.log(`Bolsa de inversión ${esActualizacion ? 'actualizada' : 'creada'}: ID=${bolsaId}, Cantidad=${cantidadInversion}`);
      }
      
      // Confirmar transacción
      await connection.commit();
      
      return NextResponse.json({
        success: true,
        message: esActualizacion 
          ? 'Bolsas presupuestarias actualizadas correctamente' 
          : 'Bolsas presupuestarias creadas correctamente',
        resultados
      });
      
    } catch (error) {
      // Revertir transacción en caso de error
      await connection.rollback();
      console.error('Error en la transacción:', error);
      throw error;
    } finally {
      // Liberar conexión
      connection.release();
    }
    
  } catch (error) {
    console.error(`Error ${error.message || 'desconocido'} en createBolsas:`, error);
    return NextResponse.json(
      { error: `Error ${error.message ? `(${error.message})` : ''} al procesar bolsas presupuestarias` },
      { status: 500 }
    );
  }
}