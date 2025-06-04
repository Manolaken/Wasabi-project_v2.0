import { pool } from '@/app/api/lib/db';

export async function getFacturas() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        f.idFactura,
        f.Num_factura,
        f.Fecha_emision,
        f.Ruta_pdf,
        o.Num_orden,
        o.Importe, 
        p.Nombre AS Proveedor,
        d.Nombre AS Departamento,
        e.Tipo AS Estado
      FROM Factura f
      JOIN Orden o ON f.idOrdenFK = o.idOrden
      JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Estado e ON f.idEstadoFK = e.idEstado
    `);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export async function updateFacturaEstado(facturaId, estadoId) {
  try {
    const [result] = await pool.query(
      'UPDATE Factura SET idEstadoFK = ? WHERE idFactura = ?',
      [estadoId, facturaId]
    );
    return { success: true, message: "Estado de factura actualizado correctamente" };
  } catch (error) {
    console.error('Error updating factura estado:', error);
    throw error;
  }
}

export async function updateFactura(facturaId, facturaData) {
  try {
    // Construir query dinámica con los campos proporcionados
    let updateFields = [];
    let values = [];
    
    if (facturaData.num_factura) {
      updateFields.push('Num_factura = ?');
      values.push(facturaData.num_factura);
    }
    
    if (facturaData.fecha_emision) {
      updateFields.push('Fecha_emision = ?');
      values.push(facturaData.fecha_emision);
    }
    
    if (facturaData.estado) {
      // Obtener ID del estado a partir del nombre
      const [estados] = await pool.query('SELECT idEstado FROM Estado WHERE Tipo = ?', [facturaData.estado]);
      if (estados.length > 0) {
        updateFields.push('idEstadoFK = ?');
        values.push(estados[0].idEstado);
      }
    }
    
    if (facturaData.ruta_pdf) {
      updateFields.push('Ruta_pdf = ?');
      values.push(facturaData.ruta_pdf);
    }
    
    // Si no hay campos para actualizar, retornar
    if (updateFields.length === 0) {
      return { success: false, message: "No hay datos para actualizar" };
    }
    
    // Añadir ID de factura al final de los valores
    values.push(facturaId);
    
    // Construir y ejecutar la query
    const query = `UPDATE Factura SET ${updateFields.join(', ')} WHERE idFactura = ?`;
    const [result] = await pool.query(query, values);
    
    return { 
      success: true, 
      message: "Factura actualizada correctamente",
      affectedRows: result.affectedRows
    };
  } catch (error) {
    console.error('Error updating factura:', error);
    throw error;
  }
}

export async function getFacturaById(facturaId) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        f.idFactura,
        f.Num_factura,
        f.Fecha_emision,
        f.Ruta_pdf,
        o.Num_orden,
        o.idOrden,
        o.Importe,
        p.Nombre AS Proveedor,
        d.Nombre AS Departamento,
        e.Tipo AS Estado,
        e.idEstado AS idEstado
      FROM Factura f
      JOIN Orden o ON f.idOrdenFK = o.idOrden
      JOIN Proveedor p ON o.id_ProveedorFK = p.idProveedor
      JOIN Departamento d ON o.id_DepartamentoFK = d.id_Departamento
      JOIN Estado e ON f.idEstadoFK = e.idEstado
      WHERE f.idFactura = ?
    `, [facturaId]);
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching factura:', error);
    throw error;
  }
}