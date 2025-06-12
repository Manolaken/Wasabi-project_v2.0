"use client"

import { useState, useMemo, useEffect } from "react"
import { Calendar, Info, Plus, Pencil } from "lucide-react"
import Link from "next/link"
import useBolsasData from "@/app/hooks/useBolsasData"
import CreateBolsaModal from "@/app/components/modals/CreateBolsaModal"
import BolsasForm from "@/app/components/forms/bolsas-form"
import useNotifications from "@/app/hooks/useNotifications"
import useUserDepartamento from "@/app/hooks/useUserDepartamento" // Importar el hook para obtener el rol

export default function ResumenClient({
    departamento,
    resumenprep,
    resumeninv,
    resumenord,
    resumengasto,
    resumeninvacum
}) {
    const [error, setError] = useState('');

    // Obtener el rol del usuario con el hook existente
    const { userRole, isLoading: isUserRoleLoading } = useUserDepartamento();

    // Estados para los filtros de fecha
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const mesActual = meses[new Date().getMonth()];
    const añoActual = new Date().getFullYear();

    // Estado para manejar el modal
    const [showModal, setShowModal] = useState(false);
    
    // Estado para los datos de bolsas
    const [datosPresupuesto, setDatosPresupuesto] = useState(resumenprep);
    const [datosInversion, setDatosInversion] = useState(resumeninv);
    const [loadingRefresh, setLoadingRefresh] = useState(false);

    // IMPORTANTE: Añadir el estado isLoading que faltaba
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para almacenar años que ya tienen bolsas
    const [existingYears, setExistingYears] = useState([]);

    // Utilizar el hook personalizado
    const { fetchBolsasData, createBolsas, getExistingYears } = useBolsasData();
    const [successMessage, setSuccessMessage] = useState('');
    const { addNotification, notificationComponents } = useNotifications();

    // Verificar si el usuario puede añadir bolsas (no es contable)
    const canAddBolsa = userRole && userRole !== "Contable";

    // Depuración: monitorear datos recibidos del servidor
    useEffect(() => {
        console.log("Datos iniciales recibidos del servidor:");
        console.log("resumenprep:", resumenprep);
        console.log("resumeninv:", resumeninv);
        console.log("Año actual:", añoActual);

        // Inicializar estados con datos iniciales
        setDatosPresupuesto(resumenprep);
        setDatosInversion(resumeninv);
    }, [resumenprep, resumeninv, añoActual]);

    // Buscar ID de departamento
    const departamentoId = useMemo(() => {
        if (resumenprep && resumenprep.length > 0) {
            return resumenprep[0].id_DepartamentoFK;
        } else if (resumeninv && resumeninv.length > 0) {
            return resumeninv[0].id_DepartamentoFK;
        }
        return null;
    }, [resumenprep, resumeninv]);

    // Calcular presupuesto actual e inversión actual - CORREGIDO
    const presupuestoTotal = useMemo(() =>
        datosPresupuesto?.[0]?.total_presupuesto || 0,
        [datosPresupuesto]);

    // Calcular inversión total anual
    const inversionTotal = useMemo(() =>
        datosInversion?.[0]?.total_inversion || 0,
        [datosInversion]);

    // Calcular gasto en presupuesto solo del año actual
    const gastoPresupuestoDelAñoActual = useMemo(() => {
        if (!resumenord || resumenord.length === 0) return 0;

        // Filtrar órdenes que NO tengan Num_inversion (son de presupuesto) Y sean del año actual
        const ordenesPresupuestoAñoActual = resumenord.filter(orden => {
            // No debe tener número de inversión
            if (orden.Num_inversion) return false;

            // Debe ser del año actual
            if (!orden.Fecha) return false;
            const ordenDate = new Date(orden.Fecha);
            const ordenAño = ordenDate.getFullYear();

            return ordenAño === añoActual;
        });

        // Sumar todos los importes
        return ordenesPresupuestoAñoActual.reduce((total, orden) => {
            return total + (parseFloat(orden.Importe) || 0);
        }, 0);
    }, [resumenord, añoActual]);

    // El presupuesto actual es presupuesto total menos gasto del año actual
    const presupuestoActual = presupuestoTotal - gastoPresupuestoDelAñoActual;

    // Calcular gasto de inversión solo del año actual
    const gastoInversionDelAño = useMemo(() => {
        if (!resumenord || resumenord.length === 0) return 0;

        // Filtrar órdenes que SÍ tengan Num_inversion y sean del año actual
        const ordenesInversionAñoActual = resumenord.filter(orden => {
            if (!orden.Num_inversion) return false;

            if (!orden.Fecha) return false;
            const ordenDate = new Date(orden.Fecha);
            const ordenAño = ordenDate.getFullYear();

            return ordenAño === añoActual;
        });

        // Sumar todos los importes
        return ordenesInversionAñoActual.reduce((total, orden) => {
            return total + (parseFloat(orden.Importe) || 0);
        }, 0);
    }, [resumenord, añoActual]);

    // Ahora usar el gasto filtrado por año
    const inversionActual = inversionTotal - gastoInversionDelAño;

    // Determinar el color del indicador según el saldo restante
    const getIndicatorColor = (actual, total) => {
        if (!total) return "bg-gray-400"; // Si no hay total, gris

        const porcentaje = (actual / total) * 100;

        if (porcentaje < 25) return "bg-red-500";      // Menos del 25% - Rojo
        if (porcentaje < 50) return "bg-yellow-500";   // Entre 25% y 50% - Amarillo
        return "bg-green-500";                         // Más del 50% - Verde
    };

    // Determinar el color del texto para valores negativos
    const getTextColorClass = (valor) => {
        return valor < 0 ? "text-red-600" : "";
    };

    // Filtrar órdenes solo para el mes actual
    const filteredOrdenes = useMemo(() => {
        if (!resumenord || resumenord.length === 0) return [];

        return resumenord.filter(orden => {
            if (!orden.Fecha) return false;

            const ordenDate = new Date(orden.Fecha);
            const ordenMes = meses[ordenDate.getMonth()];
            const ordenAño = ordenDate.getFullYear();

            // Solo mostrar órdenes del mes y año actual
            return ordenMes === mesActual && ordenAño === añoActual;
        });
    }, [resumenord, mesActual, añoActual, meses]);

    // Función para formatear fechas
    const formatDate = (dateString) => {
        if (!dateString) return "-";

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return "-";
        }
    };

    // Función para actualizar los datos
    const refreshData = async () => {
        if (!departamentoId) return;

        setLoadingRefresh(true);

        try {
            const result = await fetchBolsasData(departamentoId, añoActual);

            if (result) {
                // Actualizar los datos de presupuesto e inversión
                if (result.presupuesto) {
                    setDatosPresupuesto([result.presupuesto]);
                }

                if (result.inversion) {
                    setDatosInversion([result.inversion]);
                }

                setSuccessMessage('Datos actualizados correctamente');

                // Ocultar el mensaje después de 3 segundos
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            }
        } catch (error) {
            console.error("Error al actualizar datos:", error);
        } finally {
            setLoadingRefresh(false);
        }
    };

    // Handler para abrir el modal y establecer el departamento actual
    const handleOpenModal = async (e) => {
        // Prevenir la acción predeterminada para evitar cualquier navegación
        e.preventDefault();

        if (!departamentoId) {
            console.error('No se puede determinar el departamento actual');
            return;
        }

        console.log("Abriendo modal para departamento:", departamento, "ID:", departamentoId);

        // Mostrar modal antes de esperar por los datos de años
        setShowModal(true);



        // Inicializar el formulario con valores por defecto
        //setFormData({
        //    cantidadPresupuesto: '',
        //    cantidadInversion: '',
        //    año: añoActual,
        //    departamentoId: departamentoId
        //});

        try {
            // Obtener años que ya tienen bolsas - con manejo de errores mejorado
            const years = await getExistingYears(departamentoId);
            if (Array.isArray(years)) {
                setExistingYears(years);
            } else {
                console.warn("Formato de años inesperado:", years);
                setExistingYears([]);
            }
        } catch (error) {
            console.error("Error al obtener años existentes:", error);
            // En caso de error, simplemente mostrar el modal con años vacíos
            setExistingYears([]);
        }
    };

    // Handler para cerrar el modal
    const handleCloseModal = () => {
        setShowModal(false);
        // Limpiar el estado de error
        setError('');

        // Opcional: resetear el formulario a valores iniciales
        //setFormData({
        //    cantidadPresupuesto: '',
        //    cantidadInversion: '',
        //    año: añoActual,
        //    departamentoId: departamentoId
        //});
    };

    // Modificar la función handleInputChange para cargar datos existentes al cambiar de año
    // Este código iría dentro de resumen-client.js

    // 2. Reemplaza la función handleInputChange con esta versión
    const handleInputChange = async (e) => {
        const { name, value, type, checked } = e.target;

        // Para inputs de checkbox
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: Boolean(checked),
            }));
            return;
        }

        // Validaciones para campos de cantidad
        if ((name === 'cantidadPresupuesto' || name === 'cantidadInversion')) {
            // Permitir solo números y punto decimal, rechazar incluso la 'e'
            if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) {
                return;
            }

            // Convertir la coma a punto para procesar correctamente
            const processedValue = value.replace(',', '.');
            // Verificar que no exceda el máximo de 200.000
            const numericValue = parseFloat(processedValue || 0);
            if (numericValue > 200000) {
                return;
            }
        }

        // Para el cambio de año, verificar si hay bolsas existentes y cargar sus cantidades
        if (name === 'año' && value) {
            const nuevoAño = parseInt(value);

            // Si el año ya tiene bolsas asignadas, cargar sus valores actuales
            if (existingYears.includes(nuevoAño)) {
                try {
                    // Mostrar indicador de carga
                    setIsLoading(true);

                    // Consultar datos de bolsas existentes para ese año
                    const response = await fetch(`/api/getBolsasByYear?departamentoId=${departamentoId}&year=${nuevoAño}`);

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`Bolsas existentes para ${nuevoAño}:`, data);

                        // Establecer las cantidades existentes en el formulario
                        let nuevoCantidadPresupuesto = '';
                        let nuevoCantidadInversion = '';

                        if (data && data.bolsas) {
                            // Recorrer las bolsas recibidas
                            data.bolsas.forEach(bolsa => {
                                if (bolsa.tipo === 'presupuesto') {
                                    nuevoCantidadPresupuesto = bolsa.cantidad.toString();
                                } else if (bolsa.tipo === 'inversion') {
                                    nuevoCantidadInversion = bolsa.cantidad.toString();
                                }
                            });
                        }

                        // Actualizar el formulario con las cantidades existentes
                        setFormData(prev => ({
                            ...prev,
                            año: nuevoAño,
                            cantidadPresupuesto: nuevoCantidadPresupuesto,
                            cantidadInversion: nuevoCantidadInversion,
                            [name]: value

                        }));

                        return; // Retornar aquí para evitar la actualización genérica abajo
                    }
                } catch (error) {
                    console.error('Error al obtener cantidades existentes:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        }

        // Actualización genérica para cualquier otro campo
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handler para enviar el formulario
    const handleSubmit = async (e) => {
        //e.preventDefault();
        setError('');
        setIsSubmitting(true);

        // Validar datos del formulario
        if (!formData.departamentoId) {
            setError('Debe seleccionar un departamento');
            setIsSubmitting(false);
            return;
        }

        if (!formData.año) {
            setError('Debe ingresar un año');
            setIsSubmitting(false);
            return;
        }

        const isEditing = existingYears.includes(parseInt(formData.año));

        // Validar que al menos uno de los montos sea mayor que 0
        const processedCantidadPresupuesto = formData.cantidadPresupuesto
            ? parseFloat(formData.cantidadPresupuesto.replace(',', '.'))
            : 0;

        const processedCantidadInversion = formData.cantidadInversion
            ? parseFloat(formData.cantidadInversion.replace(',', '.'))
            : 0;

        // Validación adicional
        if (processedCantidadPresupuesto === 0 && processedCantidadInversion === 0) {
            setError("Debe ingresar un cantidad válido para presupuesto y/o inversión");
            setIsSubmitting(false);
            return;
        }

        try {
            // Preparar los datos para enviar
            const data = {
                departamentoId: Number(formData.departamentoId), // Asegúrate que sea el ID numérico
                año: Number(formData.año),
                cantidadPresupuesto: formData.cantidadPresupuesto ? parseFloat(formData.cantidadPresupuesto.replace(',', '.')) : 0,
                cantidadInversion: formData.cantidadInversion ? parseFloat(formData.cantidadInversion.replace(',', '.')) : 0,
                esActualizacion: existingYears.includes(parseInt(formData.año)) // Indicar si es actualización
            };

            // Realizar la petición al servidor
            const response = await fetch('/api/createBolsas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                // Manejar el caso específico de bolsas con órdenes asociadas
                if (response.status === 403 && result.tieneOrdenes) {
                    const totalOrdenes = result.totalOrdenes.presupuesto + result.totalOrdenes.inversion;

                    setError(
                        `No se pueden modificar bolsas que ya tienen ${totalOrdenes} orden(es) asociada(s). `

                    );
                    return;
                }

                // Otros errores
                throw new Error(result.error || 'Error al procesar las bolsas');
            }

            // Éxito - Mostrar notificación y cerrar el modal o resetear el formulario
            addNotification(
                isEditing ? 'Bolsas actualizadas correctamente' : 'Bolsas creadas correctamente',
                'success'
            );

            // Acciones a realizar después de un envío exitoso
            setShowModal(false); // Cerrar modal
            //setFormData({      // Resetear formulario
            //    cantidadPresupuesto: '',
            //    cantidadInversion: '',
            //    año: añoActual,
            //    departamentoId: departamentoId
            //});

            // Si hay función para recargar los datos del componente padre
            if (refreshData) {
                refreshData();
            }


        } catch (error) {
            console.error('Error procesando bolsas:', error);
            setError(error.message || 'Ocurrió un error al procesar las bolsas');
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <div className="p-6">
            {/* Notificaciones */}
            {notificationComponents}

            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Resumen</h1>
                    <h2 className="text-xl text-gray-400">Departamento {departamento}</h2>
                </div>
            </div>

            {/* Fecha */}
            <div className="flex justify-end my-2 gap-6">
                {/* Botón para agregar bolsas */}
            {canAddBolsa && (
                <button
                    onClick={handleOpenModal}
                    className="bg-red-600 opacity-80 flex items-center gap-2 text-white px-4 py-3 rounded-md hover:bg-red-700 cursor-pointer"
                    aria-label="Añadir nueva bolsa presupuestaria"
                >
                    <Plus className="w-5 h-5" size={18} />
                    <span className="text-mb">Añadir bolsa</span>
                </button>
            )}
                <div className="relative">
                    <div className="appearance-none bg-gray-100 border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{`${mesActual} ${añoActual}`}</span>
                    </div>
                </div>
            </div>

            {/* Columna izquierda: Tarjetas financieras */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="col-span-1">
                    <div className="grid gap-5">
                        {/* Presupuesto total anual */}
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="w-1/2 pr-4">
                                    <h3 className="text-gray-500 mb-2 text-xl">Presupuesto total anual</h3>
                                    <div className="text-4xl font-bold text-gray-400">
                                        {presupuestoTotal?.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                                <div className="w-1/2 pl-4">
                                    <h3 className="text-gray-500 mb-2 text-xl">Presupuesto actual</h3>
                                    <div className={`text-4xl font-bold ${getTextColorClass(presupuestoActual)}`}>
                                        {presupuestoActual.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-5">
                                <div className="w-full">
                                    <h3 className="text-gray-500 text-mb">Gasto en presupuesto acumulado {añoActual}</h3>
                                    <div className={`text-2xl font-bold ${gastoPresupuestoDelAñoActual > 0 ? "text-red-600" : "text-gray-900"}`}>
                                        {gastoPresupuestoDelAñoActual?.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full ${getIndicatorColor(presupuestoActual, presupuestoTotal)}`}></div>
                            </div>
                        </div>

                        {/* Inversión total anual */}
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="w-1/2 pr-4">
                                    <h3 className="text-gray-500 mb-2 text-xl">Inversión total anual</h3>
                                    <div className="text-4xl font-bold text-gray-400">
                                        {inversionTotal?.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                                <div className="w-1/2 pl-4">
                                    <h3 className="text-gray-500 mb-2 text-xl">Inversión actual</h3>
                                    <div className={`text-4xl font-bold ${getTextColorClass(inversionActual)}`}>
                                        {inversionActual.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-5">
                                <div className="w-full">
                                    <h3 className="text-gray-500 text-mb">Inversión acumulada {añoActual}</h3>
                                    <div className={`text-2xl font-bold ${gastoInversionDelAño > 0 ? "text-red-600" : "text-gray-900"}`}>
                                        {gastoInversionDelAño?.toLocaleString("es-ES", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })} €
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full ${getIndicatorColor(inversionActual, inversionTotal)}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna derecha: Órdenes de compra */}
                <div className="col-span-1">
                    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">ÓRDENES</h3>
                            <Link href={`/pages/ordenes-compra/`}>
                                <button className="bg-black text-white text-sm px-3 py-1 rounded-md cursor-pointer">
                                    Ver detalles
                                </button>
                            </Link>
                        </div>

                        <div className="overflow-hidden max-h-[470px] overflow-y-auto">
                            <table className="w-full table-fixed">
                                <thead className="bg-white sticky top-0 z-10">
                                    <tr>
                                        <th className="pb-2 font-normal text-gray-500 text-left w-1/4 px-3">Número</th>
                                        <th className="pb-2 font-normal text-gray-500 text-left w-2/5 px-3">Descripción</th>
                                        <th className="pb-2 font-normal text-gray-500 text-left w-1/4 px-3">Fecha</th>
                                        <th className="pb-2 font-normal text-gray-500 text-right w-1/5 px-3">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrdenes?.length > 0 ? (
                                        filteredOrdenes.map((item) => (
                                            <tr key={`${item.idOrden}`} className="border-t border-gray-200">
                                                <td className="py-3 px-3 text-left w-1/4">
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.Num_orden}</span>
                                                        {item.Num_inversion && (
                                                            <div className="relative group">
                                                                <Info className="w-4 h-4 text-blue-500" />
                                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-gray-200 rounded p-3 shadow-lg whitespace-nowrap z-50">
                                                                    <div className="text-xs">
                                                                        <p className="font-semibold">Núm. Inversión:</p>
                                                                        <p>{item.Num_inversion}</p>
                                                                    </div>
                                                                    {/* Flecha apuntando hacia abajo */}
                                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-left w-2/5">
                                                    <div className="truncate" title={item.Descripcion}>
                                                        {item.Descripcion || "-"}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-left w-1/4">{formatDate(item.Fecha)}</td>
                                                <td className="py-3 px-3 text-right w-1/5">
                                                    {parseFloat(item.Importe).toLocaleString("es-ES", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}€
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-4 px-3 text-center text-gray-400">
                                                No hay órdenes para {mesActual} {añoActual}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            

            {/* Modal para agregar bolsas presupuestarias */}
            <CreateBolsaModal
                showModal={showModal}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                departamento={departamento}
                departamentoId={departamentoId}
                existingYears={existingYears}
                isLoading={isSubmitting}
                error={error}
                añoActual={añoActual}
            />
        </div>
    );
}