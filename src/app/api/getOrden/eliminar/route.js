// src/app/api/getOrden/eliminar/route.js
import { pool } from '@/app/api/lib/db'

// POST - Eliminar órdenes seleccionadas
export async function POST(req) {
  try {
    const data = await req.json();
    const { ids } = data;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: "Se requiere un array de IDs" }, 
        { status: 400 }
      );
    }
    
    console.log("IDs a eliminar:", ids);
    
    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Preparar consulta con marcadores de posición individuales
      const placeholders = ids.map(() => '?').join(',');
      
      // Eliminar facturas asociadas
      await connection.query(
        `DELETE FROM Factura WHERE idOrdenFK IN (${placeholders})`,
        ids
      );
      
      // Eliminar de Orden_Inversion
      await connection.query(
        `DELETE FROM Orden_Inversion WHERE idOrden IN (${placeholders})`,
        ids
      );
      
      // Eliminar de Orden_Compra
      await connection.query(
        `DELETE FROM Orden_Compra WHERE idOrden IN (${placeholders})`,
        ids
      );
      
      // Eliminar órdenes
      const [result] = await connection.query(
        `DELETE FROM Orden WHERE idOrden IN (${placeholders})`,
        ids
      );
      
      // Confirmar transacción
      await connection.commit();
      
      return Response.json({ 
        success: true, 
        deletedCount: result.affectedRows,
        message: `${result.affectedRows} orden(es) eliminada(s) correctamente`
      });
      
    } catch (error) {
      // Rollback en caso de error
      await connection.rollback();
      console.error("Error en la transacción:", error);
      throw error;
    } finally {
      // Liberar conexión
      connection.release();
    }
  } catch (err) {
    console.error("Error al eliminar órdenes:", err);
    return Response.json(
      { success: false, error: err.message || "Error al procesar la solicitud" }, 
      { status: 500 }
    );
  }
}