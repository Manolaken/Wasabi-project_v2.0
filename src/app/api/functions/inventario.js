import { pool } from '@/app/api/lib/db';

export async function getInventarioConfirmado() {
  try {
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
        oi.Num_inversion,
        eo.tipo AS Estado
      FROM Orden o
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Proveedor p ON p.idProveedor = o.id_ProveedorFK
      LEFT JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
      LEFT JOIN Estado_orden eo ON o.id_EstadoOrdenFK = eo.id_EstadoOrden
      WHERE eo.tipo = 'Confirmada'
        
    `);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}