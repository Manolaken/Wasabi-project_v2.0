import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('id');
    
    if (!departamentoId) {
      return NextResponse.json(
        { error: 'El ID del departamento es requerido' },
        { status: 400 }
      );
    }
    
    // Consulta para obtener el presupuesto mensual del departamento
    const [rows] = await pool.query(`
      SELECT 
        b.id_DepartamentoFK,
        SUM(b.cantidad_inicial) / 12 AS presupuesto_mensual,
        MIN(b.fecha_inicio) AS fecha_inicio,
        MAX(b.fecha_final) AS fecha_final
      FROM Bolsa b
      WHERE b.id_Bolsa IN (
        SELECT bp.id_BolsaFK
        FROM Bolsa_Presupuesto bp
      )
      AND b.id_DepartamentoFK = ?
      GROUP BY b.id_DepartamentoFK
    `, [departamentoId]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error obteniendo presupuesto mensual:', error);
    return NextResponse.json(
      { error: 'Error obteniendo presupuesto mensual' },
      { status: 500 }
    );
  }
}