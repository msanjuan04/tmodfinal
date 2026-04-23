"use client"

import { useMemo, useState, useTransition } from "react"
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MoreVertical,
  PanelsTopLeft,
  User,
  type LucideIcon,
} from "lucide-react"

import { logout } from "@app/lib/api/auth"
import { useAuth } from "@app/context/AuthContext"
import { cn } from "@/lib/utils"
import type { SessionData } from "@app/types/session"
import type { ClientProjectSummary } from "@app/types/client"
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
import { ProjectSwitcher } from "./project-switcher"
import { TerrazeaBrand } from "@/components/terrazea-brand"
import { NotificationsMenu } from "@/components/notifications/NotificationsMenu"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavSection {
  title: string
  items: NavItem[]
}

// Solo las secciones que un cliente debe ver (nada de Clientes / Equipo / Presupuestos).
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Mi proyecto",
    items: [
      { label: "Resumen", href: "/client/dashboard", icon: LayoutDashboard },
      { label: "Proyectos", href: "/client/projects", icon: PanelsTopLeft },
      { label: "Calendario", href: "/client/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Documentos", href: "/client/documents", icon: FileText },
      { label: "Facturación", href: "/client/payments", icon: CreditCard },
    ],
  },
  {
    title: "Contacto",
    items: [{ label: "Mensajes", href: "/client/messages", icon: MessageSquare }],
  },
]

interface ClientShellProps {
  user: SessionData
  projects: ClientProjectSummary[]
  children: React.ReactNode
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/client/dashboard") {
    return pathname === "/client/dashboard" || pathname === "/client/dashboard/"
  }
  return pathname.startsWith(href)
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || ""
  if (!source) return "T"
  const parts = source.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return source.substring(0, 2).toUpperCase()
}

export function ClientShell({ user, projects, children }: ClientShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeProjectSlug = searchParams.get("project") ?? projects[0]?.slug ?? null
  const [pending, startTransition] = useTransition()
  const { refresh } = useAuth()
  const initials = useMemo(() => getInitials(user.name, user.email), [user.name, user.email])

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        await logout()
        await refresh()
        navigate("/login", { replace: true })
      })()
    })
  }

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
                  key={item.href}
                  to={appendProjectParam(item.href, activeProjectSlug, searchParams)}
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
                      active ? "bg-white/10 text-white" : "bg-[#F4F1EA] text-[#2F4F4F]",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#C6B89E]" /> : null}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

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
              <p className="truncate text-sm font-semibold text-[#2F4F4F]">{user.name ?? "Cliente Terrazea"}</p>
              <p className="truncate text-[11px] text-[#6B7280]">{user.email}</p>
            </div>
            <MoreVertical className="h-4 w-4 text-[#9CA3AF] transition group-hover:text-[#2F4F4F]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to={appendProjectParam("/client/profile", activeProjectSlug, searchParams)}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault()
              handleLogout()
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
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-[#E8E6E0] bg-gradient-to-b from-white via-white to-[#FAFAF8] lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center border-b border-[#E8E6E0] px-6">
            <TerrazeaBrand subtitle="Portal Cliente" />
          </div>
          {renderNavigation()}
          {renderProfileBlock()}
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[#E8E6E0] bg-white px-4 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 border-r border-[#E8E6E0] bg-gradient-to-b from-white to-[#FAFAF8] p-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center border-b border-[#E8E6E0] px-6">
                <TerrazeaBrand subtitle="Portal Cliente" />
              </div>
              {renderNavigation(() => setMobileMenuOpen(false))}
              {renderProfileBlock()}
            </div>
          </SheetContent>
        </Sheet>

        <TerrazeaBrand subtitle="Portal Cliente" collapseSubtitleOnMobile />

        <div className="ml-auto flex items-center gap-2">
          <NotificationsMenu audience="client" />
        </div>
      </header>

      {/* Top bar desktop con switcher de proyecto + notifications */}
      <div className="hidden border-b border-[#E8E6E0] bg-white/80 backdrop-blur lg:block lg:pl-64">
        <div className="flex items-center justify-between gap-4 px-8 py-4">
          <ProjectSwitcher projects={projects} activeProjectSlug={activeProjectSlug} />
          <NotificationsMenu audience="client" buttonVariant="outline" />
        </div>
      </div>

      {/* Main */}
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {/* Switcher mobile */}
          <div className="mb-6 lg:hidden">
            <ProjectSwitcher projects={projects} activeProjectSlug={activeProjectSlug} />
          </div>
          <div className="rounded-[2rem] bg-[#F8F7F4] px-4 py-6 shadow-apple-xl sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function appendProjectParam(href: string, slug: string | null, searchParams: URLSearchParams) {
  if (!slug) return href
  const params = new URLSearchParams(searchParams.toString())
  params.set("project", slug)
  params.delete("welcome")
  return `${href}?${params.toString()}`
}
