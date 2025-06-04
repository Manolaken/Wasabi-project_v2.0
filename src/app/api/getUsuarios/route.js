// File: src/app/api/getUsuarios/route.js
import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";

// GET - Obtener todos los usuarios con sus roles y permisos
export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.idUsuario,
        u.DNI,
        u.Nombre,
        u.Apellidos,
        u.Telefono,
        u.Direccion,
        u.Email,
        r.Tipo AS Rol,
        CASE
          WHEN r.Tipo = 'Administrador' THEN 'Admin'
          WHEN r.Tipo = 'Contable' THEN 'Contable'
          ELSE MAX(d.Nombre)
        END AS Departamento,
        GROUP_CONCAT(
          CASE
            WHEN p.Puede_editar = 1 AND p.Puede_ver = 1 THEN 'ver y editar'
            WHEN p.Puede_ver = 1 THEN 'ver'
            ELSE 'sin permisos'
          END
          SEPARATOR ', '
        ) AS Permisos
      FROM Usuario u
      JOIN Rol r ON u.id_RolFK = r.idRol
      LEFT JOIN Permiso p ON u.idUsuario = p.id_UsuarioFK
      LEFT JOIN Departamento d ON p.id_DepFK = d.id_Departamento
      GROUP BY u.idUsuario, u.DNI, u.Nombre, u.Apellidos, u.Telefono, u.Direccion, u.Email, r.Tipo
    `);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

// POST - Crear un nuevo usuario (versión simplificada para depurar)
export async function POST(request) {
  let connection;
  
  try {
    const userData = await request.json();
    console.log("✅ Datos recibidos en el servidor:", userData);
    
    // Validar datos obligatorios
    const camposObligatorios = ['DNI', 'Nombre', 'Apellidos', 'Email', 'id_RolFK'];
    for (const campo of camposObligatorios) {
      if (!userData[campo]) {
        console.log(`❌ Campo obligatorio faltante: ${campo}`);
        return NextResponse.json({ 
          error: `El campo ${campo} es obligatorio` 
        }, { status: 400 });
      }
    }
    
    // Obtener conexión
    connection = await pool.getConnection();
    console.log("✅ Conexión obtenida");
    
    // Verificar si ya existe el DNI
    console.log("🔍 Verificando DNI duplicado...");
    const [existingDNI] = await connection.query('SELECT idUsuario FROM Usuario WHERE DNI = ?', [userData.DNI]);
    if (existingDNI.length > 0) {
      return NextResponse.json({ error: "Ya existe un usuario con este DNI" }, { status: 400 });
    }
    
    // Verificar si ya existe el email
    console.log("🔍 Verificando email duplicado...");
    const [existingEmail] = await connection.query('SELECT idUsuario FROM Usuario WHERE Email = ?', [userData.Email]);
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
    }
    
    // Verificar que el rol existe
    console.log("🔍 Verificando rol...");
    const [rolCheck] = await connection.query('SELECT Tipo FROM Rol WHERE idRol = ?', [userData.id_RolFK]);
    if (rolCheck.length === 0) {
      return NextResponse.json({ error: "El rol especificado no existe" }, { status: 400 });
    }
    
    console.log("✅ Validaciones pasadas, insertando usuario...");
    
    // Preparar datos para inserción
    const insertData = {
      DNI: userData.DNI,
      Nombre: userData.Nombre,
      Apellidos: userData.Apellidos,
      Email: userData.Email,
      id_RolFK: userData.id_RolFK,
      Telefono: userData.Telefono || null,
      Direccion: userData.Direccion || null
    };
    
    // Solo agregar contraseña si se proporciona
    if (userData.Contrasena && userData.Contrasena.trim() !== '') {
      insertData.Contrasena = userData.Contrasena;
    }
    
    // Construir query dinámicamente
    const campos = Object.keys(insertData);
    const valores = Object.values(insertData);
    const placeholders = campos.map(() => '?').join(', ');
    
    const query = `INSERT INTO Usuario (${campos.join(', ')}) VALUES (${placeholders})`;
    console.log("📝 Query:", query);
    console.log("📝 Valores:", valores);
    
    // Ejecutar inserción
    const [result] = await connection.query(query, valores);
    const userId = result.insertId;
    
    console.log("✅ Usuario creado con ID:", userId);
    
    // Por ahora, saltamos la configuración de permisos para simplificar
    // TODO: Agregar permisos después de que funcione la inserción básica
    
    return NextResponse.json({ 
      id: userId, 
      message: "Usuario creado exitosamente" 
    });
    
  } catch (error) {
    console.error("❌ Error completo en POST:", error);
    console.error("❌ Stack trace:", error.stack);
    
    // Manejar errores específicos de MySQL
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('DNI')) {
        return NextResponse.json({ error: "Ya existe un usuario con este DNI" }, { status: 400 });
      } else if (error.message.includes('Email')) {
        return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
      }
      return NextResponse.json({ error: "Ya existe un usuario con estos datos" }, { status: 400 });
    }
    
    // Error genérico
    return NextResponse.json({ 
      error: "Error interno: " + (error.message || "Error desconocido")
    }, { status: 500 });
    
  } finally {
    // Liberar conexión
    if (connection) {
      connection.release();
      console.log("🔐 Conexión liberada");
    }
  }
}

// DELETE - Eliminar uno o varios usuarios
export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de IDs de usuarios" }, { status: 400 });
    }
    
    // Comenzar una transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. Eliminar permisos asociados a los usuarios
      await connection.query('DELETE FROM Permiso WHERE id_UsuarioFK IN (?)', [ids]);
      
      // 2. Eliminar los usuarios
      const [result] = await connection.query('DELETE FROM Usuario WHERE idUsuario IN (?)', [ids]);
      
      // Confirmar la transacción
      await connection.commit();
      
      return NextResponse.json({ 
        deletedCount: result.affectedRows,
        message: `${result.affectedRows} usuario(s) eliminado(s) exitosamente` 
      });
      
    } catch (error) {
      // Si hay error, hacer rollback
      await connection.rollback();
      throw error;
    } finally {
      // Liberar la conexión
      connection.release();
    }
    
  } catch (error) {
    console.error("Error al eliminar usuarios:", error);
    return NextResponse.json({ error: "Error al eliminar usuarios: " + error.message }, { status: 500 });
  }
}