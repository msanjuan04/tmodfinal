import { useEffect, useMemo, useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
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
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react"

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
              Este es el resumen de tu proyecto <strong>{dashboard.project.name}</strong>. Toda la información se presenta con rigor y se actualiza en tiempo real para que tomes decisiones con confianza.
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

      {/* Cards de métricas mejoradas */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dashboard.metrics.map((metric, index) => (
          <MetricCard key={metric.code} metric={metric} delay={index * 100} />
        ))}
      </section>

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
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Progreso circular mejorado */}
            <div className="flex items-center justify-center gap-8">
              <div className="relative">
                <CircularProgress value={dashboard.project.progressPercent} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-[#2F4F4F]">{Math.round(dashboard.project.progressPercent)}%</p>
                    <p className="text-xs text-[#6B7280]">Completado</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280]">Inicio</span>
                    <span className="font-semibold text-[#2F4F4F]">{formatDate(dashboard.project.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280]">Entrega estimada</span>
                    <span className="font-semibold text-[#2F4F4F]">{formatDate(dashboard.project.estimatedDelivery)}</span>
                  </div>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#E8E6E0]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2F4F4F] to-[#4A6B6B] transition-all duration-1000"
                    style={{ width: `${dashboard.project.progressPercent}%` }}
                  />
                </div>
              </div>
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
                <ActivityItem key={update.id} update={update} />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Timeline de hitos */}
      {dashboard.milestones.length > 0 && (
        <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C6B89E]" />
              <CardTitle className="font-heading text-xl text-[#2F4F4F]">Hitos del proyecto</CardTitle>
            </div>
            <CardDescription className="text-sm text-[#6B7280]">
              Línea de tiempo de los hitos principales de tu proyecto Terrazea.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline milestones={dashboard.milestones} />
          </CardContent>
        </Card>
      )}

      {/* Galería de avances */}
      {dashboard.updates.length > 0 && (
        <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#C6B89E]" />
              <CardTitle className="font-heading text-xl text-[#2F4F4F]">Galería de avances</CardTitle>
            </div>
            <CardDescription className="text-sm text-[#6B7280]">
              Últimas actualizaciones visuales de tu proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Gallery updates={dashboard.updates} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente de Card de Métrica mejorado
function MetricCard({ metric, delay }: { metric: DashboardData["metrics"][number]; delay: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const iconMap: Record<string, typeof TrendingUp> = {
    tasks: FolderKanban,
    messages: MessageSquare,
    documents: FileText,
    team: Users,
    default: TrendingUp,
  }
  const Icon = iconMap[metric.code.toLowerCase()] ?? iconMap.default

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <Card
      className={`group relative overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-md transition-all duration-500 hover:shadow-apple-xl ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{metric.label}</p>
            <p className="mt-3 text-4xl font-bold text-[#2F4F4F] transition-transform duration-300 group-hover:scale-110">
              {metric.value}
            </p>
            {metric.sublabel && (
              <p className="mt-2 text-xs text-[#6B7280]">{metric.sublabel}</p>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-[#2F4F4F] to-[#4A6B6B] text-white shadow-apple transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente de Progreso Circular
function CircularProgress({ value }: { value: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
      <circle
        cx="80"
        cy="80"
        r={radius}
        stroke="#E8E6E0"
        strokeWidth="12"
        fill="none"
        className="opacity-30"
      />
      <circle
        cx="80"
        cy="80"
        r={radius}
        stroke="url(#gradient)"
        strokeWidth="12"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2F4F4F" />
          <stop offset="100%" stopColor="#4A6B6B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function BudgetSummaryCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 shadow-apple ${
        accent ? "border-[#2F4F4F] bg-[#2F4F4F] text-white" : "border-[#E8E6E0] bg-white text-[#2F4F4F]"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

// Componente de Timeline
function Timeline({ milestones }: { milestones: DashboardData["milestones"] }) {
  return (
    <div className="relative space-y-6">
      {milestones.map((milestone, index) => (
        <div key={milestone.id} className="relative flex gap-4">
          {/* Línea vertical */}
          {index < milestones.length - 1 && (
            <div className="absolute left-6 top-12 h-full w-0.5 bg-[#E8E6E0]" />
          )}
          {/* Icono del hito */}
          <div
            className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-apple ${
              milestone.status === "completed"
                ? "bg-[#047857]"
                : milestone.status === "in_progress"
                  ? "bg-[#1D4ED8]"
                  : "bg-[#E8E6E0]"
            }`}
          >
            {milestone.status === "completed" ? (
              <CheckCircle2 className="h-6 w-6 text-white" />
            ) : milestone.status === "in_progress" ? (
              <Clock className="h-6 w-6 text-white" />
            ) : (
              <Calendar className="h-6 w-6 text-[#6B7280]" />
            )}
          </div>
          {/* Contenido del hito */}
          <div className="flex-1 rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] p-5 shadow-apple">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold text-[#2F4F4F]">{milestone.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                  {milestone.scheduledStart && (
                    <span>Inicio: {formatDate(milestone.scheduledStart)}</span>
                  )}
                  {milestone.scheduledEnd && (
                    <span>Fin: {formatDate(milestone.scheduledEnd)}</span>
                  )}
                </div>
                {milestone.status === "in_progress" && milestone.progressPercent > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">Progreso</span>
                      <span className="font-semibold text-[#2F4F4F]">{Math.round(milestone.progressPercent)}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#E8E6E0]">
                      <div
                        className="h-full rounded-full bg-[#1D4ED8] transition-all duration-500"
                        style={{ width: `${milestone.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Badge
                className={`shrink-0 ${
                  milestone.status === "completed"
                    ? "bg-[#DCFCE7] text-[#047857]"
                    : milestone.status === "in_progress"
                      ? "bg-[#DBEAFE] text-[#1D4ED8]"
                      : "bg-[#F8F7F4] text-[#6B7280]"
                }`}
              >
                {milestone.status === "completed"
                  ? "Completado"
                  : milestone.status === "in_progress"
                    ? "En progreso"
                    : "Pendiente"}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Componente de Galería
function Gallery({ updates }: { updates: DashboardData["updates"] }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // Filtrar actualizaciones que puedan tener imágenes (simulado - en producción vendría del backend)
  const imageUpdates = updates.filter((update) => update.type === "success" || update.type === "info").slice(0, 6)

  if (imageUpdates.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-8 text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-[#C6B89E]" />
        <p className="mt-3 text-sm text-[#6B7280]">Aún no hay imágenes de avances disponibles.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {imageUpdates.map((update, index) => (
          <div
            key={update.id}
            className="group relative overflow-hidden rounded-[1.5rem] border border-[#E8E6E0] bg-gradient-to-br from-[#F8F7F4] to-white shadow-apple-md transition-all duration-300 hover:scale-105 hover:shadow-apple-xl"
            onClick={() => setSelectedImage(update.id)}
          >
            <div className="aspect-video flex items-center justify-center bg-[#E8E6E0]/30">
              <ImageIcon className="h-12 w-12 text-[#C6B89E] transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="p-4">
              <p className="font-medium text-[#2F4F4F]">{update.title}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{formatRelative(update.occurredAt)}</p>
            </div>
          </div>
        ))}
      </div>
      {selectedImage && (
        <ImageModal imageId={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </>
  )
}

// Componente de Modal de Imagen
function ImageModal({ imageId, onClose }: { imageId: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl rounded-[2rem] bg-white p-6 shadow-apple-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-full bg-[#F8F7F4] p-2 text-[#2F4F4F] transition hover:bg-[#E8E6E0]"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="aspect-video flex items-center justify-center rounded-[1.5rem] bg-[#F8F7F4]">
          <ImageIcon className="h-16 w-16 text-[#C6B89E]" />
          <p className="ml-4 text-sm text-[#6B7280]">Vista previa de imagen</p>
        </div>
      </div>
    </div>
  )
}

// Componente de Item de Actividad mejorado
function ActivityItem({ update }: { update: DashboardData["updates"][number] }) {
  const iconMap: Record<string, typeof FileText> = {
    success: CheckCircle2,
    info: FileText,
    warning: Clock,
    message: MessageSquare,
  }
  const Icon = iconMap[update.type] ?? FileText
  const colorMap: Record<string, string> = {
    success: "bg-[#DCFCE7] text-[#047857]",
    info: "bg-[#DBEAFE] text-[#1D4ED8]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    message: "bg-[#F3E8FF] text-[#7C3AED]",
  }

  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-[#E8E6E0] bg-white p-4 shadow-apple transition hover:shadow-apple-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorMap[update.type] ?? "bg-[#F8F7F4] text-[#6B7280]"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#2F4F4F]">{update.title}</p>
        {update.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[#6B7280]">{update.description}</p>
        )}
        <p className="mt-2 text-xs text-[#9CA3AF]">{formatRelative(update.occurredAt)}</p>
      </div>
    </div>
  )
}
