// File: src/app/api/functions/usuarios.js
// Esta función hace llamadas a la API para gestionar usuarios
import { pool } from "@/app/api/lib/db";

export async function getUsuariosConPermisos() {
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
    return rows;
  } catch (error) {
    console.error('Error obteniendo usuarios con permisos:', error);
    throw error;
  }
}

export async function getUsuarioPorId(id) {
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
        u.id_RolFK,
        r.Tipo AS Rol,
        CASE
          WHEN r.Tipo = 'Administrador' THEN 'Admin'
          WHEN r.Tipo = 'Contable' THEN 'Contable'
          ELSE MAX(d.Nombre)
        END AS Departamento
      FROM Usuario u
      JOIN Rol r ON u.id_RolFK = r.idRol
      LEFT JOIN Permiso p ON u.idUsuario = p.id_UsuarioFK
      LEFT JOIN Departamento d ON p.id_DepFK = d.id_Departamento
      WHERE u.idUsuario = ?
      GROUP BY u.idUsuario, u.DNI, u.Nombre, u.Apellidos, u.Telefono, u.Direccion, u.Email, u.id_RolFK, r.Tipo
    `, [id]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    throw error;
  }
}

export async function addUsuario(usuario) {
  // Comenzar una transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. Insertar el usuario
    const [userResult] = await connection.query(`
      INSERT INTO Usuario (DNI, Nombre, Apellidos, Telefono, Direccion, Contrasena, Email, id_RolFK)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usuario.DNI,
      usuario.Nombre,
      usuario.Apellidos,
      usuario.Telefono || null,
      usuario.Direccion || null,
      usuario.Contrasena,
      usuario.Email,
      usuario.id_RolFK
    ]);
    
    const userId = userResult.insertId;
    
    // 2. Obtener información del rol
    const [rolResult] = await connection.query('SELECT Tipo FROM Rol WHERE idRol = ?', [usuario.id_RolFK]);
    const rolTipo = rolResult[0]?.Tipo;
    
    // 3. Configurar permisos basados en el rol
    if (rolTipo === 'Administrador') {
      // Admin tiene acceso a todos los departamentos
      const [depts] = await connection.query('SELECT id_Departamento FROM Departamento');
      
      for (const dept of depts) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 1, 1, CURDATE())
        `, [userId, dept.id_Departamento]);
      }
    } else if (rolTipo === 'Contable') {
      // Contable puede ver todos los departamentos
      const [depts] = await connection.query('SELECT id_Departamento FROM Departamento');
      
      for (const dept of depts) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 0, 1, CURDATE())
        `, [userId, dept.id_Departamento]);
      }
    } else if (rolTipo === 'Jefe de Departamento') {
      // Jefe tiene acceso solo a su departamento
      // Necesitamos obtener el ID del departamento basado en el nombre
      const [deptResult] = await connection.query('SELECT id_Departamento FROM Departamento WHERE Nombre = ?', [usuario.Departamento]);
      
      if (deptResult.length > 0) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 1, 1, CURDATE())
        `, [userId, deptResult[0].id_Departamento]);
      }
    }
    
    // Confirmar la transacción
    await connection.commit();
    
    return { id: userId, ...usuario };
    
  } catch (error) {
    // Si hay error, hacer rollback
    await connection.rollback();
    console.error("Error añadiendo usuario:", error);
    throw error;
  } finally {
    // Liberar la conexión
    connection.release();
  }
}

export async function updateUsuario(id, usuario) {
  // Comenzar una transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. Actualizar la información del usuario
    let query = `
      UPDATE Usuario 
      SET Nombre = ?, Apellidos = ?, Telefono = ?, Direccion = ?, Email = ?, id_RolFK = ?
    `;
    
    let params = [
      usuario.Nombre,
      usuario.Apellidos,
      usuario.Telefono || null,
      usuario.Direccion || null,
      usuario.Email,
      usuario.id_RolFK
    ];
    
    // Si se proporciona una contraseña, actualizarla
    if (usuario.Contrasena && usuario.Contrasena.trim() !== '') {
      query += `, Contrasena = ?`;
      params.push(usuario.Contrasena);
    }
    
    // Completar la query con el WHERE
    query += ` WHERE idUsuario = ?`;
    params.push(id);
    
    await connection.query(query, params);
    
    // 2. Obtener información del rol
    const [rolResult] = await connection.query('SELECT Tipo FROM Rol WHERE idRol = ?', [usuario.id_RolFK]);
    const rolTipo = rolResult[0]?.Tipo;
    
    // 3. Eliminar permisos existentes
    await connection.query('DELETE FROM Permiso WHERE id_UsuarioFK = ?', [id]);
    
    // 4. Configurar nuevos permisos basados en el rol
    if (rolTipo === 'Administrador') {
      // Admin tiene acceso a todos los departamentos
      const [depts] = await connection.query('SELECT id_Departamento FROM Departamento');
      
      for (const dept of depts) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 1, 1, CURDATE())
        `, [id, dept.id_Departamento]);
      }
    } else if (rolTipo === 'Contable') {
      // Contable puede ver todos los departamentos
      const [depts] = await connection.query('SELECT id_Departamento FROM Departamento');
      
      for (const dept of depts) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 0, 1, CURDATE())
        `, [id, dept.id_Departamento]);
      }
    } else if (rolTipo === 'Jefe de Departamento') {
      // Jefe tiene acceso solo a su departamento
      // Necesitamos obtener el ID del departamento basado en el nombre
      const [deptResult] = await connection.query('SELECT id_Departamento FROM Departamento WHERE Nombre = ?', [usuario.Departamento]);
      
      if (deptResult.length > 0) {
        await connection.query(`
          INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
          VALUES (?, ?, 1, 1, CURDATE())
        `, [id, deptResult[0].id_Departamento]);
      }
    }
    
    // Confirmar la transacción
    await connection.commit();
    
    return { id, ...usuario };
    
  } catch (error) {
    // Si hay error, hacer rollback
    await connection.rollback();
    console.error("Error actualizando usuario:", error);
    throw error;
  } finally {
    // Liberar la conexión
    connection.release();
  }
}

export async function deleteUsuarios(ids) {
  // Comenzar una transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. Eliminar permisos asociados
    await connection.query('DELETE FROM Permiso WHERE id_UsuarioFK IN (?)', [ids]);
    
    // 2. Eliminar los usuarios
    const [result] = await connection.query('DELETE FROM Usuario WHERE idUsuario IN (?)', [ids]);
    
    // Confirmar la transacción
    await connection.commit();
    
    return result.affectedRows;
    
  } catch (error) {
    // Si hay error, hacer rollback
    await connection.rollback();
    console.error("Error eliminando usuarios:", error);
    throw error;
  } finally {
    // Liberar la conexión
    connection.release();
  }
}