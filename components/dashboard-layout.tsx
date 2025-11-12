"use client"

import type React from "react"
import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@app/context/AuthContext"
import { cn } from "@/lib/utils"
import { isSuperAdminEmail, SUPER_ADMIN_PRIMARY_EMAIL } from "@/lib/constants/admin"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserCog,
  Users,
} from "lucide-react"
import { TerrazeaBrand } from "@/components/terrazea-brand"

const navigation = [
  { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendario", href: "/dashboard/calendar", icon: CalendarDays },
  { name: "Proyectos", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Clientes", href: "/dashboard/clients", icon: Users },
  { name: "Pagos", href: "/dashboard/payments", icon: CreditCard },
  { name: "Equipo", href: "/dashboard/team", icon: UserCog },
  { name: "Documentos", href: "/dashboard/documents", icon: FileText },
  { name: "Mensajes", href: "/dashboard/messages", icon: MessageSquare },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { session, logout } = useAuth()
  const isAdmin = session?.role === "admin" || (session?.email ? isSuperAdminEmail(session.email) : false)
  const sessionEmail = session?.email
  const safeEmail = sessionEmail ? (isSuperAdminEmail(sessionEmail) ? SUPER_ADMIN_PRIMARY_EMAIL : sessionEmail) : SUPER_ADMIN_PRIMARY_EMAIL
  const portalSubtitle = isAdmin ? "Portal Admin" : "Portal Cliente"

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-[#e8e6e0] bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-[#e8e6e0] px-6">
            <TerrazeaBrand subtitle={portalSubtitle} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-[#2f4f4f] text-white" : "text-[#6b7280] hover:bg-[#f4f1ea] hover:text-[#2f4f4f]",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-[#e8e6e0] p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#f4f1ea]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">JP</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-[#2f4f4f]">{session?.name ?? "Equipo Terrazea"}</p>
                    <p className="truncate text-xs text-[#6b7280]">{safeEmail}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6b7280]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Notificaciones
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={(event) => {
                    event.preventDefault()
                    void logout()
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[#e8e6e0] bg-white px-4 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center border-b border-[#e8e6e0] px-6">
                <TerrazeaBrand subtitle={portalSubtitle} />
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.href)
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive ? "bg-[#2f4f4f] text-white" : "text-[#6b7280] hover:bg-[#f4f1ea] hover:text-[#2f4f4f]",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <TerrazeaBrand subtitle={portalSubtitle} collapseSubtitleOnMobile />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">JP</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                Notificaciones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onSelect={(event) => {
                  event.preventDefault()
                  void logout()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
