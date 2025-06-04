import { pool } from '@/app/api/lib/db';
import { NextResponse } from 'next/server';

// POST - Crear una nueva relación proveedor-departamento
export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.proveedorId || !data.departamentoId) {
      return NextResponse.json(
        { error: "Se requiere ID de proveedor y departamento" },
        { status: 400 }
      );
    }
    
    // Verificar si la relación ya existe
    const [existingRelations] = await pool.query(
      'SELECT * FROM Proveedor_Departamento WHERE idProveedorFK = ? AND idDepartamentoFK = ?',
      [data.proveedorId, data.departamentoId]
    );
    
    // Si ya existe, no hacemos nada y retornamos éxito
    if (existingRelations.length > 0) {
      return NextResponse.json({ 
        message: "La relación ya existe",
        exists: true
      });
    }
    
    // Insertar nueva relación
    await pool.query(
      `INSERT INTO Proveedor_Departamento (
        idProveedorFK, 
        idDepartamentoFK, 
        Propio, 
        Fecha_vinculacion
      ) VALUES (?, ?, ?, CURDATE())`,
      [
        data.proveedorId, 
        data.departamentoId, 
        data.propio || 1
      ]
    );
    
    return NextResponse.json({ 
      message: "Relación creada correctamente",
      success: true
    });
    
  } catch (error) {
    console.error("Error al crear relación proveedor-departamento:", error);
    return NextResponse.json(
      { error: "Error al crear relación: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una relación específica
export async function DELETE(request) {
  try {
    const data = await request.json();
    
    if (!data.proveedorId || !data.departamentoId) {
      return NextResponse.json(
        { error: "Se requiere ID de proveedor y departamento" },
        { status: 400 }
      );
    }
    
    // Eliminar la relación
    const [result] = await pool.query(
      'DELETE FROM Proveedor_Departamento WHERE idProveedorFK = ? AND idDepartamentoFK = ?',
      [data.proveedorId, data.departamentoId]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "No se encontró la relación especificada" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: "Relación eliminada correctamente",
      success: true
    });
    
  } catch (error) {
    console.error("Error al eliminar relación proveedor-departamento:", error);
    return NextResponse.json(
      { error: "Error al eliminar relación: " + error.message },
      { status: 500 }
    );
  }
}