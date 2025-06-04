import { getDepartamentos } from "@/app/api/functions/departamentos"
import { getResumenPresupuesto, getResumenInversion, getResumenOrden, getResumenGasto, getResumenInversionAcum } from "@/app/api/functions/resumen"
import ResumenClient from './resumen-client'

export default async function Resumen({ params }) {
    // Await params antes de usar sus propiedades
    const awaitedParams = await params;
    const departamento = awaitedParams?.departamento ? decodeURIComponent(awaitedParams.departamento) : '';
    
    const departamentos = await getDepartamentos();
    
    // Encontrar el departamento específico en la lista
    const departamentoInfo = departamentos.find(d => d.Nombre === departamento) || {};
    
    // Obtener el año actual
    const añoActual = new Date().getFullYear();
    
    // Obtener datos financieros y órdenes de compra
    const resumenprep = await getResumenPresupuesto(departamentoInfo.id_Departamento, añoActual);
    const resumeninv = await getResumenInversion(departamentoInfo.id_Departamento, añoActual);
    const resumenord = await getResumenOrden(departamentoInfo.id_Departamento);
    const resumengasto = await getResumenGasto(departamentoInfo.id_Departamento);
    const resumeninvacum = await getResumenInversionAcum(departamentoInfo.id_Departamento);

    return (
        <ResumenClient
            departamento={departamento}
            resumenprep={resumenprep}
            resumeninv={resumeninv}
            resumenord={resumenord}
            resumengasto={resumengasto}
            resumeninvacum={resumeninvacum}
        />
    );
}