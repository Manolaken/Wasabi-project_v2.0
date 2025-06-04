import { NextResponse } from 'next/server';
import { pool } from '@/app/api/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'inversion' o 'presupuesto'
    
    if (!departamentoId || !year || !type) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      );
    }
    
    let query;
    let totalAmount = 0;
    let monthlyAmount = 0;
    
    if (type === 'presupuesto') {
      // Consulta para presupuesto
      query = `
        SELECT 
          SUM(b.cantidad_inicial) AS total_amount,
          SUM(b.cantidad_inicial) / 12 AS monthly_amount
        FROM Bolsa b
        WHERE b.id_Bolsa IN (
          SELECT bp.id_BolsaFK
          FROM Bolsa_Presupuesto bp
        )
        AND b.id_DepartamentoFK = ?
        AND YEAR(b.fecha_inicio) = ?
      `;
    } else if (type === 'inversion') {
      // Consulta para inversión
      query = `
        SELECT 
          SUM(b.cantidad_inicial) AS total_amount,
          SUM(b.cantidad_inicial) / 12 AS monthly_amount
        FROM Bolsa b
        WHERE b.id_Bolsa IN (
          SELECT bi.id_BolsaFK
          FROM Bolsa_Inversion bi
        )
        AND b.id_DepartamentoFK = ?
        AND YEAR(b.fecha_inicio) = ?
      `;
    } else {
      return NextResponse.json(
        { error: 'Tipo no válido' },
        { status: 400 }
      );
    }
    
    const [rows] = await pool.query(query, [departamentoId, year]);
    
    if (rows.length > 0) {
      totalAmount = rows[0].total_amount || 0;
      monthlyAmount = rows[0].monthly_amount || 0;
    }
    
    return NextResponse.json({
      departamentoId,
      year,
      type,
      totalAmount,
      monthlyAmount
    });
    
  } catch (error) {
    console.error('Error obteniendo datos por año:', error);
    return NextResponse.json(
      { error: 'Error obteniendo datos' },
      { status: 500 }
    );
  }
}