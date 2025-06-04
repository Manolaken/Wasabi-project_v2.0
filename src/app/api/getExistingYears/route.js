import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    
    // Validación del parámetro
    if (!departamentoId || isNaN(parseInt(departamentoId))) {
      console.log('API getExistingYears: ID de departamento no válido:', departamentoId);
      return NextResponse.json(
        { 
          error: 'ID de departamento no proporcionado o no válido',
          years: [] 
        },
        { status: 400 }
      );
    }
    
    // Consultar años que tienen bolsas de presupuesto o inversión
    const [yearsRows] = await pool.query(`
      SELECT DISTINCT YEAR(b.fecha_inicio) AS year
      FROM Bolsa b
      WHERE b.id_DepartamentoFK = ?
      ORDER BY year DESC
    `, [departamentoId]);
    
    // Extraer los años en un array
    const years = yearsRows && Array.isArray(yearsRows) 
      ? yearsRows.map(row => row.year).filter(year => year !== null && year !== undefined)
      : [];
    
    // Obtener los totales de presupuesto e inversión por año para este departamento
    const [presupuestosPorAño] = await pool.query(`
      SELECT 
        YEAR(b.fecha_inicio) AS year,
        SUM(CASE WHEN bp.id_BolsaFK IS NOT NULL THEN b.cantidad_inicial ELSE 0 END) AS total_presupuesto,
        SUM(CASE WHEN bi.id_BolsaFK IS NOT NULL THEN b.cantidad_inicial ELSE 0 END) AS total_inversion
      FROM Bolsa b
      LEFT JOIN Bolsa_Presupuesto bp ON b.id_Bolsa = bp.id_BolsaFK
      LEFT JOIN Bolsa_Inversion bi ON b.id_Bolsa = bi.id_BolsaFK
      WHERE b.id_DepartamentoFK = ?
      GROUP BY YEAR(b.fecha_inicio)
      ORDER BY year DESC
    `, [departamentoId]);
    
    console.log(`API getExistingYears: Encontrados ${years.length} años con bolsas para departamento ${departamentoId}:`, years);
    
    return NextResponse.json({ 
      years,
      presupuestosPorAño: presupuestosPorAño || []
    });
  } catch (error) {
    console.error('Error en API getExistingYears:', error);
    // Devolver una respuesta de error con formato JSON válido
    return NextResponse.json(
      { 
        error: 'Error obteniendo información de bolsas existentes: ' + error.message,
        years: []
      },
      { status: 500 }
    );
  }
}