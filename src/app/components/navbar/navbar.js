"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Home, Wallet, ChartColumnIncreasing, ShoppingCart,
        ReceiptText, Truck, Package, Users, FileText } from "lucide-react"
import Image from "next/image"

export default function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [userInfo, setUserInfo] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    
    // Obtener información del usuario solo al montar el componente
    useEffect(() => {
        const getUserInfo = async () => {
            try {
                const res = await fetch('/api/getSessionUser')
                if (res.ok) {
                    const data = await res.json()
                    setUserInfo(data.usuario)
                    
                    // Si el usuario es Jefe de Departamento y está intentando acceder a /pages/home
                    if (data.usuario.rol === "Jefe de Departamento" && 
                        pathname === "/pages/home" && 
                        data.usuario.departamento) {
                        router.push(`/pages/resumen/${data.usuario.departamento}`)
                    }
                    
                    // Compartir la información del usuario a nivel global
                    // para que otras páginas puedan acceder a ella
                    if (typeof window !== 'undefined') {
                        window.userDepartamento = data.usuario.departamento || '';
                    }
                }
            } catch (error) {
                console.error("Error obteniendo información del usuario:", error)
            } finally {
                setIsLoading(false)
            }
        }
        
        getUserInfo()
        // Eliminamos las dependencias para que solo se ejecute al montar el componente
    }, [])
    
    // Memoizamos la función getNavItems para evitar recálculos innecesarios
    const getNavItems = useCallback((role) => {
        // Items básicos para todos los roles
        const baseItems = [
            { name: "Inicio", href: userInfo?.rol === "Jefe de Departamento" ? `/pages/resumen/${userInfo.departamento}` : "/pages/home", icon: Home },
            { name: "Presupuestos", href: "/pages/presupuestos", icon: Wallet },
            { name: "Inversiones", href: "/pages/inversiones", icon: ChartColumnIncreasing },
            { name: "Órdenes de Compra", href: "/pages/ordenes-compra", icon: ShoppingCart },
            // { name: "Facturas", href: "/pages/facturas", icon: ReceiptText },
            { name: "Proveedores", href: "/pages/proveedores", icon: Truck },
            { name: "Inventario", href: "/pages/inventario", icon: Package },
            { name: "Informes", href: "/pages/informes", icon: FileText },
        ]
        
        // Items adicionales solo para Admin
        const adminItems = [
            { name: "Gestión de Usuarios", href: "/pages/usuarios", icon: Users, bold: true },
        ]
        
        if (role === "Administrador") {
            return [...baseItems, ...adminItems]
        }
        
        return baseItems
    }, [userInfo])
    
    // Determinar los items de navegación según el rol del usuario
    const navItems = userInfo ? getNavItems(userInfo.rol) : []

    // Función para manejar el clic en el logo
    const handleLogoClick = (e) => {
        e.preventDefault();
        if (userInfo?.rol === "Jefe de Departamento" && userInfo.departamento) {
            router.push(`/pages/resumen/${userInfo.departamento}`);
        } else {
            router.push("/pages/home");
        }
    };

    if (isLoading) {
        return <div className="h-full w-64 border-r border-gray-200 flex flex-col fixed left-0 top-0">
            <div className="p-6 flex justify-center">
                <div className="w-60 h-32">
                    <div className="animate-pulse bg-gray-200 h-full w-full"></div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="px-6 py-3 mb-2">
                        <div className="animate-pulse bg-gray-200 h-8 w-full"></div>
                    </div>
                ))}
            </div>
        </div>
    }

    return (
        <div className="h-full w-64 border-r border-gray-200 flex flex-col fixed left-0 top-0">
            <div className="p-6 flex justify-center">
                <div className="w-60 h-32">
                    <a href="#" onClick={handleLogoClick}>
                        <Image
                            src="/images/logo.jpg"
                            alt="Logo Salesianos"
                            width={400}
                            height={400}
                            priority
                            className="object-contain"
                        />
                    </a>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto">
                <ul className="py-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                            <li key={item.name} className="mb-2">
                                <Link
                                    href={item.href}
                                    className={`flex items-center px-6 py-3 whitespace-nowrap ${isActive
                                        ? "text-red-600 bg-red-50 border-l-2 border-red-600" 
                                        : "text-gray-700 hover:bg-gray-100"}`}
                                    prefetch={false}
                                >
                                    <Icon className="w-5 h-5 mr-7 flex-shrink-0" />
                                    <span className={item.bold ? "font-bold" : (isActive ? "font-semibold" : "")}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </div>
    );
}