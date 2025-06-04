import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";
import { validateNIF } from "@/app/utils/validations";

// Función de validación de email para el backend
const validateEmailBackend = (email) => {
  if (!email || email.trim().length === 0) {
    return { valid: true, formatted: null }; // Email es opcional
  }
  
  const cleanEmail = email.trim().toLowerCase();
  
  // Verificar longitud máxima
  if (cleanEmail.length > 255) {
    return { valid: false, error: "El email es demasiado largo (máximo 255 caracteres)" };
  }
  
  // Patrón de validación de email
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailPattern.test(cleanEmail)) {
    return { valid: false, error: "El formato del email no es válido (ejemplo: usuario@dominio.com)" };
  }
  
  // Validaciones adicionales
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: "El email debe contener exactamente un símbolo @" };
  }
  
  const [localPart, domain] = parts;
  
  if (localPart.length === 0 || domain.length === 0) {
    return { valid: false, error: "El email debe tener texto antes y después del símbolo @" };
  }
  
  if (!domain.includes('.')) {
    return { valid: false, error: "El dominio debe contener al menos un punto (ejemplo: gmail.com)" };
  }
  
  return { valid: true, formatted: cleanEmail };
};

// PUT - Actualizar un proveedor específico
export async function PUT(request, { params }) {
  try {
    const awaitedParams = await params;
    const proveedorId = awaitedParams.id;
    const data = await request.json();
    
    // Validar datos obligatorios
    if (!data.nombre || !data.nif || !data.departamento) {
      return NextResponse.json({
        error: "Nombre, NIF y departamento son campos obligatorios"
      }, { status: 400 });
    }
    
    // Validar longitud del nombre
    if (data.nombre.trim().length > 100) {
      return NextResponse.json({ 
        error: "El nombre es demasiado largo (máximo 100 caracteres)" 
      }, { status: 400 });
    }
    
    // Validar NIF/CIF
    const nifValidation = validateNIF(data.nif);
    if (!nifValidation.valid) {
      return NextResponse.json({ 
        error: nifValidation.error 
      }, { status: 400 });
    }
    
    // Validar email (si se proporciona)
    let emailFormatted = null;
    if (data.email && data.email.trim().length > 0) {
      const emailValidation = validateEmailBackend(data.email);
      if (!emailValidation.valid) {
        return NextResponse.json({ 
          error: emailValidation.error 
        }, { status: 400 });
      }
      emailFormatted = emailValidation.formatted;
    }
    
    // Validar dirección
    if (data.direccion && data.direccion.length > 200) {
      return NextResponse.json({ 
        error: "La dirección es demasiado larga (máximo 200 caracteres)" 
      }, { status: 400 });
    }
    
    // Comenzar una transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Verificar si ya existe otro proveedor con el mismo NIF (excluyendo el actual)
      const [existingNIF] = await connection.query(
        'SELECT idProveedor FROM Proveedor WHERE NIF = ? AND idProveedor != ?',
        [nifValidation.formatted, proveedorId]
      );
      
      if (existingNIF.length > 0) {
        await connection.rollback();
        return NextResponse.json({ 
          error: "Ya existe otro proveedor con este NIF/CIF" 
        }, { status: 400 });
      }
      
      // Verificar si ya existe otro proveedor con el mismo email (si se proporciona)
      if (emailFormatted) {
        const [existingEmail] = await connection.query(
          'SELECT idProveedor FROM Proveedor WHERE Email = ? AND idProveedor != ?',
          [emailFormatted, proveedorId]
        );
        
        if (existingEmail.length > 0) {
          await connection.rollback();
          return NextResponse.json({ 
            error: "Ya existe otro proveedor con este email" 
          }, { status: 400 });
        }
      }
      
      // Actualizar los datos del proveedor
      await connection.query(`
        UPDATE Proveedor 
        SET Nombre = ?, NIF = ?, Direccion = ?, Telefono = ?, Email = ?
        WHERE idProveedor = ?
      `, [
        data.nombre.trim(),
        nifValidation.formatted,
        data.direccion?.trim() || null,
        data.telefono?.trim() || null,
        emailFormatted,
        proveedorId
      ]);
      
      // Buscar el departamento por nombre
      const [deptResult] = await connection.query(
        'SELECT id_Departamento FROM Departamento WHERE Nombre = ?',
        [data.departamento]
      );
      
      if (deptResult.length === 0) {
        await connection.rollback();
        return NextResponse.json({ 
          error: "Departamento no encontrado" 
        }, { status: 404 });
      }
      
      const departamentoId = deptResult[0].id_Departamento;
      
      // Actualizar en la tabla Proveedor_Departamento
      const [existingRelation] = await connection.query(
        `SELECT * FROM Proveedor_Departamento WHERE idProveedorFK = ?`,
        [proveedorId]
      );
      
      if (existingRelation.length > 0) {
        // Actualizar relación existente
        await connection.query(
          `UPDATE Proveedor_Departamento
           SET idDepartamentoFK = ?
           WHERE idProveedorFK = ?`,
          [departamentoId, proveedorId]
        );
      } else {
        // Crear nueva relación
        await connection.query(
          `INSERT INTO Proveedor_Departamento (idProveedorFK, idDepartamentoFK, Propio, Fecha_vinculacion)
           VALUES (?, ?, 1, CURDATE())`,
          [proveedorId, departamentoId]
        );
      }
      
      // Confirmar la transacción
      await connection.commit();
      
      return NextResponse.json({ 
        id: proveedorId, 
        message: "Proveedor actualizado correctamente" 
      });
      
    } catch (error) {
      // Si hay error, hacer rollback
      await connection.rollback();
      
      // Manejar errores específicos de la base de datos
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        if (error.message.includes('NIF')) {
          return NextResponse.json({ 
            error: "Ya existe otro proveedor con este NIF/CIF" 
          }, { status: 400 });
        } else if (error.message.includes('Email')) {
          return NextResponse.json({ 
            error: "Ya existe otro proveedor con este email" 
          }, { status: 400 });
        } else {
          return NextResponse.json({ 
            error: "Ya existe otro proveedor con esos datos" 
          }, { status: 400 });
        }
      }
      
      if (error.code === 'ER_DATA_TOO_LONG' || error.errno === 1406) {
        return NextResponse.json({ 
          error: "Uno de los datos introducidos es demasiado largo para la base de datos" 
        }, { status: 400 });
      }
      
      throw error;
    } finally {
      // Liberar la conexión
      connection.release();
    }
    
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    return NextResponse.json(
      { error: "Error al actualizar proveedor: " + error.message },
      { status: 500 }
    );
  }
}