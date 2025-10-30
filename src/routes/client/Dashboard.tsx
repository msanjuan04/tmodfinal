import { useEffect, useMemo, useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { WelcomeOverlay } from "@/components/client/welcome-overlay"
import { useAuth } from "@app/context/AuthContext"
import { fetchClientDashboard } from "@app/lib/api/client"
import type { DashboardData } from "@app/types/dashboard"

import { useClientRouteContext } from "./ClientLayout"

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/^\w/u, (char) => char.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Pendiente"
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatRelative(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / (1000 * 60))
  if (minutes < 60) return minutes <= 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`
  const hours = Math.round(diffMs / (1000 * 60 * 60))
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  return formatDate(value)
}

export function ClientDashboardPage() {
  const { session } = useAuth()
  const { projects } = useClientRouteContext()
  const [searchParams] = useSearchParams()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestedSlug = searchParams.get("project")
  const activeProjectSlug = useMemo(() => {
    if (requestedSlug && projects.some((project) => project.slug === requestedSlug)) {
      return requestedSlug
    }
    return projects[0]?.slug ?? null
  }, [requestedSlug, projects])

  const showWelcome = searchParams.get("welcome") === "1"

  useEffect(() => {
    if (!activeProjectSlug) {
      setDashboard(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchClientDashboard(activeProjectSlug)
      .then((response) => {
        setDashboard(response.dashboard)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError("No pudimos cargar la información del proyecto.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [activeProjectSlug])

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!activeProjectSlug) {
    return (
      <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Aún no tienes proyectos activos</h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Cuando tu primer proyecto Terrazea esté disponible aparecerá aquí con todos los detalles y seguimiento.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
        <p className="text-sm font-medium text-[#6B7280]">Estamos preparando el resumen de tu proyecto…</p>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-[1.5rem] border border-[#FCA5A5] bg-[#FEF2F2] p-10 text-center shadow-apple-md">
        <h2 className="font-heading text-xl font-semibold text-[#B91C1C]">No pudimos cargar tu proyecto</h2>
        <p className="mt-2 text-sm text-[#B91C1C]">{error ?? "Inténtalo de nuevo en unos segundos."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {showWelcome ? <WelcomeOverlay name={session.name} /> : null}
      <header className="rounded-[2rem] border border-[#E8E6E0] bg-white/80 p-8 shadow-apple-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Panel Terrazea</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold text-[#2F4F4F]">
              Bienvenido de nuevo, {session.name}
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Este es el resumen de tu proyecto <strong>{dashboard.project.name}</strong>. Todo está protegido con nuestra
              capa liquid glass para exteriores premium.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-[#2F4F4F] px-6 py-5 text-white hover:bg-[#1F3535]"
          >
            <a href={`/client/projects?project=${encodeURIComponent(activeProjectSlug)}`}>Ver detalles del proyecto</a>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-lg">
          <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-heading text-xl text-[#2F4F4F]">Progreso del proyecto</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                {dashboard.project.code ? `Código ${dashboard.project.code} · ` : ""}
                Estado: {formatStatus(dashboard.project.status)}
              </CardDescription>
            </div>
            <div className="rounded-full border border-[#E8E6E0] bg-[#F4F1EA] px-4 py-2 text-sm text-[#2F4F4F]">
              Avance {Math.round(dashboard.project.progressPercent)}%
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <Progress value={dashboard.project.progressPercent} className="h-3 bg-[#E8E6E0]/60" />
              <div className="mt-3 flex gap-4 text-xs text-[#6B7280]">
                <span>Inicio: {formatDate(dashboard.project.startDate)}</span>
                <span>Entrega estimada: {formatDate(dashboard.project.estimatedDelivery)}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.metrics.map((metric) => (
                <div
                  key={metric.code}
                  className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] p-5 shadow-apple hover:bg-white"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{metric.value}</p>
                  {metric.sublabel ? <p className="mt-1 text-xs text-[#6B7280]">{metric.sublabel}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-[#2F4F4F]">Última actividad</CardTitle>
            <CardDescription className="text-sm text-[#6B7280]">
              Documentos subidos, mensajes y actualizaciones recientes de tu equipo Terrazea.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.updates.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Sin actividad reciente. Te avisaremos cuando haya novedades.</p>
            ) : (
              dashboard.updates.slice(0, 5).map((update) => (
                <div
                  key={update.id}
                  className="rounded-[1.25rem] border border-[#E8E6E0] bg-white px-4 py-3 text-sm text-[#4B5563]"
                >
                  <p className="font-medium text-[#2F4F4F]">{update.title}</p>
                  <p className="line-clamp-2 text-xs text-[#6B7280]">{update.description}</p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">{formatRelative(update.occurredAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
