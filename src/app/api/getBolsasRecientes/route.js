import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'all', 'presupuesto' o 'inversion'
    
    if (!departamentoId) {
      return NextResponse.json(
        { error: 'ID de departamento no proporcionado' },
        { status: 400 }
      );
    }
    
    // Preparar el resultado
    const result = {
      departamentoId,
      year: year || new Date().getFullYear(),
      presupuesto: null,
      inversion: null,
      gastoPresupuesto: null,
      gastoInversion: null
    };
    
    // Filtro de año (si se proporciona)
    const yearFilter = year ? `AND YEAR(b.fecha_inicio) = ${year}` : '';
    
    // Obtener datos de presupuesto (si se solicita)
    if (type === 'all' || type === 'presupuesto') {
      const [presupuestoRows] = await pool.query(`
        SELECT 
          b.id_DepartamentoFK,
          SUM(b.cantidad_inicial) AS total_presupuesto,
          SUM(b.cantidad_inicial) / 12 AS presupuesto_mensual,
          MIN(b.fecha_inicio) AS fecha_inicio,
          MAX(b.fecha_final) AS fecha_final
        FROM Bolsa b
        WHERE b.id_Bolsa IN (
          SELECT bp.id_BolsaFK
          FROM Bolsa_Presupuesto bp
        )
        AND b.id_DepartamentoFK = ?
        ${yearFilter}
        GROUP BY b.id_DepartamentoFK
      `, [departamentoId]);
      
      if (presupuestoRows.length > 0) {
        result.presupuesto = presupuestoRows[0];
      }
      
      // Obtener gasto en presupuesto
      const [gastoPresupuestoRows] = await pool.query(`
        SELECT 
          SUM(o.Importe) AS total_gasto
        FROM Orden o
        LEFT JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
        WHERE o.id_DepartamentoFK = ?
        AND oi.idOrden IS NULL
        ${year ? 'AND YEAR(o.Fecha) = ?' : ''}
      `, year ? [departamentoId, year] : [departamentoId]);
      
      result.gastoPresupuesto = gastoPresupuestoRows[0]?.total_gasto || 0;
    }
    
    // Obtener datos de inversión (si se solicita)
    if (type === 'all' || type === 'inversion') {
      const [inversionRows] = await pool.query(`
        SELECT 
          b.id_DepartamentoFK,
          SUM(b.cantidad_inicial) AS total_inversion,
          SUM(b.cantidad_inicial) / 12 AS inversion_mensual,
          MIN(b.fecha_inicio) AS fecha_inicio,
          MAX(b.fecha_final) AS fecha_final
        FROM Bolsa b
        WHERE b.id_Bolsa IN (
          SELECT bi.id_BolsaFK
          FROM Bolsa_Inversion bi
        )
        AND b.id_DepartamentoFK = ?
        ${yearFilter}
        GROUP BY b.id_DepartamentoFK
      `, [departamentoId]);
      
      if (inversionRows.length > 0) {
        result.inversion = inversionRows[0];
      }
      
      // Obtener gasto en inversión
      const [gastoInversionRows] = await pool.query(`
        SELECT 
          SUM(o.Importe) AS total_gasto
        FROM Orden o
        JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
        WHERE o.id_DepartamentoFK = ?
        ${year ? 'AND YEAR(o.Fecha) = ?' : ''}
      `, year ? [departamentoId, year] : [departamentoId]);
      
      result.gastoInversion = gastoInversionRows[0]?.total_gasto || 0;
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo bolsas recientes:', error);
    return NextResponse.json(
      { error: 'Error obteniendo bolsas recientes: ' + error.message },
      { status: 500 }
    );
  }
}