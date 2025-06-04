import { getOrden } from "@/app/api/functions/orden"
import { getDepartamentos } from "@/app/api/functions/departamentos"
import { getProveedores } from "@/app/api/functions/proveedores"
import OrdenesCompraClient from "./ordenesCompraClient"

export default async function OrdenesCompraPage() {
  const orden = await getOrden()
  const departamentos = await getDepartamentos()
  const proveedores = await getProveedores()

  return (
    <OrdenesCompraClient 
      initialOrdenes={orden}
      initialDepartamentos={departamentos}
      initialProveedores={proveedores}
    />
  )
}