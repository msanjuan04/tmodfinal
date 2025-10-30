"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-bold text-[#2f4f4f] sm:text-4xl">
          Bienvenido{data.project.clientName ? `, ${data.project.clientName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-lg text-[#6b7280]">Aquí está el estado actual de tu proyecto</p>
      </header>

      <Card className="border-[#e8e6e0] bg-gradient-to-br from-[#2f4f4f] to-[#1f3535] text-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-serif text-2xl text-white">{data.project.name}</CardTitle>
              {data.project.code && <CardDescription className="mt-2 text-white/80">Proyecto #{data.project.code}</CardDescription>}
            </div>
            <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30">
              {formatStatusLabel(data.project.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/90">Progreso General</span>
              <span className="font-semibold">{Math.round(data.project.progressPercent)}%</span>
            </div>
            <Progress value={data.project.progressPercent} className="h-3 bg-white/20" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ProjectMeta icon={Calendar} label="Inicio" value={startDateLabel} />
            <ProjectMeta icon={Clock} label="Entrega estimada" value={estimatedDeliveryLabel} />
            <ProjectMeta icon={TrendingUp} label="Días restantes" value={remainingDaysLabel} />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((metric) => {
          const iconConfig = METRIC_ICON_MAP[metric.code] ?? METRIC_ICON_MAP.documents_total
          const Icon = iconConfig.icon
          return (
            <Card key={metric.code} className="border-[#e8e6e0]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#6b7280]">{metric.label}</CardTitle>
                <Icon className={`h-4 w-4 ${iconConfig.className}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2f4f4f]">{formatMetricValue(metric)}</div>
                {metric.sublabel && <p className="mt-1 text-xs text-[#6b7280]">{metric.sublabel}</p>}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#e8e6e0]">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#2f4f4f]">Actualizaciones Recientes</CardTitle>
            <CardDescription>Últimas novedades de tu proyecto</CardDescription>
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
              className="w-full border-[#e8e6e0] bg-transparent text-[#2f4f4f] hover:bg-[#f4f1ea]"
            >
              Ver todas las actualizaciones
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#e8e6e0]">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#2f4f4f]">Tu Equipo</CardTitle>
            <CardDescription>Profesionales trabajando en tu proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.team.length === 0 && <p className="text-sm text-[#6b7280]">Aún no se han asignado miembros al proyecto.</p>}
            {data.team.map((member) => (
              <TeamMember
                key={member.id}
                name={member.name}
                role={member.role}
                avatar={member.avatarUrl ?? "/placeholder.svg?height=40&width=40"}
                status={member.status === "online" ? "online" : "offline"}
              />
            ))}

            <Button
              variant="outline"
              className="w-full border-[#e8e6e0] bg-transparent text-[#2f4f4f] hover:bg-[#f4f1ea]"
            >
              Contactar al equipo
              <MessageSquare className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-[#e8e6e0]">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-[#2f4f4f]">Próximos Hitos</CardTitle>
          <CardDescription>Fases importantes que se completarán pronto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.milestones.length === 0 && <p className="text-sm text-[#6b7280]">Sin hitos registrados.</p>}
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
