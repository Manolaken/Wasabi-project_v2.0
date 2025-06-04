import Image from "next/image"
import Link from "next/link"
import { getDepartamentos } from "@/app/api/functions/departamentos"

const departmentImages = {
  Informática: "/images/informatica.jpg",
  Robótica: "/images/robotica.jpg",
  Mecánica: "/images/mecanica.jpg",
  Electricidad: "/images/electricidad.jpg",
  Automoción: "/images/automocion.webp",
}

export default async function Page() {
  const departamentos = await getDepartamentos()

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Departamentos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departamentos.map((departamento) => {
          const id = departamento.id || departamento.id_Departamento
          const nombre = departamento.Nombre

          const imagen = departmentImages[nombre]

          return (
            <Link
              href={`/pages/resumen/${nombre}`}
              key={id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-48 relative">
                <Image
                  src={imagen || "/placeholder.svg"}
                  alt={`Departamento de ${nombre}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-2 text-center border-t border-gray-200 bg-gray-100">
                <h2 className="text-base">{nombre}</h2>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
