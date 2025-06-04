import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    const tipo = searchParams.get('tipo'); // 'presupuesto' o 'inversion'
    
    if (!departamentoId) {
      return NextResponse.json(
        { error: 'ID de departamento no proporcionado' },
        { status: 400 }
      );
    }
    
    if (!tipo || (tipo !== 'presupuesto' && tipo !== 'inversion')) {
      return NextResponse.json(
        { error: 'Tipo de bolsa no válido. Debe ser "presupuesto" o "inversion"' },
        { status: 400 }
      );
    }
    
    let query;
    if (tipo === 'presupuesto') {
      // Consulta para obtener bolsas de presupuesto
      query = `
        SELECT 
          b.id_Bolsa,
          b.id_DepartamentoFK,
          b.fecha_inicio,
          b.cantidad_inicial,
          b.fecha_final
        FROM Bolsa b
        JOIN Bolsa_Presupuesto bp ON b.id_Bolsa = bp.id_BolsaFK
        WHERE b.id_DepartamentoFK = ?
        ORDER BY b.fecha_inicio DESC
      `;
    } else {
      // Consulta para obtener bolsas de inversión
      query = `
        SELECT 
          b.id_Bolsa,
          b.id_DepartamentoFK,
          b.fecha_inicio,
          b.cantidad_inicial,
          b.fecha_final
        FROM Bolsa b
        JOIN Bolsa_Inversion bi ON b.id_Bolsa = bi.id_BolsaFK
        WHERE b.id_DepartamentoFK = ?
        ORDER BY b.fecha_inicio DESC
      `;
    }
    
    const [rows] = await pool.query(query, [departamentoId]);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error(`Error obteniendo ${tipo} bolsas:`, error);
    return NextResponse.json(
      { error: `Error obteniendo ${tipo} bolsas: ${error.message}` },
      { status: 500 }
    );
  }
}