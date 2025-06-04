import { pool } from '@/app/api/lib/db';

export async function getProveedores() {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT
        p.idProveedor,
        p.Nombre,
        p.NIF,
        p.Direccion,
        p.Telefono,
        p.Email,
        d.Nombre AS Departamento
      FROM Proveedor p
      JOIN Proveedor_Departamento pd ON p.idProveedor = pd.idProveedorFK
      JOIN Departamento d ON pd.idDepartamentoFK = d.id_Departamento

    `);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}
