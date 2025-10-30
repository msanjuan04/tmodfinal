"use client"

import type React from "react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectTasksManager } from "@/components/project/project-tasks-manager"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ImageIcon,
  MapPin,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { ProjectDetailsData } from "@/lib/supabase/queries"

const ACTIVITY_ICON: Record<
  "completed" | "info" | "warning",
  {
    icon: LucideIcon
    className: string
  }
> = {
  completed: { icon: CheckCircle2, className: "text-green-600" },
  info: { icon: AlertCircle, className: "text-blue-600" },
  warning: { icon: AlertCircle, className: "text-orange-500" },
}

export function ProjectDetails({ data }: { data: ProjectDetailsData }) {
  const photos = useMemo(() => {
    if (data.photos.length > 0) {
      return data.photos
    }
    return [
      {
        id: "placeholder",
        url: "/placeholder.svg?height=400&width=700",
        caption: "Aún no hay fotos cargadas",
        takenAt: null,
        sortOrder: 0,
      },
    ]
  }, [data.photos])

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [projectProgress, setProjectProgress] = useState(data.project.progressPercent)

  const safeIndex = Math.min(selectedPhotoIndex, photos.length - 1)
  const activePhoto = photos[safeIndex]

  const totalPhotos = data.photoSummary.totalPhotos ?? photos.length
  const photoSummaryLabel = data.photoSummary.lastUpdate ? formatDate(data.photoSummary.lastUpdate) : "Sin fecha"

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <span>Proyectos</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#2f4f4f]">{data.project.name}</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#2f4f4f] sm:text-4xl">{data.project.name}</h1>
            {data.project.code && <p className="mt-2 text-lg text-[#6b7280]">Proyecto #{data.project.code}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-[#e8e6e0] bg-transparent text-[#2f4f4f] hover:bg-[#f4f1ea]">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
            <Button className="bg-[#2f4f4f] text-white hover:bg-[#1f3535]">
              <Download className="mr-2 h-4 w-4" />
              Descargar Informe
            </Button>
          </div>
        </div>
      </div>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          title="Estado"
          icon={Clock}
          badge={formatStatusLabel(data.project.status)}
          subtitle={`${Math.round(projectProgress)}% completado`}
        />
        <InfoCard
          title="Ubicación"
          icon={MapPin}
          description={data.project.locationCity ?? "Sin definir"}
          subtitle={data.project.locationNotes ?? ""}
        />
        <InfoCard
          title="Duración"
          icon={Calendar}
          description={formatDays(data.project.totalDays)}
          subtitle={`${formatDays(data.project.remainingDays)} restantes`}
        />
        <InfoCard
          title="Equipo"
          icon={Users}
          description={`${data.teamSummary.totalMembers} profesionales`}
          subtitle={`${data.teamSummary.activeMembers} activos hoy`}
        />
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="border border-[#e8e6e0] bg-white">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="timeline">Cronograma</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="specs">Especificaciones</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-[#e8e6e0]">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[#2f4f4f]">Progreso General</CardTitle>
              <CardDescription>Estado actual de las diferentes fases del proyecto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2f4f4f]">Progreso Total</span>
                  <span className="text-sm font-semibold text-[#2f4f4f]">{Math.round(projectProgress)}%</span>
                </div>
                <Progress value={projectProgress} className="h-3" />
              </div>

              <div className="space-y-4">
                {data.phases.map((phase) => (
                  <PhaseProgress
                    key={phase.id}
                    phase={phase.name}
                    progress={phase.progressPercent}
                    status={phase.status}
                  />
                ))}
                {data.phases.length === 0 && <p className="text-sm text-[#6b7280]">Sin fases definidas.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#e8e6e0]">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[#2f4f4f]">Actividad Reciente</CardTitle>
              <CardDescription>Últimas actualizaciones del proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.activity.length === 0 && <p className="text-sm text-[#6b7280]">Sin actividad registrada.</p>}
                {data.activity.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    date={formatRelative(activity.occurredAt)}
                    title={activity.title}
                    description={activity.description ?? ""}
                    status={activity.status}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card className="border-[#e8e6e0]">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[#2f4f4f]">Cronograma del Proyecto</CardTitle>
              <CardDescription>Hitos planificados y su estado actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.milestones.length === 0 && <p className="text-sm text-[#6b7280]">Sin hitos registrados.</p>}
                {data.milestones.map((milestone) => (
                  <TimelineItem
                    key={milestone.id}
                    phase={milestone.title}
                    dateRange={formatDateRange(milestone.scheduledStart, milestone.scheduledEnd)}
                    status={milestone.status}
                    progress={milestone.progressPercent}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <Card className="border-[#e8e6e0]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-xl text-[#2f4f4f]">Galería del Proyecto</CardTitle>
                  <CardDescription>Seguimiento fotográfico del progreso</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-[#f4f1ea] text-[#2f4f4f]">
                  <ImageIcon className="mr-1 h-3 w-3" />
                  {totalPhotos} fotos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#e8e6e0]">
                <img
                  src={activePhoto.url || "/placeholder.svg"}
                  alt={activePhoto.caption ?? "Fotografía de proyecto"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
                  <p className="text-sm font-medium">{activePhoto.caption}</p>
                  <p className="text-xs text-white/80">{formatDate(activePhoto.takenAt)}</p>
                </div>
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 text-[#2f4f4f] hover:bg-white"
                      onClick={() => setSelectedPhotoIndex(safeIndex > 0 ? safeIndex - 1 : photos.length - 1)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 text-[#2f4f4f] hover:bg-white"
                      onClick={() => setSelectedPhotoIndex(safeIndex < photos.length - 1 ? safeIndex + 1 : 0)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`relative aspect-video overflow-hidden rounded-lg transition-all ${
                      safeIndex === index ? "ring-2 ring-[#2f4f4f] ring-offset-2" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={photo.url || "/placeholder.svg"} alt={photo.caption ?? ""} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6b7280]">
                <span>Última actualización: {photoSummaryLabel}</span>
                <span>Ordenadas por relevancia del proyecto</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[#e8e6e0]">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-[#2f4f4f]">Detalles Técnicos</CardTitle>
                <CardDescription>Especificaciones principales del proyecto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {SPEC_DETAILS.map((spec) => (
                  <SpecItem key={spec.label} label={spec.label} value={spec.value} />
                ))}
              </CardContent>
            </Card>

            <Card className="border-[#e8e6e0]">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-[#2f4f4f]">Materiales Principales</CardTitle>
                <CardDescription>Componentes utilizados en la construcción</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {MATERIALS.map((material) => (
                  <MaterialItem
                    key={material.name}
                    name={material.name}
                    quantity={material.quantity}
                    status={material.status}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#e8e6e0]">
            <CardHeader>
              <CardTitle className="font-serif text-xl text-[#2f4f4f]">Certificaciones y Permisos</CardTitle>
              <CardDescription>Documentación legal y técnica</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {CERTIFICATIONS.map((cert) => (
                  <CertificationItem
                    key={cert.name}
                    name={cert.name}
                    status={cert.status}
                    date={cert.date}
                    icon={<cert.icon className={`h-5 w-5 ${cert.className}`} />}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PhaseProgress({
  phase,
  progress,
  status,
}: {
  phase: string
  progress: number
  status: "completed" | "in_progress" | "pending"
}) {
  const icon =
    status === "completed" ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : status === "in_progress" ? (
      <Clock className="h-4 w-4 text-blue-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-[#9ca3af]" />
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[#2f4f4f]">{phase}</span>
        </div>
        <span className="text-sm font-medium text-[#6b7280]">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}

function ActivityItem({
  date,
  title,
  description,
  status,
}: {
  date: string
  title: string
  description: string
  status: "completed" | "info" | "warning"
}) {
  const config = ACTIVITY_ICON[status]
  const Icon = config.icon

  return (
    <div className="flex gap-4">
      <Icon className={`h-5 w-5 ${config.className}`} />
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-[#2f4f4f]">{title}</p>
          <span className="whitespace-nowrap text-xs text-[#9ca3af]">{date}</span>
        </div>
        <p className="text-sm text-[#6b7280]">{description}</p>
      </div>
    </div>
  )
}

function TimelineItem({
  phase,
  dateRange,
  status,
  progress,
}: {
  phase: string
  dateRange: string
  status: "completed" | "in_progress" | "pending"
  progress: number
}) {
  const statusColors: Record<typeof status, string> = {
    completed: "bg-green-600",
    in_progress: "bg-blue-600",
    pending: "bg-[#e8e6e0]",
  }

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
        <div className="mt-2 w-0.5 flex-1 bg-[#e8e6e0] last:hidden" />
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <p className="font-medium text-[#2f4f4f]">{phase}</p>
          <p className="text-sm text-[#6b7280]">{dateRange}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-[#6b7280]">
          <span>Avance</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  )
}

function InfoCard({
  title,
  icon: Icon,
  badge,
  description,
  subtitle,
}: {
  title: string
  icon: LucideIcon
  badge?: string
  description?: string
  subtitle?: string
}) {
  return (
    <Card className="border-[#e8e6e0]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#6b7280]">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#2f4f4f]" />
      </CardHeader>
      <CardContent>
        {badge ? (
          <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">{badge}</Badge>
        ) : (
          <p className="text-sm font-medium text-[#2f4f4f]">{description}</p>
        )}
        {badge && description && <p className="mt-2 text-sm font-medium text-[#2f4f4f]">{description}</p>}
        {subtitle && <p className="mt-1 text-xs text-[#6b7280]">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#e8e6e0] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <span className="text-sm font-medium text-[#2f4f4f]">{value}</span>
    </div>
  )
}

function MaterialItem({ name, quantity, status }: { name: string; quantity: string; status: string }) {
  const statusColors: Record<string, string> = {
    Recibido: "bg-green-500/10 text-green-700",
    Instalado: "bg-blue-500/10 text-blue-700",
    "En instalación": "bg-orange-500/10 text-orange-700",
    Pendiente: "bg-gray-500/10 text-gray-700",
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[#2f4f4f]">{name}</p>
        <p className="text-xs text-[#6b7280]">{quantity}</p>
      </div>
      <Badge className={statusColors[status] ?? "bg-gray-500/10 text-gray-700"}>{status}</Badge>
    </div>
  )
}

function CertificationItem({
  name,
  status,
  date,
  icon,
}: {
  name: string
  status: string
  date: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#e8e6e0] p-4">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#2f4f4f]">{name}</p>
        <p className="mt-1 text-xs text-[#6b7280]">{status}</p>
        <p className="mt-1 text-xs text-[#9ca3af]">{date}</p>
      </div>
    </div>
  )
}

const SPEC_DETAILS = [
  { label: "Superficie total", value: "85 m²" },
  { label: "Tipo de pavimento", value: "Piedra natural travertino" },
  { label: "Estructura pérgola", value: "Aluminio termolacado" },
  { label: "Sistema de riego", value: "Goteo automatizado" },
  { label: "Iluminación", value: "LED integrada, 3000K" },
  { label: "Drenaje", value: "Sistema perimetral con rejillas" },
]

const MATERIALS = [
  { name: "Baldosas travertino", quantity: "85 m²", status: "Recibido" },
  { name: "Estructura aluminio", quantity: "45 m lineales", status: "Instalado" },
  { name: "Sistema de riego", quantity: "1 unidad", status: "En instalación" },
  { name: "Luminarias LED", quantity: "12 unidades", status: "Pendiente" },
  { name: "Plantas ornamentales", quantity: "Según diseño", status: "Pendiente" },
]

const CERTIFICATIONS = [
  { name: "Licencia de obra", status: "Aprobada", date: "10 Ene 2024", icon: CheckCircle2, className: "text-green-600" },
  { name: "Certificado estructural", status: "Aprobado", date: "25 Ene 2024", icon: CheckCircle2, className: "text-green-600" },
  { name: "Inspección eléctrica", status: "Programada", date: "15 Mar 2024", icon: Clock, className: "text-blue-600" },
  { name: "Certificado final de obra", status: "Pendiente", date: "30 Mar 2024", icon: AlertCircle, className: "text-[#9ca3af]" },
]

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/u, (char) => char.toUpperCase())
}

function formatDays(days: number | null): string {
  if (typeof days !== "number") return "Sin datos"
  return `${days} ${days === 1 ? "día" : "días"}`
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Por confirmar"
  if (start && end) {
    const startLabel = formatDate(start)
    const endLabel = formatDate(end)
    const [startDay, startMonth] = startLabel.split(" ")
    const [endDay, endMonth, endYear] = endLabel.split(" ")
    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${endMonth} ${endYear}`
    }
    return `${startLabel} - ${endLabel}`
  }
  return formatDate(start ?? end)
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
