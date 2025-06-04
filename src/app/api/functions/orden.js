import { pool } from '@/app/api/lib/db';

export async function getOrden() {
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
        o.Factura, 
        d.Nombre AS Departamento,
        p.Nombre AS Proveedor,
        oi.Num_inversion,
        eo.tipo AS Estado
      FROM Orden o
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Proveedor p ON p.idProveedor = o.id_ProveedorFK
      LEFT JOIN Orden_Inversion oi ON o.idOrden = oi.idOrden
      LEFT JOIN Estado_orden eo ON o.id_EstadoOrdenFK = eo.id_EstadoOrden
      ORDER BY o.idOrden DESC
    `);

    console.log("📋 Total órdenes cargadas:", rows.length);

    // Debug: Mostrar información detallada de las inversiones
    const ordenesConInversion = rows.filter(r => r.Num_inversion !== null);
    const ordenesSinInversion = rows.filter(r => r.Num_inversion === null);

    console.log("💰 Órdenes CON inversión:", ordenesConInversion.length);
    console.log("📋 Órdenes SIN inversión:", ordenesSinInversion.length);

    if (ordenesConInversion.length > 0) {
      console.log("🔍 Ejemplos de órdenes con inversión:");
      ordenesConInversion.slice(0, 3).forEach(orden => {
        console.log(`  - ID: ${orden.idOrden}, Num_orden: ${orden.Num_orden}, Num_inversion: ${orden.Num_inversion}`);
      });
    }

    return rows;
  } catch (error) {
    console.error('❌ Error executing query:', error);
    throw error;
  }
}