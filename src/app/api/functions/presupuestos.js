import { pool } from '@/app/api/lib/db';

export async function getPresupuestoMensual(idDepartamento, año = null) {
  try {
    // Construir la consulta base
    let query = `
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
    `;
    
    const params = [idDepartamento];
    
    // Si se proporciona un año, filtrar por él
    if (año !== null) {
      query += ` AND YEAR(b.fecha_inicio) = ?`;
      params.push(año);
    }
    
    query += ` GROUP BY b.id_DepartamentoFK`;
    
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}