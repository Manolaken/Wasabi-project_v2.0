// src/app/api/getOrden/[id]/route.js
import { pool } from '@/app/api/lib/db';

export async function PUT(request, { params }) {
  try {
    const awaitedParams = await params;
    const ordenId = awaitedParams.id;
    const data = await request.json();

    console.log("📥 Datos recibidos para actualizar orden:", data);

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
    } = data;

    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Actualizar la orden principal
      console.log("🔄 Actualizando orden principal...");
      await connection.query(
        `UPDATE Orden 
        SET Num_orden = ?, id_ProveedorFK = ?, id_DepartamentoFK = ?, id_UsuarioFK = ?,
            Importe = ?, Fecha = ?, Descripcion = ?, Inventariable = ?, Cantidad = ?, 
            id_EstadoOrdenFK = ?, tiene_factura = ?, numero_factura = ?
        WHERE idOrden = ?`,
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
          id_EstadoOrdenFK,
          tiene_factura || 0, // Campo actualizado para v2.0
          numero_factura || null, // Campo actualizado para v2.0
          ordenId
        ]
      );

      // 2. LIMPIAR registros previos
      console.log("🧹 Limpiando registros previos...");
      await connection.query('DELETE FROM Orden_Inversion WHERE idOrden = ?', [ordenId]);
      await connection.query('DELETE FROM Orden_Compra WHERE idOrden = ?', [ordenId]);

      // 3. MANEJAR INVERSIONES
      console.log("💰 Procesando inversión...", { Num_inversion });
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
          idOrden: ordenId,
          id_InversionFK: bolsaInversionId,
          Num_inversion: parseInt(Num_inversion)
        });

        await connection.query(
          'INSERT INTO Orden_Inversion (idOrden, id_InversionFK, Num_inversion) VALUES (?, ?, ?)',
          [ordenId, bolsaInversionId, parseInt(Num_inversion)]
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
          idOrden: ordenId,
          id_PresupuestoFK: bolsaPresupuestoId
        });

        await connection.query(
          'INSERT INTO Orden_Compra (idOrden, id_PresupuestoFK) VALUES (?, ?)',
          [ordenId, bolsaPresupuestoId]
        );
      }

      // Confirmar transacción
      await connection.commit();
      console.log("✅ Orden actualizada correctamente");

      return new Response(JSON.stringify({
        success: true,
        message: "Orden actualizada correctamente",
        updatedId: ordenId,
        isInversion: !!(Num_inversion && Num_inversion.toString().trim() !== ''),
        debug: {
          Num_inversion: Num_inversion,
          tipo: Num_inversion ? 'Inversión' : 'Orden normal',
          id_DepartamentoFK
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      // Si hay error, rollback
      await connection.rollback();
      console.error("❌ Error en la transacción de actualización:", error);
      throw error;
    } finally {
      // Liberar conexión
      connection.release();
    }

  } catch (error) {
    console.error("❌ Error actualizando orden:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Error al actualizar la orden",
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}