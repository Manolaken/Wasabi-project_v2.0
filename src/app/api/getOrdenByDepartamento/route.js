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
    
    // Consulta para obtener las órdenes específicas del departamento
    const [rows] = await pool.query(`
      SELECT 
        o.idOrden,
        o.Num_orden,
        o.Fecha,
        o.Descripcion,
        o.Inventariable,
        o.Cantidad,
        o.Importe,
        d.Nombre AS Departamento,
        p.Nombre AS Proveedor,
        oi.Num_inversion
      FROM Orden o
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
      LEFT JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
      WHERE o.id_DepartamentoFK = ?
    `, [departamentoId]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error obteniendo órdenes del departamento:', error);
    return NextResponse.json(
      { error: 'Error obteniendo órdenes del departamento' },
      { status: 500 }
    );
  }
}