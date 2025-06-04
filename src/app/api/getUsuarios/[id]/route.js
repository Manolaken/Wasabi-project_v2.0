import { NextResponse } from "next/server";
import { pool } from "@/app/api/lib/db";

// GET - Obtener un usuario específico
export async function GET(request, { params }) {
  try {
    const awaitedParams = await params;
    const userId = awaitedParams.id;

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
    `, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 });
  }
}

// PUT - Actualizar un usuario específico
export async function PUT(request, { params }) {
  let connection;
  
  try {
    const awaitedParams = await params;
    const userId = awaitedParams.id;
    const userData = await request.json();

    console.log("✅ Datos recibidos para actualizar usuario:", userId, userData);

    // Validar datos obligatorios
    const camposObligatorios = ['Nombre', 'Apellidos', 'Email', 'id_RolFK'];
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

    // Verificar si el usuario existe
    const [userCheck] = await connection.query('SELECT idUsuario FROM Usuario WHERE idUsuario = ?', [userId]);
    if (userCheck.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar duplicados (excluir el usuario actual)
    console.log("🔍 Verificando DNI duplicado...");
    if (userData.DNI) {
      const [existingDNI] = await connection.query(
        'SELECT idUsuario FROM Usuario WHERE DNI = ? AND idUsuario != ?', 
        [userData.DNI, userId]
      );
      if (existingDNI.length > 0) {
        return NextResponse.json({ error: "Ya existe otro usuario con este DNI" }, { status: 400 });
      }
    }

    console.log("🔍 Verificando email duplicado...");
    const [existingEmail] = await connection.query(
      'SELECT idUsuario FROM Usuario WHERE Email = ? AND idUsuario != ?', 
      [userData.Email, userId]
    );
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Ya existe otro usuario con este email" }, { status: 400 });
    }

    // Verificar que el rol existe
    console.log("🔍 Verificando rol...");
    const [rolCheck] = await connection.query('SELECT Tipo FROM Rol WHERE idRol = ?', [userData.id_RolFK]);
    if (rolCheck.length === 0) {
      return NextResponse.json({ error: "El rol especificado no existe" }, { status: 400 });
    }

    console.log("✅ Validaciones pasadas, actualizando usuario...");

    // Comenzar transacción
    await connection.beginTransaction();

    try {
      // 1. Actualizar la información del usuario
      let query = `
        UPDATE Usuario 
        SET Nombre = ?, Apellidos = ?, Telefono = ?, Direccion = ?, Email = ?, id_RolFK = ?
      `;

      let queryParams = [
        userData.Nombre,
        userData.Apellidos,
        userData.Telefono || null,
        userData.Direccion || null,
        userData.Email,
        userData.id_RolFK
      ];

      // Solo agregar DNI si se proporciona
      if (userData.DNI && userData.DNI.trim() !== '') {
        query = `
          UPDATE Usuario 
          SET DNI = ?, Nombre = ?, Apellidos = ?, Telefono = ?, Direccion = ?, Email = ?, id_RolFK = ?
        `;
        queryParams = [
          userData.DNI,
          userData.Nombre,
          userData.Apellidos,
          userData.Telefono || null,
          userData.Direccion || null,
          userData.Email,
          userData.id_RolFK
        ];
      }

      // Si se proporciona una contraseña, actualizarla
      if (userData.Contrasena && userData.Contrasena.trim() !== '') {
        if (userData.DNI && userData.DNI.trim() !== '') {
          query = `
            UPDATE Usuario 
            SET DNI = ?, Nombre = ?, Apellidos = ?, Telefono = ?, Direccion = ?, Email = ?, id_RolFK = ?, Contrasena = ?
          `;
          queryParams.push(userData.Contrasena);
        } else {
          query = `
            UPDATE Usuario 
            SET Nombre = ?, Apellidos = ?, Telefono = ?, Direccion = ?, Email = ?, id_RolFK = ?, Contrasena = ?
          `;
          queryParams.push(userData.Contrasena);
        }
      }

      // Completar la query con el WHERE
      query += ` WHERE idUsuario = ?`;
      queryParams.push(userId);

      console.log("📝 Query de actualización:", query);
      console.log("📝 Parámetros:", queryParams);

      await connection.query(query, queryParams);

      // 2. Obtener información del rol actualizado
      const rolTipo = rolCheck[0]?.Tipo;

      // 3. Eliminar permisos existentes
      await connection.query('DELETE FROM Permiso WHERE id_UsuarioFK = ?', [userId]);

      // 4. Configurar nuevos permisos basados en el rol
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
        if (userData.Departamento) {
          const [deptResult] = await connection.query(
            'SELECT id_Departamento FROM Departamento WHERE Nombre = ?', 
            [userData.Departamento]
          );

          if (deptResult.length > 0) {
            await connection.query(`
              INSERT INTO Permiso (id_UsuarioFK, id_DepFK, Puede_editar, Puede_ver, Fecha_asignacion)
              VALUES (?, ?, 1, 1, CURDATE())
            `, [userId, deptResult[0].id_Departamento]);
          }
        }
      }

        // Confirmar la transacción
      await connection.commit();
      console.log("✅ Usuario actualizado correctamente");

      return NextResponse.json({
        id: userId,
        message: "Usuario actualizado exitosamente"
      });

    } catch (transactionError) {
      // Si hay error en la transacción, hacer rollback
      await connection.rollback();
      console.error("❌ Error en la transacción:", transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error("❌ Error completo en PUT:", error);
    console.error("❌ Stack trace:", error.stack);

    // Si hay conexión y error, hacer rollback
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("❌ Error en rollback:", rollbackError);
      }
    }

    // Manejar específicamente los errores de duplicados
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('DNI')) {
        return NextResponse.json({ error: "Ya existe otro usuario con este DNI" }, { status: 400 });
      } else if (error.message.includes('Email')) {
        return NextResponse.json({ error: "Ya existe otro usuario con este email" }, { status: 400 });
      } else {
        return NextResponse.json({ error: "Ya existe otro usuario con estos datos" }, { status: 400 });
      }
    }

    // Error genérico
    return NextResponse.json({ 
      error: "Error interno: " + (error.message || "Error desconocido")
    }, { status: 500 });

  } finally {
    // Liberar la conexión
    if (connection) {
      try {
        connection.release();
        console.log("🔐 Conexión liberada");
      } catch (releaseError) {
        console.error("❌ Error liberando conexión:", releaseError);
      }
    }
  }
}

// DELETE - Eliminar un usuario específico
export async function DELETE(request, { params }) {
  try {
    const awaitedParams = await params;
    const userId = awaitedParams.id;

    // Comenzar una transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Eliminar permisos asociados
      await connection.query('DELETE FROM Permiso WHERE id_UsuarioFK = ?', [userId]);

      // 2. Eliminar el usuario
      const [result] = await connection.query('DELETE FROM Usuario WHERE idUsuario = ?', [userId]);

      // Confirmar la transacción
      await connection.commit();

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      return NextResponse.json({
        message: "Usuario eliminado exitosamente"
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
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: "Error al eliminar usuario: " + error.message }, { status: 500 });
  }
}