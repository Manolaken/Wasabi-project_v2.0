import { pool } from '@/app/api/lib/db';

export async function getRol() {
  try {
    const [rows] = await pool.query('SELECT * FROM Rol');
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}