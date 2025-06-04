"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, Pencil, X, Search, Filter } from "lucide-react";
import Button from "@/app/components/ui/button";
import useNotifications from "@/app/hooks/useNotifications";
import ConfirmationDialog from "@/app/components/ui/confirmation-dialog";
import useUserDepartamento from "@/app/hooks/useUserDepartamento";
import { useRouter } from "next/navigation";
import AccesoDenegado from "@/app/components/ui/acceso-denegado";

export default function UsuariosClient({
  initialUsuarios,
  initialRoles,
  initialDepartamentos,
}) {

  const router = useRouter();
  const { userRole, isAdmin, isLoading: isUserLoading } = useUserDepartamento();

  // Hook de notificaciones
  const { addNotification, notificationComponents } = useNotifications();

  // Estados principales
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [roles] = useState(initialRoles);
  const [departamentos] = useState(initialDepartamentos);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' o 'edit'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [dniError, setDniError] = useState("");
  const [emailError, setEmailError] = useState("");

  // Agregar esta función para validar DNI duplicado:
  // Función para validar formato de DNI español
  const validateDniFormat = (dni) => {
    if (!dni || dni.trim() === "") {
      return { valid: false, error: "" }; // DNI vacío, no mostramos error aquí
    }

    // Eliminar espacios y convertir a mayúsculas
    const cleanDNI = dni.trim().toUpperCase();

    // Verificar que tenga el formato correcto (8 números + 1 letra)
    const dniPattern = /^[0-9]{8}[A-Z]$/;
    if (!dniPattern.test(cleanDNI)) {
      return { valid: false, error: "El DNI debe tener 8 números seguidos de una letra (ej: 12345678A)" };
    }

    // Extraer números y letra
    const numbers = cleanDNI.substring(0, 8);
    const letter = cleanDNI.substring(8, 9);

    // Letras de control para validar DNI
    const controlLetters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const expectedLetter = controlLetters[parseInt(numbers) % 23];

    if (letter !== expectedLetter) {
      return { valid: false, error: `La letra del DNI no es correcta.` };
    }

    return { valid: true, error: "" };
  };

  // Modificar la función validateDniDuplicate:
  const validateDniDuplicate = async (dni) => {
    if (!dni || dni.trim() === "") {
      setDniError("");
      return;
    }

    try {
      // Primero validar el formato del DNI
      const formatValidation = validateDniFormat(dni);
      if (!formatValidation.valid) {
        setDniError(formatValidation.error);
        return;
      }

      // Si el formato es correcto, verificar si ya existe
      const cleanDNI = dni.trim().toUpperCase();
      const existingUser = usuarios.find(user => {
        if (modalMode === "edit" && user.idUsuario === formularioUsuario.idUsuario) {
          return false; // Excluir el usuario actual cuando editamos
        }

        return user.DNI && user.DNI.toUpperCase() === cleanDNI;
      });

      if (existingUser) {
        setDniError("Este DNI ya está registrado en el sistema");
      } else {
        setDniError(""); // DNI válido y no duplicado
      }
    } catch (error) {
      console.error("Error validando DNI:", error);
      setDniError("Error al validar el DNI");
    }
  };

  // Agregar esta función para validar email duplicado:
  const validateEmailDuplicate = async (email) => {
    if (!email || email.trim() === "") {
      setEmailError("");
      return;
    }

    try {
      // Validar si el email ya existe (excluyendo el usuario actual en modo edición)
      const existingUser = usuarios.find(user =>
        user.Email && user.Email.toLowerCase() === email.toLowerCase() &&
        user.idUsuario !== formularioUsuario.idUsuario
      );

      if (existingUser) {
        setEmailError("Este email ya está registrado en el sistema");
      } else {
        setEmailError("");
      }
    } catch (error) {
      console.error("Error validando email:", error);
    }
  };

  // Estados para búsqueda y filtrado - Mantener estos separados del formulario
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Estado para diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  // Estado del formulario - COMPLETAMENTE SEPARADO del estado de búsqueda
  const [formularioUsuario, setFormularioUsuario] = useState({
    idUsuario: null,
    nombre: "",
    apellidos: "",
    email: "",
    dni: "",
    telefono: "",
    direccion: "",
    contrasena: "",
    rol: "",
    departamento: "",
    permisos: "",
  });

  useEffect(() => {
    if (!isUserLoading && userRole !== null && !isAdmin) {
      // Redirigir a la página principal si no es administrador
      router.push("/pages/home");
    }
  }, [isUserLoading, userRole, isAdmin, router]);

  // Filtrar usuarios según los criterios de búsqueda y filtrado
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((usuario) => {
      // Filtro por término de búsqueda (nombre, apellidos, email o dni)
      const matchesSearch =
        searchTerm === "" ||
        usuario.Nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.Apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (usuario.DNI &&
          usuario.DNI.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por rol
      const matchesRole = filterRole === "" || usuario.Rol === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [usuarios, searchTerm, filterRole]);

  // Función para determinar los permisos según el rol
  const getPermisosPorRol = (rol) => {
    switch (rol) {
      case "Administrador":
        return "all";
      case "Contable":
        return "ver";
      case "Jefe de Departamento":
        return "ver y editar";
      default:
        return "";
    }
  };

  // Función para validar el formulario
  const validarFormulario = () => {
    if (
      !formularioUsuario.nombre ||
      !formularioUsuario.apellidos ||
      !formularioUsuario.email
    ) {
      setFormError(
        "Por favor, completa los campos de nombre, apellidos y email"
      );
      return false;
    }
    if (!formularioUsuario.dni) {
      setFormError("Por favor, ingresa el DNI");
      return false;
    }
    if (dniError) {
      setFormError("Corrige el error en el DNI antes de continuar");
      return false;
    }
    if (emailError) {
      setFormError("Corrige el error en el email antes de continuar");
      return false;
    }
    if (!formularioUsuario.rol) {
      setFormError("Por favor, selecciona un rol");
      return false;
    }
    if (
      formularioUsuario.rol === "Jefe de Departamento" &&
      !formularioUsuario.departamento
    ) {
      setFormError(
        "Por favor, selecciona un departamento para el Jefe de Departamento"
      );
      return false;
    }

    setFormError("");
    return true;
  };

  // Limpiar el formulario
  const limpiarFormulario = () => {
    setFormularioUsuario({
      idUsuario: null,
      nombre: "",
      apellidos: "",
      email: "",
      dni: "",
      telefono: "",
      direccion: "",
      contrasena: "",
      rol: "",
      departamento: "",
      permisos: "",
    });
    setFormError("");
    setDniError("");
    setEmailError(""); // Limpiar también el error de email
  };

  // Abrir modal de añadir usuario
  const handleOpenAddModal = () => {
    limpiarFormulario(); // Aseguramos que el formulario esté limpio
    setModalMode("add");
    setShowModal(true);
  };

  // Abrir modal de editar usuario
  const handleOpenEditModal = (usuario) => {
    // Importante: No afectar el estado de búsqueda/filtrado
    setFormularioUsuario({
      idUsuario: usuario.idUsuario,
      nombre: usuario.Nombre || "",
      apellidos: usuario.Apellidos || "",
      email: usuario.Email || "",
      dni: usuario.DNI || "",
      telefono: usuario.Telefono || "",
      direccion: usuario.Direccion || "",
      contrasena: "", // No mostramos la contraseña existente por seguridad
      rol: usuario.Rol || "",
      departamento: usuario.Departamento || "",
      permisos: getPermisosPorRol(usuario.Rol) || "",
    });
    setModalMode("edit");
    setShowModal(true);
  };

  // Cerrar modal - CORRECCIÓN AQUÍ
  const handleCloseModal = () => {
    setShowModal(false);
    setFormError("");
    // No modificamos el searchTerm ni el filterRole aquí
  };

  // Manejar cambios en el formulario - NUNCA ACTUALIZA SEARCHTERM
  // Modificar la función handleInputChange para incluir validación de DNI:
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validación especial para DNI
    if (name === "dni") {
      validateDniDuplicate(value);
    }

    // Validación especial para email
    if (name === "email") {
      validateEmailDuplicate(value);
    }

    // Si cambia el rol, actualizar los permisos y departamento automáticamente
    if (name === "rol") {
      let nuevosPermisos = "";
      let nuevoDepartamento = formularioUsuario.departamento;

      if (value === "Administrador") {
        nuevosPermisos = "all";
        nuevoDepartamento = "Admin";
      } else if (value === "Contable") {
        nuevosPermisos = "ver";
        nuevoDepartamento = "Contable";
      } else if (value === "Jefe de Departamento") {
        nuevosPermisos = "ver y editar";
        nuevoDepartamento = "";
      }

      setFormularioUsuario({
        ...formularioUsuario,
        [name]: value,
        permisos: nuevosPermisos,
        departamento: nuevoDepartamento,
      });
      return;
    }

    setFormularioUsuario({
      ...formularioUsuario,
      [name]: value,
    });
  };

  // Toggle selección de usuario
  const toggleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Función para seleccionar/deseleccionar todos los usuarios mostrados
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsuarios.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsuarios.map((u) => u.idUsuario));
    }
  };

  // Manejar búsqueda - mantenemos esto separado del formulario
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Manejar cambio de filtro de rol - separado del formulario
  const handleFilterRoleChange = (e) => {
    setFilterRole(e.target.value);
  };

  // Función handleGuardarUsuario
  const handleGuardarUsuario = async () => {
    if (!validarFormulario()) return;

    setIsLoading(true);

    try {
      let url = "/api/getUsuarios";
      let method = "POST";

      if (modalMode === "edit") {
        url = `/api/getUsuarios/${formularioUsuario.idUsuario}`;
        method = "PUT";
      }

      // Obtener el ID del rol a partir del tipo de rol seleccionado
      const rolId = roles.find((r) => r.Tipo === formularioUsuario.rol)?.idRol;

      if (!rolId) {
        throw new Error("No se pudo encontrar el ID del rol seleccionado");
      }

      // Preparar datos para enviar - CONTRASEÑA OPCIONAL
      const datosUsuario = {
        DNI: formularioUsuario.dni || null, // Permitir DNI opcional
        Nombre: formularioUsuario.nombre,
        Apellidos: formularioUsuario.apellidos,
        Telefono: formularioUsuario.telefono || null,
        Direccion: formularioUsuario.direccion || null,
        Email: formularioUsuario.email,
        id_RolFK: rolId,
        Departamento: formularioUsuario.departamento || null,
      };

      // Solo incluir contraseña si se proporciona
      if (formularioUsuario.contrasena && formularioUsuario.contrasena.trim() !== '') {
        datosUsuario.Contrasena = formularioUsuario.contrasena;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosUsuario),
      });

      // MANEJO MEJORADO DE ERRORES
      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}`;

        try {
          // Intentar leer el JSON solo si la respuesta tiene contenido
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // Si no se puede parsear el JSON, usar un mensaje basado en el status
          if (response.status === 400) {
            errorMessage = "Datos incorrectos. Verifica que todos los campos estén correctos.";
          } else if (response.status === 500) {
            errorMessage = "Error interno del servidor. Intenta nuevamente.";
          }
        }

        throw new Error(errorMessage);
      }

      // Obtener los datos del usuario creado/actualizado
      let data = {};
      try {
        data = await response.json();
      } catch (jsonError) {
        // Si no hay JSON en la respuesta exitosa, continuar sin datos
        console.warn("Respuesta exitosa sin JSON válido");
      }

      // Actualizar la lista de usuarios local
      if (modalMode === "add") {
        // Obtenemos todos los usuarios actualizados para mantener la coherencia
        const updatedUsersResponse = await fetch("/api/getUsuarios");
        if (updatedUsersResponse.ok) {
          const updatedUsers = await updatedUsersResponse.json();
          setUsuarios(updatedUsers);
        } else {
          // Si falla, al menos añadimos el usuario que acabamos de crear
          const nuevoUsuario = {
            idUsuario: data.id || Date.now(), // Usar timestamp si no hay ID
            DNI: datosUsuario.DNI,
            Nombre: datosUsuario.Nombre,
            Apellidos: datosUsuario.Apellidos,
            Email: datosUsuario.Email,
            Telefono: datosUsuario.Telefono,
            Direccion: datosUsuario.Direccion,
            Rol: formularioUsuario.rol,
            Departamento: formularioUsuario.departamento,
            Permisos: formularioUsuario.permisos,
          };
          setUsuarios([...usuarios, nuevoUsuario]);
        }
      } else {
        // Actualizar el usuario existente en el array local
        setUsuarios(
          usuarios.map((user) =>
            user.idUsuario === formularioUsuario.idUsuario
              ? {
                ...user,
                DNI: datosUsuario.DNI,
                Nombre: datosUsuario.Nombre,
                Apellidos: datosUsuario.Apellidos,
                Email: datosUsuario.Email,
                Telefono: datosUsuario.Telefono,
                Direccion: datosUsuario.Direccion,
                Rol: formularioUsuario.rol,
                Departamento: formularioUsuario.departamento,
                Permisos: formularioUsuario.permisos,
              }
              : user
          )
        );
      }

      // Mostrar notificación de éxito
      addNotification(
        modalMode === "add"
          ? "Usuario creado correctamente"
          : "Usuario actualizado correctamente",
        "success"
      );

      // Cerrar el modal SIN afectar searchTerm
      handleCloseModal();
    } catch (error) {
      console.error("Error al guardar el usuario:", error);
      addNotification(`Error al guardar el usuario: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar eliminar usuarios
  const handleEliminarUsuarios = () => {
    if (selectedUsers.length === 0) {
      addNotification(
        "Por favor, selecciona al menos un usuario para eliminar",
        "warning"
      );
      return;
    }

    // Mostrar diálogo de confirmación
    setConfirmDialog({
      isOpen: true,
      title: "Confirmar eliminación",
      message: `¿Estás seguro de que deseas eliminar ${selectedUsers.length} usuario(s)? Esta acción no se puede deshacer.`,
      onConfirm: confirmDeleteUsers,
    });
  };

  // Función de confirmación para eliminar usuarios
  const confirmDeleteUsers = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/getUsuarios", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedUsers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Error del servidor: ${response.status}`
        );
      }

      const data = await response.json();

      // Actualizar la lista local
      setUsuarios(usuarios.filter((u) => !selectedUsers.includes(u.idUsuario)));
      setSelectedUsers([]);

      addNotification(
        `${data.deletedCount} usuario(s) eliminado(s) correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al eliminar usuarios:", error);
      addNotification(`Error al eliminar usuarios: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Usar layout flexible con altura calculada
    <div className="p-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Mostrar componentes de notificación */}
      {notificationComponents}

      {/* Diálogo de confirmación */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Encabezado - Reducimos el margen inferior */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
      </div>

      {/* Filtros y búsqueda - Reducimos el margen inferior */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, email o DNI..."
              value={searchTerm}
              maxLength={100}
              onChange={handleSearchChange} // Usamos la función específica
              className="w-full p-2 border border-gray-300 rounded-md pl-10"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="w-64">
          <div className="relative">
            <select
              value={filterRole}
              onChange={handleFilterRoleChange} // Usamos la función específica
              className="w-full p-2 border border-gray-300 rounded-md appearance-none pl-10"
            >
              <option value="">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.idRol} value={rol.Tipo}>
                  {rol.Tipo}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de resultados - Reducimos el margen inferior */}
      <div className="mb-2 text-sm text-gray-500">
        Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
      </div>

      {/* Tabla de usuarios - Usando flex-grow para ocupar el espacio disponible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden flex-grow">
        <div className="h-full overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-10">
                  {filteredUsuarios.length > 0 && (
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.length === filteredUsuarios.length &&
                        filteredUsuarios.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                    />
                  )}
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Nombre
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  DNI
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Rol
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Correo
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Departamento
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Permisos
                </th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length > 0 ? (
                filteredUsuarios.map((usuario) => {
                  // Determinar permisos basados en el rol
                  const permisosBasadosEnRol = getPermisosPorRol(usuario.Rol);

                  return (
                    <tr
                      key={usuario.idUsuario}
                      className={`border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedUsers.includes(usuario.idUsuario) ? "bg-red-50 hover:bg-red-100" : ""}`}
                      onClick={() => toggleSelectUser(usuario.idUsuario)}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(usuario.idUsuario)}
                          onChange={() => toggleSelectUser(usuario.idUsuario)}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {usuario.Nombre} {usuario.Apellidos}
                      </td>
                      <td className="py-3 px-4">{usuario.DNI || "-"}</td>
                      <td className="py-3 px-4">{usuario.Rol}</td>
                      <td className="py-3 px-4">{usuario.Email}</td>
                      <td className="py-3 px-4">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          {usuario.Departamento || "No asignado"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-40">
                          <div className="bg-gray-100 border border-gray-200 rounded px-3 py-1">
                            {permisosBasadosEnRol}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se seleccione al editar
                            handleOpenEditModal(usuario);
                          }}
                          className="text-gray-500 hover:text-red-600 cursor-pointer"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-gray-500">
                    No se encontraron usuarios{searchTerm || filterRole ? " con los criterios de búsqueda actuales" : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de acción - Ajustar márgenes */}
      <div className="flex justify-between mt-4">
        <Button onClick={handleOpenAddModal}>Nuevo Usuario</Button>
        <Button
          onClick={handleEliminarUsuarios}
          disabled={selectedUsers.length === 0 || isLoading}
        >
          {isLoading
            ? "Procesando..."
            : `Eliminar ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""
            }`}
        </Button>
      </div>

      {/* Modal para añadir/editar usuario con fondo difuminado */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === "add"
                  ? "Añadir Nuevo Usuario"
                  : "Editar Usuario"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-6 h-6 cursor-pointer" />
              </button>
            </div>

            {/* Mensaje de error del formulario */}
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {formError}
              </div>
            )}

            {/* Formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formularioUsuario.nombre}
                  onChange={handleInputChange}
                  className="border border-gray-200 rounded px-3 py-2 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  name="apellidos"
                  value={formularioUsuario.apellidos}
                  onChange={handleInputChange}
                  className="border border-gray-200 rounded px-3 py-2 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">DNI</label>
                <input
                  type="text"
                  name="dni"
                  value={formularioUsuario.dni}
                  onChange={handleInputChange}
                  className={`border rounded px-3 py-2 w-full ${dniError ? 'border-red-500' : 'border-gray-200'
                    }`}
                  required
                />
                {dniError && (
                  <p className="text-red-500 text-sm mt-1">{dniError}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formularioUsuario.email}
                  onChange={handleInputChange}
                  className={`border rounded px-3 py-2 w-full ${emailError ? 'border-red-500' : 'border-gray-200'
                    }`}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formularioUsuario.telefono}
                  onChange={handleInputChange}
                  className="border border-gray-200 rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={formularioUsuario.direccion}
                  onChange={handleInputChange}
                  className="border border-gray-200 rounded px-3 py-2 w-full"
                />
              </div>
              {/* <div>
                <label className="block text-gray-700 mb-1">
                  Contraseña{" "}
                  {modalMode === "edit" && "(Dejar vacío para mantener)"}
                </label>
                <input
                  type="password"
                  name="contrasena"
                  value={formularioUsuario.contrasena}
                  onChange={handleInputChange}
                  className="border border-gray-200 rounded px-3 py-2 w-full"
                />
              </div> */}
              <div>
                <label className="block text-gray-700 mb-1">Rol</label>
                <div className="relative">
                  <select
                    name="rol"
                    value={formularioUsuario.rol}
                    onChange={handleInputChange}
                    className="appearance-none border border-gray-200 rounded px-3 py-2 w-full pr-8"
                    required
                  >
                    <option value="">Seleccionar rol</option>
                    {roles.map((rol) => (
                      <option key={rol.idRol} value={rol.Tipo}>
                        {rol.Tipo}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Departamento</label>
                <div className="relative">
                  <select
                    name="departamento"
                    value={formularioUsuario.departamento}
                    onChange={handleInputChange}
                    className="appearance-none border border-gray-200 rounded px-3 py-2 w-full pr-8"
                    disabled={
                      formularioUsuario.rol === "Administrador" ||
                      formularioUsuario.rol === "Contable"
                    }
                    required={formularioUsuario.rol === "Jefe de Departamento"}
                  >
                    <option value="">Seleccionar departamento</option>
                    {formularioUsuario.rol === "Administrador" && (
                      <option value="Admin">Admin</option>
                    )}
                    {formularioUsuario.rol === "Contable" && (
                      <option value="Contable">Contable</option>
                    )}
                    {formularioUsuario.rol !== "Administrador" &&
                      formularioUsuario.rol !== "Contable" &&
                      departamentos.map((departamento) => (
                        <option
                          key={departamento.id_Departamento}
                          value={departamento.Nombre}
                        >
                          {departamento.Nombre}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Permisos</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formularioUsuario.permisos}
                    className="border border-gray-200 rounded px-3 py-2 w-full bg-gray-50"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <Button onClick={handleGuardarUsuario} disabled={isLoading}>
                {isLoading ? "Procesando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}