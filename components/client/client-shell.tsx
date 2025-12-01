"use client"

import { useTransition } from "react"
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelsTopLeft,
  User,
  FileSpreadsheet,
  UserCog,
} from "lucide-react"

import { logout } from "@app/lib/api/auth"
import { useAuth } from "@app/context/AuthContext"
import type { SessionData } from "@app/types/session"
import type { ClientProjectSummary } from "@app/types/client"
import { ProjectSwitcher } from "./project-switcher"
import { TerrazeaBrand } from "@/components/terrazea-brand"
import { NotificationsMenu } from "@/components/notifications/NotificationsMenu"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const NAV_ITEMS: NavItem[] = [
  { label: "Resumen", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "Calendario", href: "/client/calendar", icon: CalendarDays },
  { label: "Clientes", href: "/client/clients", icon: User },
  { label: "Proyectos", href: "/client/projects", icon: PanelsTopLeft },
  { label: "Presupuestos", href: "/client/budgets", icon: FileSpreadsheet },
  { label: "Facturación", href: "/client/payments", icon: CreditCard },
  { label: "Equipo", href: "/client/team", icon: UserCog },
  { label: "Documentos", href: "/client/documents", icon: FileText },
  { label: "Mensajes", href: "/client/messages", icon: MessageSquare },
]

interface ClientShellProps {
  user: SessionData
  projects: ClientProjectSummary[]
  children: React.ReactNode
}

export function ClientShell({ user, projects, children }: ClientShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeProjectSlug = searchParams.get("project") ?? projects[0]?.slug ?? null
  const [pending, startTransition] = useTransition()
  const { refresh } = useAuth()

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        await logout()
        await refresh()
        navigate("/login", { replace: true })
      })()
    })
  }

  return (
    <div className="flex min-h-screen bg-[#F4F1EA] text-[#2F4F4F]">
      <aside className="hidden w-64 flex-col border-r border-[#E8E6E0] bg-white/80 px-6 pb-6 pt-10 shadow-apple-lg lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Link to="/" className="flex items-center text-[#2F4F4F]">
          <TerrazeaBrand subtitle="Portal Cliente" />
        </Link>
        <p className="mt-3 text-xs text-[#6B7280]">Zona Cliente · seguimiento profesional Terrazea</p>
        <nav className="mt-10 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={appendProjectParam(item.href, activeProjectSlug, searchParams)}
                className={`group flex items-center gap-3 rounded-[1.1rem] px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-[#2F4F4F] text-white shadow-apple-md" : "text-[#4B5563] hover:bg-[#F4F1EA] hover:text-[#2F4F4F]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="mt-auto rounded-[1.3rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563] lg:sticky lg:bottom-6">
          <p className="font-semibold text-[#2F4F4F]">Soporte Terrazea</p>
          <p className="mt-1 text-xs">¿Dudas? Escríbenos a hola@terrazea.com</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E8E6E0] bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-md"
              aria-label="Abrir navegación"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center text-[#2F4F4F]">
              <TerrazeaBrand subtitle="Portal Cliente" collapseSubtitleOnMobile />
            </Link>
          </div>

          <div className="hidden lg:block">
            <ProjectSwitcher projects={projects} activeProjectSlug={activeProjectSlug} />
          </div>

          <div className="flex items-center gap-4">
            <NotificationsMenu audience="client" />
            <div className="hidden text-right text-sm lg:block">
              <p className="font-semibold text-[#2F4F4F]">{user.name}</p>
              <p className="text-[#6B7280]">{user.email}</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={handleLogout}
                disabled={pending}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-md transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 pb-24 pt-6 sm:px-6">
          <div className="mb-6 lg:hidden">
            <ProjectSwitcher projects={projects} activeProjectSlug={activeProjectSlug} />
          </div>
          {children}
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#E8E6E0] bg-white/95 px-4 py-2 backdrop-blur-md shadow-apple lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={appendProjectParam(item.href, activeProjectSlug, searchParams)}
                className={`flex flex-col items-center gap-1 rounded-full px-3 py-2 text-xs transition ${
                  active ? "text-[#2F4F4F]" : "text-[#6B7280]"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-[#2F4F4F]" : "text-[#9CA3AF]"}`} aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
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
