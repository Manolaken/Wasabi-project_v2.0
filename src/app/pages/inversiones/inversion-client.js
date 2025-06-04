"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronDown, Calendar, Info } from "lucide-react"
import Link from "next/link"
import useUserDepartamento from "@/app/hooks/useUserDepartamento"
import useBolsasData from "@/app/hooks/useBolsasData"

export default function InversionClient({
  initialOrden = [],
  initialDepartamentos = [],
  inversionesPorDepartamento = {},
  inversionesAcumPorDepartamento = {},
  mesActual = "",
  año = ""
}) {
  // Estado para controlar la carga completa
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Estado para el efecto de parpadeo
  const [visible, setVisible] = useState(true);

  // Efecto para el parpadeo
  useEffect(() => {
    // Configurar el intervalo para alternar la visibilidad
    const intervalId = setInterval(() => {
      setVisible(prevVisible => !prevVisible);
    }, 500); // Parpadeo cada 500ms

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId);
  }, []);

  const { departamento: userDepartamento, isLoading: isDepartamentoLoading } = useUserDepartamento()
  const [userRole, setUserRole] = useState(null)
  const [departamento, setDepartamento] = useState("")
  const [departamentoId, setDepartamentoId] = useState(null)
  const [inversionMensual, setInversionMensual] = useState(0)
  const [inversionTotal, setInversionTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingRefresh, setLoadingRefresh] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [añosConBolsas, setAñosConBolsas] = useState([])

  // Utilizar nuestro hook personalizado para cargar datos
  const { fetchBolsasData, getExistingYears } = useBolsasData()

  // Estados para los filtros de fecha - inicializamos con valores actuales
  const actualYear = new Date().getFullYear().toString();
  const [selectedMes, setSelectedMes] = useState(mesActual)
  const [selectedAño, setSelectedAño] = useState(actualYear);
  const [currentYearInversionTotal, setCurrentYearInversionTotal] = useState(0);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Función para inicializar todos los datos necesarios de una vez
  async function initializeComponent(departId) {
    if (!departId) return;

    try {
      // 1. Obtener años con bolsas
      const years = await getExistingYears(departId);
      setAñosConBolsas(years || []);

      // 2. Determinar qué año cargar inicialmente
      let yearToLoad = actualYear;
      if (years && years.length > 0) {
        if (years.includes(parseInt(actualYear))) {
          // El año actual tiene datos, usarlo
          yearToLoad = actualYear;
        } else {
          // Usar el año más reciente
          const sortedYears = [...years].sort((a, b) => parseInt(b) - parseInt(a));
          yearToLoad = sortedYears[0].toString();
        }
      }

      // 3. Establecer el año seleccionado (sin render adicional)
      setSelectedAño(yearToLoad);

      // Seleccionar un mes válido para el año inicial
      const mesesDelAño = new Set();
      initialOrden.forEach(orden => {
        if (orden.Departamento === departamento && orden.Num_inversion) { // CON inversión para inversiones
          const ordenDate = new Date(orden.Fecha);
          const ordenAño = ordenDate.getFullYear().toString();
          if (ordenAño === yearToLoad) {
            const mesesNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
              "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            mesesDelAño.add(mesesNames[ordenDate.getMonth()]);
          }
        }
      });

      // Si hay meses disponibles, seleccionar el primero
      let mesASeleccionar = mesActual; // Por defecto, usar el mes actual

      if (yearToLoad === actualYear) {
        // Si es el año actual, siempre usar el mes actual
        mesASeleccionar = mesActual;
      } else {
        // Para años diferentes al actual
        if (mesesDelAño.size > 0) {
          // Verificar si el mes actual está disponible en el año seleccionado
          if (mesesDelAño.has(mesActual)) {
            // Si el mes actual está disponible, usarlo
            mesASeleccionar = mesActual;
          } else {
            // Si no está disponible, usar el último mes con datos
            const mesesOrder = {
              "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
              "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
            };
            const sortedMeses = Array.from(mesesDelAño).sort((a, b) => mesesOrder[a] - mesesOrder[b]);

            // Seleccionar el último mes disponible (más reciente)
            mesASeleccionar = sortedMeses[sortedMeses.length - 1];
          }
        } else {
          // Si no hay datos, usar Enero como fallback
          mesASeleccionar = "Enero";
        }
      }

      // Establecer el mes seleccionado
      setSelectedMes(mesASeleccionar);

      // 4. Cargar datos para el año seleccionado
      if (departId) {
        const result = await fetchBolsasData(departId, parseInt(yearToLoad), 'inversion');

        if (result && result.inversion) {
          setCurrentYearInversionTotal(result.inversion.total_inversion || 0);
          setInversionMensual(result.inversion.inversion_mensual || 0);
          setInversionTotal(result.inversion.total_inversion || 0);
        } else {
          // Obtener datos de inversión desde inversionesPorDepartamento como fallback
          const inversionData = inversionesPorDepartamento[departId] || [];
          if (inversionData.length > 0) {
            const inversionMensualValue = inversionData[0]?.inversion_mensual || 0;
            setInversionMensual(inversionMensualValue);
            const inversionTotalValue = inversionData[0]?.total_inversion || (inversionMensualValue * 12);
            setInversionTotal(inversionTotalValue);
            setCurrentYearInversionTotal(inversionTotalValue);
          } else {
            setInversionMensual(0);
            setInversionTotal(0);
            setCurrentYearInversionTotal(0);
          }
        }
      }

      // 5. Marcar que la inicialización está completa
      setInitialLoadDone(true);
      setIsComponentReady(true);
      setIsInitializing(false);
    } catch (error) {
      console.error("Error durante la inicialización:", error);
      // Aún así mostrar el componente aunque haya habido un error
      setIsComponentReady(true);
      setIsInitializing(false);
    }
  }

  // Obtener información del usuario y departamento
  useEffect(() => {
    async function initialize() {
      try {
        // Obtener info del usuario
        const response = await fetch('/api/getSessionUser');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.usuario?.rol || '');

          const userDep = data.usuario?.departamento || '';

          // Determinar departamento según el rol
          let selectedDep = '';
          if (data.usuario?.rol === "Jefe de Departamento") {
            selectedDep = userDep;
          } else if (data.usuario?.rol === "Administrador") {
            const informaticaDep = initialDepartamentos.find(dep => dep.Nombre === "Informática");
            selectedDep = informaticaDep ? "Informática" : (initialDepartamentos.length > 0 ? initialDepartamentos[0].Nombre : '');
          } else if (data.usuario?.rol === "Contable") {
            const savedDep = typeof window !== 'undefined' && window.selectedDepartamento;
            if (savedDep && initialDepartamentos.some(dep => dep.Nombre === savedDep)) {
              selectedDep = savedDep;
            } else {
              const informaticaDep = initialDepartamentos.find(dep => dep.Nombre === "Informática");
              selectedDep = informaticaDep ? "Informática" : (initialDepartamentos.length > 0 ? initialDepartamentos[0].Nombre : '');
            }
          } else if (initialDepartamentos.length > 0) {
            selectedDep = initialDepartamentos[0].Nombre;
          }

          // Establecer departamento y obtener su ID
          setDepartamento(selectedDep);

          if (selectedDep && initialDepartamentos.length > 0) {
            const depInfo = initialDepartamentos.find(dep => dep.Nombre === selectedDep);
            if (depInfo) {
              const depId = depInfo.id_Departamento;
              setDepartamentoId(depId);

              // Inicializar todos los datos del componente de una vez
              await initializeComponent(depId);
            } else {
              setIsComponentReady(true);
              setIsInitializing(false);
            }
          } else {
            setIsComponentReady(true);
            setIsInitializing(false);
          }
        } else {
          setIsComponentReady(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("Error en la inicialización:", error);
        setIsComponentReady(true);
        setIsInitializing(false);
      }
    }

    initialize();
    // Esta función solo debe ejecutarse una vez al montar el componente
  }, []);

  // Recargar datos cuando se cambie explícitamente el departamento
  useEffect(() => {
    if (initialLoadDone && departamentoId) {
      // Solo recargar datos si ya se ha completado la carga inicial y cambia el departamento
      initializeComponent(departamentoId);
    }
  }, [departamento]);

  // CALCULAR GASTO TOTAL DEL AÑO ACTUAL (órdenes con inversión)
  const gastoTotalDelAñoSeleccionado = useMemo(() => {
    if (!departamento || !initialOrden.length) return 0;

    // Filtrar órdenes del departamento CON inversión y del año seleccionado
    const ordenesDelAño = initialOrden.filter(orden => {
      // Solo órdenes del departamento y que TENGAN número de inversión
      if (orden.Departamento !== departamento || !orden.Num_inversion) {
        return false;
      }

      // Solo del año seleccionado
      if (orden.Fecha) {
        const ordenDate = new Date(orden.Fecha);
        const ordenAño = ordenDate.getFullYear();
        return ordenAño === parseInt(selectedAño); // año seleccionado
      }

      return false;
    });

    return ordenesDelAño.reduce((sum, orden) => sum + (parseFloat(orden.Importe) || 0), 0);
  }, [departamento, initialOrden, selectedAño]);

  // Calcular inversión actual = inversión total - gasto del año actual
  const inversionActual = useMemo(() => {
    return inversionTotal - gastoTotalDelAñoSeleccionado;
  }, [inversionTotal, gastoTotalDelAñoSeleccionado]);

  // Filtrar las órdenes por departamento, mes y año (solo inversiones, no presupuesto)
  const filteredOrdenes = useMemo(() => {
    if (!departamento || !initialOrden.length) return []

    const filtered = initialOrden.filter(o => {
      // Solo órdenes del departamento y que TENGAN número de inversión
      if (o.Departamento !== departamento || !o.Num_inversion) {
        return false;
      }

      // Filtrar por año y mes si están seleccionados
      if (selectedAño || selectedMes) {
        const ordenDate = new Date(o.Fecha);
        const ordenAño = ordenDate.getFullYear().toString();
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const ordenMes = meses[ordenDate.getMonth()];

        if (selectedAño && ordenAño !== selectedAño) return false;
        if (selectedMes && ordenMes !== selectedMes) return false;
      }

      return true;
    });

    return filtered;
  }, [departamento, initialOrden, selectedMes, selectedAño]);

  // Obtener los meses y años disponibles
  const { availableMeses, availableAños } = useMemo(() => {
    const mesesSet = new Set();
    const añosSet = new Set();

    if (departamento && initialOrden.length) {
      // Filtrar solo órdenes del departamento seleccionado CON inversión
      const departamentoOrdenes = initialOrden.filter(o =>
        o.Departamento === departamento && o.Num_inversion
      );

      // Si hay un año seleccionado, filtrar los meses disponibles solo para ese año
      departamentoOrdenes.forEach(orden => {
        const ordenDate = new Date(orden.Fecha);
        const ordenAño = ordenDate.getFullYear().toString();
        const mesesNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const ordenMes = mesesNames[ordenDate.getMonth()];

        // Solo añadir meses si corresponden al año seleccionado o si no hay año seleccionado
        if (!selectedAño || ordenAño === selectedAño) {
          mesesSet.add(ordenMes);
        }

        // Siempre añadir todos los años
        añosSet.add(ordenAño);
      });
    }

    // Añadir años que tienen bolsas de inversión
    añosConBolsas.forEach(year => {
      añosSet.add(year.toString());
    });

    // Si el año seleccionado es el actual, incluir el mes actual
    if (!selectedAño || selectedAño === new Date().getFullYear().toString()) {
      mesesSet.add(mesActual);
    }

    // Ordenar meses
    const mesesOrder = {
      "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
      "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
    };

    // Si después de filtrar no hay meses, incluir al menos un mes (actual o enero)
    if (mesesSet.size === 0) {
      if (selectedAño === new Date().getFullYear().toString()) {
        mesesSet.add(mesActual);
      } else {
        mesesSet.add("Enero"); // Mes por defecto si no hay datos
      }
    }

    const sortedMeses = Array.from(mesesSet).sort((a, b) => mesesOrder[a] - mesesOrder[b]);
    const sortedAños = Array.from(añosSet).sort((a, b) => parseInt(a) - parseInt(b));

    return { availableMeses: sortedMeses, availableAños: sortedAños };
  }, [departamento, initialOrden, mesActual, año, añosConBolsas, selectedAño]);

  // Calcular gasto del mes seleccionado
  const gastoDelMes = useMemo(() => {
    return filteredOrdenes.reduce((sum, orden) => sum + (parseFloat(orden.Importe) || 0), 0);
  }, [filteredOrdenes]);

  // Calcular inversión total anual para el año seleccionado
  const inversionTotalAnual = useMemo(() => {
    // Si hay un valor específico para el año seleccionado, usarlo
    if (selectedAño && currentYearInversionTotal !== undefined) {
      return currentYearInversionTotal;
    }

    // De lo contrario, usar el cálculo original de los datos iniciales
    const inversionData = inversionesPorDepartamento[departamentoId] || [];
    const total = inversionData[0]?.total_inversion || (inversionData[0]?.inversion_mensual * 12) || 0;

    return total;
  }, [inversionesPorDepartamento, departamentoId, selectedAño, currentYearInversionTotal]);

  // Calcular inversión mensual recomendada basado en lo que queda por gastar
  const inversionMensualRecomendada = useMemo(() => {
    // Si no hay inversión actual restante, no hay recomendación
    if (inversionActual <= 0) return 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // Mes actual real (1-12)
    const selectedYearInt = parseInt(selectedAño);

    let mesesRestantes;

    if (selectedYearInt === currentYear) {
      // Si estamos viendo el año actual, calcular desde el mes actual hasta diciembre
      mesesRestantes = 12 - currentMonth + 1; // +1 para incluir el mes actual
    } else if (selectedYearInt > currentYear) {
      // Si estamos viendo un año futuro, usar todos los 12 meses
      mesesRestantes = 12;
    } else {
      // Si estamos viendo un año pasado, el "recomendado" no tiene sentido
      // pero podemos calcular como si fuera el promedio mensual del año
      mesesRestantes = 12;
    }

    // Evitar división por cero
    if (mesesRestantes <= 0) return 0;

    // Calcular recomendación
    const recomendacion = inversionActual / mesesRestantes;

    return recomendacion;
  }, [inversionActual, selectedAño]);

  // Calcular inversión mensual disponible para el mes específico
  const inversionMensualDisponible = useMemo(() => {
    return inversionMensualRecomendada - gastoDelMes;
  }, [inversionMensualRecomendada, gastoDelMes]);

  // Función para cambiar el departamento (solo para admin/contable)
  const handleChangeDepartamento = (newDepartamento) => {
    if (userRole === "Jefe de Departamento") return;

    setDepartamento(newDepartamento);

    // Guardar selección en window
    if (typeof window !== 'undefined') {
      window.selectedDepartamento = newDepartamento;
    }
  }

  // Manejar cambio de mes
  const handleMesChange = (e) => {
    setSelectedMes(e.target.value);
  }

  // Función para recargar datos para un año específico
  const reloadDataForYear = async (newYear) => {
    if (!departamentoId) return;

    setIsLoading(true);
    try {
      // Usar nuestro hook para cargar datos del año
      const result = await fetchBolsasData(departamentoId, parseInt(newYear), 'inversion');

      if (result && result.inversion) {
        // Actualizar datos de inversión
        setCurrentYearInversionTotal(result.inversion.total_inversion || 0);
        setInversionMensual(result.inversion.inversion_mensual || 0);
        setInversionTotal(result.inversion.total_inversion || 0);
      } else {
        // Si no hay datos para ese año, establecer a 0
        setCurrentYearInversionTotal(0);
        setInversionMensual(0);
        setInversionTotal(0);
      }
    } catch (error) {
      console.error(`Error loading investment data for year ${newYear}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador de cambio de año
  const handleAñoChange = (e) => {
    const newYear = e.target.value;
    setSelectedAño(newYear);

    // Recargar datos para el nuevo año
    reloadDataForYear(parseInt(newYear))
      .then(() => {
        // Después de cargar los datos, determinar qué mes seleccionar
        const mesesDelAño = new Set();

        // Obtener meses que tienen órdenes de inversión para el nuevo año
        initialOrden.forEach(orden => {
          if (orden.Departamento === departamento && orden.Num_inversion) {
            const ordenDate = new Date(orden.Fecha);
            const ordenAño = ordenDate.getFullYear().toString();
            if (ordenAño === newYear) {
              const mesesNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
              mesesDelAño.add(mesesNames[ordenDate.getMonth()]);
            }
          }
        });

        // Lógica mejorada para seleccionar el mes
        let mesASeleccionar = selectedMes; // Por defecto, mantener el mes actual

        // Si el año seleccionado es el año actual
        if (newYear === actualYear) {
          // Siempre usar el mes actual si estamos en el año actual
          mesASeleccionar = mesActual;
        } else {
          // Para años diferentes al actual
          if (mesesDelAño.size > 0) {
            // Si el mes actual seleccionado no está disponible en el nuevo año
            if (!mesesDelAño.has(selectedMes)) {
              // Ordenar los meses cronológicamente
              const mesesOrder = {
                "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6,
                "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
              };
              const sortedMeses = Array.from(mesesDelAño).sort((a, b) => mesesOrder[a] - mesesOrder[b]);

              // Seleccionar el mes más reciente (último) disponible
              mesASeleccionar = sortedMeses[sortedMeses.length - 1];
            }
            // Si el mes actual está disponible, se mantiene (mesASeleccionar ya tiene el valor correcto)
          } else {
            // Si no hay datos para el año, usar Enero como fallback
            mesASeleccionar = "Enero";
          }
        }

        // Actualizar el mes seleccionado si es diferente
        if (mesASeleccionar !== selectedMes) {
          setSelectedMes(mesASeleccionar);
        }
      })
      .catch(error => {
        console.error("Error al cambiar año:", error);
      });
  };

  // Función para refrescar datos
  const refreshData = async () => {
    if (!departamentoId) return;

    setLoadingRefresh(true);
    try {
      // Actualizar la lista de años con bolsas
      const years = await getExistingYears(departamentoId);
      if (years && years.length > 0) {
        setAñosConBolsas(years);
      }

      // Obtener datos actualizados para el año seleccionado
      const result = await fetchBolsasData(departamentoId, parseInt(selectedAño), 'inversion');

      if (result && result.inversion) {
        // Actualizar datos de inversión
        setInversionMensual(result.inversion.inversion_mensual || 0);
        setCurrentYearInversionTotal(result.inversion.total_inversion || 0);
        setInversionTotal(result.inversion.total_inversion || 0);

        setSuccessMessage('Datos actualizados correctamente');

        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error("Error al refrescar datos:", error);
    } finally {
      setLoadingRefresh(false);
    }
  };

  // Formatear valores monetarios
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "0,00 €"
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " €"
  }

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

  // Si el componente aún no está listo, mostramos un estado de carga consistente
  if (!isComponentReady || isDepartamentoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-2 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inversión</h1>
          <h2 className="text-xl text-gray-400">
            Departamento {departamento || userDepartamento || ""}
          </h2>
        </div>
      </div>

      {/* Selector de fecha y botón de resumen */}
      <div className="flex justify-between mb-6 gap-4">
        <div className="flex gap-2">
          {/* Selector de departamento (solo para admin/contable) */}
          {userRole && userRole !== "Jefe de Departamento" && initialDepartamentos && initialDepartamentos.length > 0 && (
            <div className="relative">
              <select
                value={departamento}
                onChange={(e) => handleChangeDepartamento(e.target.value)}
                className="appearance-none bg-gray-100 border border-gray-200 rounded-md px-4 py-2 pr-8 cursor-pointer"
              >
                {initialDepartamentos.map((dep) => (
                  <option key={dep.id_Departamento} value={dep.Nombre}>
                    {dep.Nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {/* Selector de mes */}
          <div className="relative">
            <select
              value={selectedMes}
              onChange={handleMesChange}
              className="appearance-none bg-gray-100 border border-gray-200 rounded-md px-4 py-2 pr-8 cursor-pointer w-40"
            >
              {availableMeses.map(mes => (
                <option key={mes} value={mes}>{mes}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {/* Selector de año */}
          <div className="relative">
            <select
              value={selectedAño}
              onChange={handleAñoChange}
              className="appearance-none bg-gray-100 border border-gray-200 rounded-md px-4 py-2 pr-8 cursor-pointer"
            >
              {availableAños.map(año => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {/* Botón resumen */}
          {departamento && (
            <Link
              href={`/pages/resumen/${departamento}`}
              className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800"
            >
              Resumen
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda: Tarjetas financieras */}
        <div className="col-span-1">
          <div className="grid gap-6">
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
                  <h3 className="text-gray-500 text-mb">Gasto acumulado {selectedAño}</h3>
                  <div className={`text-2xl font-bold ${gastoTotalDelAñoSeleccionado > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(gastoTotalDelAñoSeleccionado)}
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full ${getIndicatorColor(inversionActual, inversionTotal)}`}></div>
              </div>
            </div>

            {/* Inversión mensual recomendada del mes seleccionado */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-gray-500 text-xl">Inversión mensual recomendada</h3>
                <div className="relative group">
                  <Info className="w-4 h-4 text-blue-500 cursor-pointer" />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-gray-200 rounded p-3 shadow-lg z-50 w-80">
                    <div className="text-xs">
                      <p className="font-semibold mb-1">Cálculo dinámico:</p>
                      <p className="mb-2">
                        Se divide la inversión restante entre los meses que quedan del año actual.
                      </p>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        <p className="font-mono">
                          {formatCurrency(inversionActual)} ÷ {
                            parseInt(selectedAño) === new Date().getFullYear()
                              ? `${12 - new Date().getMonth()} meses restantes`
                              : parseInt(selectedAño) > new Date().getFullYear()
                                ? "12 meses (año futuro)"
                                : "12 meses (promedio anual)"
                          } = {formatCurrency(inversionMensualRecomendada)}
                        </p>
                      </div>
                      <p className="mt-2 text-gray-600 text-xs">
                        Esto te ayuda a planificar el gasto mensual restante.
                      </p>
                    </div>
                    {/* Flecha apuntando hacia abajo */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"></div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${getTextColorClass(inversionMensualDisponible)}`}>
                  {formatCurrency(inversionMensualDisponible)}
                </div>
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {selectedMes} {selectedAño}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Recomendación: {formatCurrency(inversionMensualRecomendada)}/mes
              </div>
            </div>

            {/* Gasto del mes seleccionado */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-gray-500 mb-2 text-xl">
                Gasto en {selectedMes} {selectedAño}
              </h3>
              <div className="text-right">
                <div className={`text-5xl font-bold ${gastoDelMes > 0 ? "text-red-500" : "text-gray-900"}`}>
                  {formatCurrency(gastoDelMes)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Órdenes de compra */}
        <div className="col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold">ÓRDENES DE COMPRA</h3>
              <Link href="/pages/ordenes-compra" className="bg-black text-white text-sm px-3 py-1 rounded">
                Ver detalles
              </Link>
            </div>

            <div className="overflow-hidden max-h-[480px] overflow-y-auto">
              <table className="w-full table-fixed">
                <thead className="bg-white sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 font-normal text-gray-500 text-left w-1/3">Número</th>
                    <th className="pb-2 font-normal text-gray-500 text-left w-1/2">Descripción</th>
                    <th className="pb-2 font-normal text-gray-500 text-right w-1/6">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrdenes && filteredOrdenes.length > 0 ? (
                    filteredOrdenes.map((item, index) => (
                      <tr key={`${item.idOrden}-${index}`} className="border-t border-gray-200">
                        {/* Número de Orden con tooltip para Inversión */}
                        <td className="py-3 w-1/3">
                          <div className="flex items-center">
                            <span className="truncate max-w-[120px]" title={item.Num_orden}>{item.Num_orden}</span>
                            {item.Num_inversion && (
                              <div className="ml-2 relative group">
                                <Info className="h-4 w-4 text-blue-500" />

                                {/* Tooltip que aparece hacia arriba para evitar scroll */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-white border border-gray-200 rounded p-3 shadow-lg whitespace-nowrap z-50">
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
                        <td className="py-3 w-1/2">
                          <div className="truncate pr-2" title={item.Descripcion}>
                            {item.Descripcion || "-"}
                          </div>
                        </td>
                        <td className="py-3 text-right w-1/6">
                          {parseFloat(item.Importe || 0).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}€
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-gray-400">
                        {filteredOrdenes.length === 0 && gastoTotalDelAñoSeleccionado > 0
                          ? `No hay órdenes de inversión para ${selectedMes} ${selectedAño}`
                          : gastoTotalDelAñoSeleccionado === 0
                            ? inversionTotal > 0
                              ? `No hay órdenes de inversión registradas para ${selectedAño}`
                              : "No hay órdenes ni inversiones para este período"
                            : "No hay órdenes de inversión que cumplan con los filtros seleccionados"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}