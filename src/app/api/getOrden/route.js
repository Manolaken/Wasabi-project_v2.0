// src/app/api/getOrden/route.js
import { pool } from '@/app/api/lib/db'

export async function POST(req) {
  try {
    const data = await req.json()
    console.log("📥 Datos recibidos para crear orden:", data);

    const {
      Num_orden,
      Importe,
      Fecha,
      Descripcion,
      Inventariable,
      Cantidad,
      id_DepartamentoFK,
      id_ProveedorFK,
      id_UsuarioFK,
      id_EstadoOrdenFK,
      Num_inversion,
      tiene_factura,
      numero_factura
    } = data

    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Insertamos en Orden
      console.log("➕ Creando nueva orden...");
      const [ordenResult] = await connection.query(
        `INSERT INTO Orden (
          Num_orden, id_ProveedorFK, id_DepartamentoFK, id_UsuarioFK,
          Importe, Fecha, Descripcion, Inventariable, Cantidad, 
          id_EstadoOrdenFK, tiene_factura, numero_factura
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Num_orden,
          id_ProveedorFK,
          id_DepartamentoFK,
          id_UsuarioFK,
          Importe,
          Fecha,
          Descripcion,
          Inventariable,
          Cantidad,
          id_EstadoOrdenFK || 1, // Usar 1 (En proceso) como valor predeterminado
          tiene_factura || 0, // Campo actualizado para v2.0
          numero_factura || null // Campo actualizado para v2.0
        ]
      )

      const idOrdenNuevo = ordenResult.insertId;
      console.log("✅ Orden creada con ID:", idOrdenNuevo);

      // 2. MANEJAR INVERSIONES vs ÓRDENES NORMALES
      console.log("💰 Procesando tipo de orden...", { Num_inversion });

      if (Num_inversion && Num_inversion.toString().trim() !== '') {
        // Es una inversión

        // Buscar el idBolsa correspondiente a la inversión del departamento
        const [bolsaInversion] = await connection.query(`
          SELECT bi.idBolsa 
          FROM Bolsa_Inversion bi 
          JOIN Bolsa b ON bi.id_BolsaFK = b.id_Bolsa 
          WHERE b.id_DepartamentoFK = ?
        `, [id_DepartamentoFK]);

        if (bolsaInversion.length === 0) {
          throw new Error(`No se encontró bolsa de inversión para el departamento ${id_DepartamentoFK}`);
        }

        const bolsaInversionId = bolsaInversion[0].idBolsa;

        console.log("✅ Insertando en Orden_Inversion:", {
          idOrden: idOrdenNuevo,
          id_InversionFK: bolsaInversionId,
          Num_inversion: parseInt(Num_inversion)
        });

        await connection.query(
          `INSERT INTO Orden_Inversion (idOrden, id_InversionFK, Num_inversion)
           VALUES (?, ?, ?)`,
          [idOrdenNuevo, bolsaInversionId, parseInt(Num_inversion)]
        );
      } else {
        // NO es inversión - insertar en Orden_Compra

        // Buscar el idBolsa correspondiente al presupuesto del departamento
        const [bolsaPresupuesto] = await connection.query(`
          SELECT bp.idBolsa 
          FROM Bolsa_Presupuesto bp 
          JOIN Bolsa b ON bp.id_BolsaFK = b.id_Bolsa 
          WHERE b.id_DepartamentoFK = ?
        `, [id_DepartamentoFK]);

        if (bolsaPresupuesto.length === 0) {
          throw new Error(`No se encontró bolsa de presupuesto para el departamento ${id_DepartamentoFK}`);
        }

        const bolsaPresupuestoId = bolsaPresupuesto[0].idBolsa;

        console.log("📋 Insertando en Orden_Compra:", {
          idOrden: idOrdenNuevo,
          id_PresupuestoFK: bolsaPresupuestoId
        });

        await connection.query(
          `INSERT INTO Orden_Compra (idOrden, id_PresupuestoFK)
           VALUES (?, ?)`,
          [idOrdenNuevo, bolsaPresupuestoId]
        );
      }

      // Confirmar transacción
      await connection.commit();
      console.log("✅ Orden creada correctamente");

      return Response.json({
        success: true,
        insertedId: idOrdenNuevo,
        isInversion: !!(Num_inversion && Num_inversion.toString().trim() !== ''),
        debug: {
          Num_inversion: Num_inversion,
          tipo: Num_inversion ? 'Inversión' : 'Orden normal'
        }
      });

    } catch (error) {
      // Si hay error, rollback
      await connection.rollback();
      console.error("❌ Error en la transacción de creación:", error);
      throw error;
    } finally {
      // Liberar conexión
      connection.release();
    }

  } catch (err) {
    console.error("❌ Error al crear orden:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || "Error al crear la orden"
    }), { status: 500 });
  }
}