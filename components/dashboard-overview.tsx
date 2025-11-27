"use client"

import React, { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,en 
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  MessageSquare,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import type { DashboardData } from "@/lib/supabase/queries"

type DashboardFilter = "all" | "project" | "communication" | "media"

const METRIC_ICON_MAP: Record<
  string,
  {
    icon: LucideIcon
    className: string
  }
> = {
  milestones_completed: { icon: CheckCircle2, className: "text-green-600" },
  documents_total: { icon: FileText, className: "text-[#c6b89e]" },
  messages_total: { icon: MessageSquare, className: "text-blue-600" },
  photos_total: { icon: ImageIcon, className: "text-purple-600" },
}

const UPDATE_ICON_MAP: Record<
  "success" | "info" | "warning" | "message",
  {
    icon: LucideIcon
    className: string
  }
> = {
  success: { icon: CheckCircle2, className: "text-green-600" },
  info: { icon: FileText, className: "text-[#c6b89e]" },
  warning: { icon: AlertCircle, className: "text-orange-500" },
  message: { icon: MessageSquare, className: "text-blue-600" },
}

export function DashboardOverview({ data }: { data: DashboardData }) {
  const startDateLabel = formatDate(data.project.startDate)
  const estimatedDeliveryLabel = formatDate(data.project.estimatedDelivery)
  const remainingDaysLabel = formatDays(data.project.remainingDays)
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all")

  const filteredMetrics = useMemo(() => {
    if (activeFilter === "all") return data.metrics
    if (activeFilter === "project") {
      return data.metrics.filter((m) => m.code.includes("milestones") || m.code.includes("projects"))
    }
    if (activeFilter === "communication") {
      return data.metrics.filter((m) => m.code.includes("messages") || m.code.includes("documents"))
    }
    if (activeFilter === "media") {
      return data.metrics.filter((m) => m.code.includes("photos"))
    }
    return data.metrics
  }, [activeFilter, data.metrics])

  return (
    <div className="space-y-8">
      {/* Top bar / hero */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold text-[#2f4f4f] lg:text-4xl">
            Panel de control
          </h1>
          <p className="max-w-xl text-sm text-[#6b7280]">
            Resumen del proyecto{" "}
            <span className="font-semibold text-[#2f4f4f]">{data.project.name}</span> y su actividad reciente.
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-3">
          <div className="relative flex-1">
            <Input
              type="search"
              placeholder="Buscar proyectos, clientes o documentos…"
              className="h-10 rounded-full border-[#e5e7eb] bg-white/70 px-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-apple">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">AD</AvatarFallback>
            </Avatar>
            <div className="hidden text-xs text-[#4b5563] sm:block">
              <p className="font-medium">Admin</p>
              <p className="text-[11px] text-[#9ca3af]">Vista general</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter pills */}
      <section className="flex flex-wrap gap-2">
        <DashboardFilterPill label="Todo" value="all" active={activeFilter} onChange={setActiveFilter} />
        <DashboardFilterPill label="Proyecto" value="project" active={activeFilter} onChange={setActiveFilter} />
        <DashboardFilterPill
          label="Comunicación"
          value="communication"
          active={activeFilter}
          onChange={setActiveFilter}
        />
        <DashboardFilterPill label="Medios" value="media" active={activeFilter} onChange={setActiveFilter} />
      </section>

      {/* Main grid: chart + right column */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        {/* Main chart / project health */}
        <Card className="overflow-hidden rounded-[1.75rem] border-[#e8e6e0] bg-gradient-to-br from-[#2f4f4f] via-[#243b3b] to-[#1f3535] text-white shadow-apple-xl">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl text-white">Flujo del proyecto</CardTitle>
              <CardDescription className="text-xs text-white/70">
                Progreso general y ritmo de avance por hitos.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-200">
                {formatStatusLabel(data.project.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/80">Progreso general</span>
                <span className="font-semibold">{Math.round(data.project.progressPercent)}%</span>
              </div>
              <Progress value={data.project.progressPercent} className="h-2.5 rounded-full bg-white/10" />
            </div>

            {/* Pseudo revenue flow with milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Ritmo por hitos</span>
                <span>{data.milestones.length || 0} hitos en curso</span>
              </div>
              <div className="flex items-end gap-3 rounded-[1.5rem] bg-black/10 p-3">
                {data.milestones.slice(0, 6).map((milestone) => {
                  const height = Math.max(20, Math.min(100, milestone.progressPercent || 0))
                  return (
                    <div key={milestone.id} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="relative w-full overflow-hidden rounded-[999px] bg-emerald-500/30"
                        style={{ height: `${height}px` }}
                      >
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(248,247,244,0.2)_0,rgba(248,247,244,0.2)_4px,transparent_4px,transparent_8px)]" />
                      </div>
                      <span className="truncate text-[10px] text-white/70">
                        {milestone.title.length > 10 ? `${milestone.title.slice(0, 10)}…` : milestone.title}
                      </span>
                    </div>
                  )
                })}
                {data.milestones.length === 0 && (
                  <p className="w-full text-center text-xs text-white/60">
                    Añade hitos al proyecto para ver aquí su distribución.
                  </p>
                )}
              </div>

              <div className="grid gap-3 pt-1 text-[11px] text-white/80 sm:grid-cols-3">
                <ProjectMeta icon={Calendar} label="Inicio" value={startDateLabel} />
                <ProjectMeta icon={Clock} label="Entrega estimada" value={estimatedDeliveryLabel} />
                <ProjectMeta icon={TrendingUp} label="Días restantes" value={remainingDaysLabel} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column cards */}
        <div className="space-y-4">
          <RightColumnSummaryCard data={data} />
          <RightColumnActivityCard data={data} />
        </div>
      </section>

      {/* Lower stats: doughnut + quick cards */}
      <section className="grid gap-6 lg:grid-cols-4">
        <DoughnutCard data={data} />
        <StatsMiniCard
          label="Documentos"
          metric={data.metrics.find((m) => m.code === "documents_total")}
          accent="bg-emerald-100 text-emerald-700"
        />
        <StatsMiniCard
          label="Mensajes"
          metric={data.metrics.find((m) => m.code === "messages_total")}
          accent="bg-sky-100 text-sky-700"
        />
        <StatsMiniCard
          label="Fotos"
          metric={data.metrics.find((m) => m.code === "photos_total")}
          accent="bg-violet-100 text-violet-700"
        />
      </section>

      {/* Activity + milestones / team */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
        <Card className="rounded-[1.5rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-[#2f4f4f]">Actividad reciente</CardTitle>
            <CardDescription className="text-sm text-[#6b7280]">
              Últimas novedades registradas en el proyecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.updates.length === 0 && (
              <p className="text-sm text-[#6b7280]">Aún no hay actualizaciones registradas.</p>
            )}
            {data.updates.map((update) => {
              const iconConfig = UPDATE_ICON_MAP[update.type] ?? UPDATE_ICON_MAP.info
              const Icon = iconConfig.icon
              return (
                <UpdateItem
                  key={update.id}
                  icon={<Icon className={`h-5 w-5 ${iconConfig.className}`} />}
                  title={update.title}
                  description={update.description ?? ""}
                  time={formatRelative(update.occurredAt)}
                />
              )
            })}
            <Button
              variant="outline"
              className="mt-2 w-full rounded-full border-[#e8e6e0] bg-transparent text-[#2f4f4f] hover:bg-[#f4f1ea]"
            >
              Ver todas las actualizaciones
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-[#2f4f4f]">Tu equipo</CardTitle>
              <CardDescription className="text-sm text-[#6b7280]">
                Profesionales trabajando en este proyecto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.team.length === 0 && (
                <p className="text-sm text-[#6b7280]">Aún no se han asignado miembros al proyecto.</p>
              )}
              {data.team.map((member) => (
                <TeamMember
                  key={member.id}
                  name={member.name}
                  role={member.role}
                  avatar={member.avatarUrl ?? "/placeholder.svg?height=40&width=40"}
                  status={member.status === "online" ? "online" : "offline"}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-[#2f4f4f]">Próximos hitos</CardTitle>
              <CardDescription className="text-sm text-[#6b7280]">
                Fases importantes que se completarán pronto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.milestones.length === 0 && (
                  <p className="text-sm text-[#6b7280]">Sin hitos registrados.</p>
                )}
                {data.milestones.map((milestone) => (
                  <MilestoneItem
                    key={milestone.id}
                    title={milestone.title}
                    startDate={milestone.scheduledStart}
                    endDate={milestone.scheduledEnd}
                    progress={milestone.progressPercent}
                    status={milestone.status}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function DashboardFilterPill({
  label,
  value,
  active,
  onChange,
}: {
  label: string
  value: DashboardFilter
  active: DashboardFilter
  onChange: (value: DashboardFilter) => void
}) {
  const isActive = active === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`
        rounded-full px-4 py-1.5 text-xs font-semibold transition
        ${isActive ? "bg-[#2f4f4f] text-white shadow-apple" : "bg-white/80 text-[#4b5563] hover:bg-[#f4f1ea]"}
      `}
    >
      {label}
    </button>
  )
}

function RightColumnSummaryCard({ data }: { data: DashboardData }) {
  const progress = Math.round(data.project.progressPercent)
  const totalUpdates = data.updates.length
  const totalDocs = data.metrics.find((m) => m.code === "documents_total")

  return (
    <Card className="rounded-[1.75rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-lg text-[#111827]">Resumen rápido</CardTitle>
        <CardDescription className="text-sm text-[#6b7280]">
          Estado general del proyecto y actividad clave.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-[1.25rem] bg-[#f8f7f4] px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#c6b89e]">Progreso</p>
            <p className="mt-1 text-lg font-semibold text-[#2f4f4f]">{progress}%</p>
          </div>
          <div className="h-14 w-14 rounded-full border-4 border-[#e5e7eb] bg-white/80 p-1">
            <div
              className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {progress}%
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-[#374151] sm:grid-cols-2">
          <div className="space-y-1 rounded-[1.1rem] bg-[#f8f7f4] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#c6b89e]">Actualizaciones</p>
            <p className="text-base font-semibold text-[#111827]">{totalUpdates}</p>
            <p className="text-[11px] text-[#6b7280]">Eventos recientes registrados</p>
          </div>
          <div className="space-y-1 rounded-[1.1rem] bg-[#f8f7f4] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#c6b89e]">Documentos</p>
            <p className="text-base font-semibold text-[#111827]">
              {totalDocs ? formatMetricValue(totalDocs) : "—"}
            </p>
            <p className="text-[11px] text-[#6b7280]">Archivos compartidos con el cliente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RightColumnActivityCard({ data }: { data: DashboardData }) {
  const emptyMetric = { code: "", value: 0 }

  return (
    <Card className="rounded-[1.75rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg text-[#111827]">Actividad reciente</CardTitle>
        <CardDescription className="text-sm text-[#6b7280]">
          Últimos mensajes, documentos y fotos añadidas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[#374151]">
        <div className="flex items-center justify-between rounded-[1.1rem] bg-[#f8f7f4] px-3 py-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#2f4f4f]" />
            <span>Mensajes del proyecto</span>
          </div>
          <span className="text-xs text-[#6b7280]">
            {formatMetricValue((data.metrics.find((m) => m.code === "messages_total") as any) ?? emptyMetric)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[1.1rem] bg-[#f8f7f4] px-3 py-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2f4f4f]" />
            <span>Documentos activos</span>
          </div>
          <span className="text-xs text-[#6b7280]">
            {formatMetricValue((data.metrics.find((m) => m.code === "documents_total") as any) ?? emptyMetric)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[1.1rem] bg-[#f8f7f4] px-3 py-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#2f4f4f]" />
            <span>Fotos subidas</span>
          </div>
          <span className="text-xs text-[#6b7280]">
            {formatMetricValue((data.metrics.find((m) => m.code === "photos_total") as any) ?? emptyMetric)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function DoughnutCard({ data }: { data: DashboardData }) {
  const documents = Number(
    data.metrics.find((m) => m.code === "documents_total")?.value ?? 0,
  )
  const messages = Number(
    data.metrics.find((m) => m.code === "messages_total")?.value ?? 0,
  )
  const photos = Number(
    data.metrics.find((m) => m.code === "photos_total")?.value ?? 0,
  )
  const total = Math.max(documents + messages + photos, 1)

  return (
    <Card className="col-span-2 rounded-[1.75rem] border-[#e8e6e0] bg-white/95 shadow-apple-md lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base text-[#2f4f4f]">
          Distribución de actividad
        </CardTitle>
        <CardDescription className="text-xs text-[#6b7280]">
          Cómo se reparte la actividad entre documentos, mensajes y fotos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative mx-auto h-32 w-32">
          <div
            className="h-full w-full rounded-full"
            style={{
              backgroundImage: `conic-gradient(#0d9488 0 ${ (documents / total) * 360 }deg,#4f46e5 ${
                (documents / total) * 360
              }deg ${(documents + messages) / total * 360}deg,#f97316 ${
                ((documents + messages) / total) * 360
              }deg 360deg)`,
            }}
          />
          <div className="absolute inset-4 rounded-full bg-white/95 shadow-inner" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">Total</p>
              <p className="text-lg font-semibold text-[#111827]">{total}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-xs text-[#4b5563]">
          <LegendRow label="Documentos" value={documents} colorClass="bg-[#0d9488]" />
          <LegendRow label="Mensajes" value={messages} colorClass="bg-[#4f46e5]" />
          <LegendRow label="Fotos" value={photos} colorClass="bg-[#f97316]" />
        </div>
      </CardContent>
    </Card>
  )
}

function LegendRow({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center justify-between rounded-full bg-[#f8f7f4] px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
        <span className="text-[11px] font-medium text-[#374151]">{label}</span>
      </div>
      <span className="text-[11px] text-[#6b7280]">{value}</span>
    </div>
  )
}

function StatsMiniCard({
  label,
  metric,
  accent,
}: {
  label: string
  metric: { value: number | string } | undefined
  accent: string
}) {
  return (
    <Card className="rounded-[1.5rem] border-[#e8e6e0] bg-white/95 shadow-apple-md">
      <CardContent className="space-y-2 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c6b89e]">{label}</p>
        <p className="text-xl font-semibold text-[#2f4f4f]">
          {metric ? formatMetricValue({ ...(metric as any), label: "", code: "" }) : "—"}
        </p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${accent}`}>
          Esta semana
        </span>
      </CardContent>
    </Card>
  )
}

function UpdateItem({
  icon,
  title,
  description,
  time,
}: {
  icon: React.ReactNode
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-[#2f4f4f]">{title}</p>
        <p className="text-sm text-[#6b7280]">{description}</p>
        <p className="text-xs text-[#9ca3af]">{time}</p>
      </div>
    </div>
  )
}

function TeamMember({
  name,
  role,
  avatar,
  status,
}: {
  name: string
  role: string
  avatar: string
  status: "online" | "offline"
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar || "/placeholder.svg"} />
          <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
            status === "online" ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#2f4f4f]">{name}</p>
        <p className="text-xs text-[#6b7280]">{role}</p>
      </div>
      <Button variant="ghost" size="sm" className="text-[#2f4f4f]">
        <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  )
}

function MilestoneItem({
  title,
  startDate,
  endDate,
  progress,
  status,
}: {
  title: string
  startDate: string | null
  endDate: string | null
  progress: number
  status: "completed" | "in_progress" | "pending"
}) {
  const statusIcon =
    status === "completed" ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : status === "in_progress" ? (
      <Clock className="h-5 w-5 text-blue-600" />
    ) : (
      <Calendar className="h-5 w-5 text-[#9ca3af]" />
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <p className="text-sm font-medium text-[#2f4f4f]">{title}</p>
            <p className="text-xs text-[#6b7280]">{formatDateRange(startDate, endDate)}</p>
          </div>
        </div>
        <span className="text-sm font-medium text-[#2f4f4f]">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}

function ProjectMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (!value) return "Sin definir"
  const date = new Date(value)
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

function formatDays(days: number | null): string {
  if (typeof days !== "number") return "Sin datos"
  return `${days} ${days === 1 ? "día" : "días"}`
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/u, (char) => char.toUpperCase())
}

function formatMetricValue(metric: { code: string; value: number }): string {
  if (metric.code === "milestones_completed") {
    return `${metric.value}`
  }
  return `${metric.value}`
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "Por confirmar"
  if (startDate && endDate) {
    const start = formatDate(startDate)
    const end = formatDate(endDate)
    const [startDay, startMonth] = start.split(" ")
    const [endDay, endMonth, endYear] = end.split(" ")
    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${endMonth} ${endYear}`
    }
    return `${start} - ${end}`
  }
  return formatDate(startDate ?? endDate)
}

function formatRelative(value: string): string {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()

  const minutes = Math.round(diff / (1000 * 60))
  if (minutes < 60) return minutes <= 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`

  const hours = Math.round(diff / (1000 * 60 * 60))
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`

  const days = Math.round(diff / (1000 * 60 * 60 * 24))
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`

  return formatDate(value)
}
