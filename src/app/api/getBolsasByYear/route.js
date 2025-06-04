// src/app/api/getBolsasByYear/route.js

import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    const year = searchParams.get('year');
    
    if (!departamentoId || !year) {
      return NextResponse.json(
        { error: 'Faltan parámetros: departamentoId y year son requeridos' },
        { status: 400 }
      );
    }
    
    console.log(`Obteniendo bolsas para departamento ${departamentoId} y año ${year}`);
    
    // Consulta para obtener todas las bolsas para el año y departamento
    const [bolsasRows] = await pool.query(`
      SELECT 
        b.id_Bolsa,
        b.cantidad_inicial,
        CASE
          WHEN bp.id_BolsaFK IS NOT NULL THEN 'presupuesto'
          WHEN bi.id_BolsaFK IS NOT NULL THEN 'inversion'
          ELSE 'desconocido'
        END as tipo
      FROM Bolsa b
      LEFT JOIN Bolsa_Presupuesto bp ON b.id_Bolsa = bp.id_BolsaFK
      LEFT JOIN Bolsa_Inversion bi ON b.id_Bolsa = bi.id_BolsaFK
      WHERE b.id_DepartamentoFK = ?
      AND YEAR(b.fecha_inicio) = ?
    `, [departamentoId, year]);
    
    // Transformar los resultados para su uso en el cliente
    const bolsas = bolsasRows.map(row => ({
      id: row.id_Bolsa,
      cantidad: row.cantidad_inicial,
      tipo: row.tipo
    }));
    
    console.log(`Encontradas ${bolsas.length} bolsas para el año ${year}:`, bolsas);
    
    return NextResponse.json({
      success: true,
      bolsas
    });
    
  } catch (error) {
    console.error('Error al obtener bolsas por año:', error);
    return NextResponse.json(
      { error: 'Error al obtener bolsas por año: ' + error.message },
      { status: 500 }
    );
  }
}