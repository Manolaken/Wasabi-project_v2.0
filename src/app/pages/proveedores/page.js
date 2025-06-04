import { getDepartamentos } from "@/app/api/functions/departamentos"
import { getProveedores } from "@/app/api/functions/proveedores"
import ProveedoresClient from "./proveedoresClient"

export default async function ProveedoresPage() {
  const departamentos = await getDepartamentos()
  const proveedores = await getProveedores()

  return (
    <ProveedoresClient
      initialProveedores={proveedores}
      initialDepartamentos={departamentos}
    />
  )
}