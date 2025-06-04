import { pool } from '@/app/api/lib/db';

export async function getResumenPresupuesto(idDepartamento, año) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.id_DepartamentoFK,
        SUM(b.cantidad_inicial) AS total_presupuesto,
        MIN(b.fecha_inicio) AS fecha_inicio,
        MAX(b.fecha_final) AS fecha_final
      FROM Bolsa b
      WHERE b.id_Bolsa IN (
        SELECT bp.id_BolsaFK
        FROM Bolsa_Presupuesto bp
      )
      AND b.id_DepartamentoFK = ?
      AND YEAR(b.fecha_inicio) = ?
      GROUP BY b.id_DepartamentoFK
    `,
    [idDepartamento, año]);
    
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export async function getResumenInversion(idDepartamento, año) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.id_DepartamentoFK,
        SUM(b.cantidad_inicial) AS total_inversion,
        MIN(b.fecha_inicio) AS fecha_inicio,
        MAX(b.fecha_final) AS fecha_final
      FROM Bolsa b
      WHERE b.id_Bolsa IN (
        SELECT bi.id_BolsaFK
        FROM Bolsa_Inversion bi
      )
      AND b.id_DepartamentoFK = ?
      AND YEAR(b.fecha_inicio) = ?
      GROUP BY b.id_DepartamentoFK
    `,
      [idDepartamento, año]);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export async function getResumenOrden(idDepartamento) {
  try {
    const [rows] = await pool.query(`      
      SELECT
        o.*,
        d.Nombre AS Departamento,
        p.Nombre AS Proveedor,
        GROUP_CONCAT(oi.Num_inversion SEPARATOR ', ') AS Num_inversion
      FROM Orden o
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Proveedor p ON p.idProveedor = o.id_ProveedorFK
      LEFT JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
      WHERE o.id_DepartamentoFK = ?
      GROUP BY o.idOrden
    `, [idDepartamento]);

    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export async function getResumenGasto(idDepartamento) {
  try {
    // Mejorar la consulta para obtener datos correctos
    const [rows] = await pool.query(`
      SELECT 
        o.id_DepartamentoFK,
        SUM(o.Importe) AS total_importe
      FROM Orden o
      LEFT JOIN Orden_Compra oc ON o.idOrden = oc.idOrden
      WHERE o.id_DepartamentoFK = ?
      AND o.id_EstadoOrdenFK = 3 -- Solo órdenes confirmadas
      GROUP BY o.id_DepartamentoFK
    `, [idDepartamento]);

    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    return [{ total_importe: 0 }]; // Valor por defecto en caso de error
  }
}

export async function getResumenInversionAcum(idDepartamento) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.id_DepartamentoFK,
        SUM(o.Importe) AS Total_Importe
      FROM 
          Orden o
      INNER JOIN 
          Orden_Inversion oi ON o.idOrden = oi.idOrden
          WHERE o.id_DepartamentoFK = ?
      GROUP BY 
          o.id_DepartamentoFK;
    `, [idDepartamento]);

    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}
