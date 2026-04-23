import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Tag,
  Loader2,
  FolderKanban,
  CheckCircle2,
  Clock,
  Calendar,
  Activity,
  StickyNote,
  ExternalLink,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fetchAdminClientDetail } from "@app/lib/api/admin"
import type { AdminClientDetails } from "@app/types/admin"
import {
  getProjectStatusBadgeClass,
  getProjectStatusLabel,
  isActiveProjectStatus,
  isCompletedProjectStatus,
} from "@/lib/constants/project-status"
import { STATUS_BADGES, STATUS_LABELS } from "./Clients"

export function AdminClientPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AdminClientDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAdminClientDetail(clientId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        console.error("Error fetching client detail", err)
        if (!cancelled) setError("No se pudo cargar la ficha del cliente")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!clientId) {
    return (
      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-8 text-center text-sm text-[#6B7280]">
        Cliente no especificado.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin text-[#2F4F4F]" />
          Cargando ficha del cliente…
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="rounded-[1.75rem] border border-[#FCA5A5] bg-[#FEF2F2] p-10 text-center shadow-apple-md">
        <h2 className="font-heading text-xl font-semibold text-[#B91C1C]">
          No pudimos cargar el cliente
        </h2>
        <p className="mt-2 text-sm text-[#B91C1C]">{error ?? "Cliente no encontrado."}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#2F4F4F] px-4 py-1.5 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
      </div>
    )
  }

  const { client, stats, projects, activity, notes } = detail
  const statusKey = client.status ?? "activo"

  const activeProjects = projects.filter((p) => isActiveProjectStatus(p.status))
  const completedProjects = projects.filter((p) => isCompletedProjectStatus(p.status))

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
        <Link to="/dashboard/clients" className="inline-flex items-center gap-1 hover:text-[#2F4F4F]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Clientes
        </Link>
        <span>/</span>
        <span className="font-medium text-[#2F4F4F]">{client.fullName}</span>
      </div>

      {/* Hero */}
      <Card className="overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-gradient-to-br from-[#2F4F4F] via-[#243B3B] to-[#1F3535] text-white shadow-apple-xl">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-5">
              <Avatar className="h-20 w-20 rounded-[1.5rem] border-2 border-white/20 shadow-apple-md">
                <AvatarFallback className="bg-[#758C84] text-2xl font-semibold text-white">
                  {getInitials(client.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Cliente</p>
                <h1 className="font-heading text-3xl font-semibold">{client.fullName}</h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                    <Mail className="h-3 w-3" /> {client.email}
                  </span>
                  {client.phone ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                      <Phone className="h-3 w-3" /> {client.phone}
                    </span>
                  ) : null}
                  <Badge
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_BADGES[statusKey] ?? "bg-white/10 text-white"}`}
                  >
                    {STATUS_LABELS[statusKey] ?? statusKey}
                  </Badge>
                  {client.clientType ? (
                    <Badge className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white capitalize">
                      {client.clientType}
                    </Badge>
                  ) : null}
                </div>
                {(client.tags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {client.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white"
                      >
                        <Tag className="h-2.5 w-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <HeroStat icon={FolderKanban} label="Total proyectos" value={stats.totalProjects} />
              <HeroStat icon={Activity} label="Activos" value={activeProjects.length} accent="text-emerald-200" />
              <HeroStat icon={CheckCircle2} label="Completados" value={completedProjects.length} />
              <HeroStat icon={StickyNote} label="Notas" value={notes.length} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Proyectos */}
        <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <FolderKanban className="h-4 w-4" />
              Proyectos del cliente
            </CardTitle>
            <CardDescription className="text-[#6B7280]">
              {projects.length === 0
                ? "Este cliente todavía no tiene proyectos asignados."
                : `${projects.length} proyecto${projects.length === 1 ? "" : "s"} en total.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-8 text-center text-sm text-[#6B7280]">
                Cuando crees proyectos para este cliente, aparecerán aquí con su progreso y estado.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/dashboard/projects/${project.id}`}
                    className="group block rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 transition hover:border-[#2F4F4F]/40 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm font-semibold text-[#2F4F4F] group-hover:underline">
                          {project.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
                          <Badge
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getProjectStatusBadgeClass(project.status)}`}
                          >
                            {getProjectStatusLabel(project.status)}
                          </Badge>
                          {project.managerName ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-[#9CA3AF]">Gestor:</span> {project.managerName}
                            </span>
                          ) : null}
                          {project.estimatedDelivery ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{" "}
                              {format(new Date(project.estimatedDelivery), "d MMM yyyy", { locale: es })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-[#2F4F4F]">
                          {Math.round(project.progressPercent ?? 0)}%
                        </p>
                        <ExternalLink className="ml-auto mt-1 h-3 w-3 text-[#9CA3AF] group-hover:text-[#2F4F4F]" />
                      </div>
                    </div>
                    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E6E0]">
                      <div
                        className="h-full rounded-full bg-[#2F4F4F] transition-all duration-300"
                        style={{ width: `${project.progressPercent ?? 0}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: datos de contacto y ubicación */}
        <div className="space-y-4">
          <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[#2F4F4F]">Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[#4B5563]">
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Teléfono" value={client.phone ?? "—"} />
              <InfoRow
                icon={Building2}
                label="Empresa"
                value={client.company ?? (client.clientType === "empresa" ? "Sin especificar" : "Particular")}
              />
              <InfoRow
                icon={MapPin}
                label="Ubicación"
                value={
                  [client.address, client.city, client.country].filter(Boolean).join(", ") || "—"
                }
              />
              <InfoRow
                icon={Clock}
                label="Registrado"
                value={format(new Date(client.createdAt), "d 'de' MMMM yyyy", { locale: es })}
              />
              {client.lastActiveAt ? (
                <InfoRow
                  icon={Activity}
                  label="Última actividad"
                  value={format(new Date(client.lastActiveAt), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
                />
              ) : null}
            </CardContent>
          </Card>

          {activity.length > 0 ? (
            <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#2F4F4F]">
                  <Activity className="h-4 w-4" />
                  Actividad reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {activity.slice(0, 6).map((event) => (
                    <li key={event.id} className="flex gap-3 text-xs">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F4F4F]" />
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold text-[#2F4F4F]">{event.title}</p>
                        {event.description ? (
                          <p className="text-[#6B7280]">{event.description}</p>
                        ) : null}
                        <p className="text-[10px] text-[#9CA3AF]">
                          {format(new Date(event.occurredAt), "d MMM · HH:mm", { locale: es })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FolderKanban
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-3 py-2.5">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 ${accent ?? ""}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1 text-xl font-semibold ${accent ?? "text-white"}`}>{value}</p>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]">{label}</p>
        <p className="truncate text-sm text-[#2F4F4F]">{value}</p>
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}
