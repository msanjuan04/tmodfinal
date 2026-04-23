"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
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
  CalendarDays,
  CreditCard,
  FileText,
  FileSpreadsheet,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MoreVertical,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react"
import { TerrazeaBrand } from "@/components/terrazea-brand"
import { NotificationsMenu } from "@/components/notifications/NotificationsMenu"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  items: NavItem[]
}

// Organización por secciones para que la barra lateral respire y sea más navegable.
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
      { name: "Calendario", href: "/dashboard/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Gestión",
    items: [
      { name: "Clientes", href: "/dashboard/clients", icon: Users },
      { name: "Proyectos", href: "/dashboard/projects", icon: FolderKanban },
      { name: "Equipo", href: "/dashboard/team", icon: UserCog },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { name: "Presupuestos", href: "/dashboard/budgets", icon: FileSpreadsheet },
      { name: "Facturación", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    title: "Comunicación",
    items: [
      { name: "Documentos", href: "/dashboard/documents", icon: FileText },
      { name: "Mensajes", href: "/dashboard/messages", icon: MessageSquare },
    ],
  },
]

// "Resumen" apunta a la raíz /dashboard, por eso necesita match exacto.
// Para el resto usamos startsWith.
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/"
  return pathname.startsWith(href)
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || ""
  if (!source) return "T"
  const parts = source.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return source.substring(0, 2).toUpperCase()
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { session, logout } = useAuth()
  const isAdmin = session?.role === "admin" || (session?.email ? isSuperAdminEmail(session.email) : false)
  const sessionEmail = session?.email
  const safeEmail = sessionEmail
    ? isSuperAdminEmail(sessionEmail)
      ? SUPER_ADMIN_PRIMARY_EMAIL
      : sessionEmail
    : SUPER_ADMIN_PRIMARY_EMAIL
  const portalSubtitle = isAdmin ? "Portal Admin" : "Portal Cliente"
  const displayName = session?.name ?? "Equipo Terrazea"
  const initials = useMemo(() => getInitials(displayName, safeEmail), [displayName, safeEmail])

  // Renderiza la navegación entera (reutilizable para desktop y mobile)
  const renderNavigation = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isNavActive(location.pathname, item.href)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-[#2F4F4F] text-white shadow-apple-md"
                      : "text-[#4B5563] hover:bg-white hover:text-[#2F4F4F] hover:shadow-apple-sm",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                      active ? "bg-white/10 text-white" : "bg-[#F4F1EA] text-[#2F4F4F] group-hover:bg-[#F4F1EA]",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C6B89E]" />
                  ) : null}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  // Bloque del perfil (desktop)
  const renderProfileBlock = () => (
    <div className="border-t border-[#E8E6E0] p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#F8F7F4] p-3 text-left transition hover:border-[#E8E6E0] hover:bg-white hover:shadow-apple-sm">
            <Avatar className="h-10 w-10 shrink-0 rounded-xl border border-[#E8E6E0] shadow-apple-sm">
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#2F4F4F] to-[#1F3535] text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2F4F4F]">{displayName}</p>
              <p className="truncate text-[11px] text-[#6B7280]">{safeEmail}</p>
            </div>
            <MoreVertical className="h-4 w-4 text-[#9CA3AF] transition group-hover:text-[#2F4F4F]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/dashboard/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/notifications" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              Notificaciones
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
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
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-[#E8E6E0] bg-gradient-to-b from-white via-white to-[#FAFAF8] lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center border-b border-[#E8E6E0] px-6">
            <TerrazeaBrand subtitle={portalSubtitle} />
          </div>

          {/* Navigation agrupada por secciones */}
          {renderNavigation()}

          {/* User Profile */}
          {renderProfileBlock()}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[#E8E6E0] bg-white px-4 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-r border-[#E8E6E0] bg-gradient-to-b from-white to-[#FAFAF8] p-0">
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center border-b border-[#E8E6E0] px-6">
                <TerrazeaBrand subtitle={portalSubtitle} />
              </div>
              {renderNavigation(() => setMobileMenuOpen(false))}
              {renderProfileBlock()}
            </div>
          </SheetContent>
        </Sheet>

        <TerrazeaBrand subtitle={portalSubtitle} collapseSubtitleOnMobile />

        <div className="ml-auto flex items-center gap-2">
          <NotificationsMenu audience="admin" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className="bg-gradient-to-br from-[#2F4F4F] to-[#1F3535] text-[11px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/notifications" className="flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  Notificaciones
                </Link>
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

      {/* Top bar desktop (campana de notificaciones) */}
      <div className="hidden border-b border-[#E8E6E0] bg-white/80 backdrop-blur lg:block lg:pl-64">
        <div className="flex items-center justify-end px-8 py-4">
          <NotificationsMenu audience="admin" buttonVariant="outline" />
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-[#F8F7F4] px-4 py-6 shadow-apple-xl sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
