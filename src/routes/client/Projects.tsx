import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FolderKanban, Loader2, MapPin, CalendarDays } from "lucide-react"
import { toast } from "sonner"

import { fetchClientProjectDetails } from "@app/lib/api/client"
import type { ProjectDetailsData } from "@/lib/supabase/queries"

import { useClientRouteContext } from "./ClientLayout"
import { ClientPageHeader } from "@/components/client/client-page-header"

export function ClientProjectsPage() {
  const { projects } = useClientRouteContext()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(projects[0]?.slug ?? null)
  const [details, setDetails] = useState<ProjectDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedSlug(null)
      setDetails(null)
      setLoading(false)
      return
    }
    setSelectedSlug((current) => current ?? projects[0].slug)
  }, [projects])

  useEffect(() => {
    let cancelled = false
    const loadDetails = async () => {
      if (!selectedSlug) {
        setDetails(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const response = await fetchClientProjectDetails(selectedSlug)
        if (!cancelled) {
          if (response.activeProjectSlug && response.activeProjectSlug !== selectedSlug) {
            setSelectedSlug(response.activeProjectSlug)
            return
          }
          setDetails(response.project)
        }
      } catch (requestError) {
        console.error("Error fetching client project details", requestError)
        if (!cancelled) {
          setError("No pudimos cargar el detalle del proyecto.")
          toast.error("No pudimos cargar el detalle del proyecto.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDetails()
    return () => {
      cancelled = true
    }
  }, [selectedSlug, refreshToken])

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

  if (projects.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/90 p-10 text-center shadow-apple-md">
        <CardContent>
          <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Aún no tienes proyectos activos</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Cuando iniciemos la construcción de tu espacio, verás el seguimiento detallado en esta sección.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <ClientPageHeader
        overline={selectedProject?.code ? `Proyecto · ${selectedProject.code}` : "Mis proyectos"}
        title={selectedProject ? selectedProject.name : "Detalles y avances"}
        description="Consulta el estado de cada fase, la actividad reciente y la galería de fotos tal como la publica tu equipo."
        icon={FolderKanban}
        variant="dark"
        projects={projects}
        selectedSlug={selectedSlug}
        onSelectedSlugChange={setSelectedSlug}
        onRefresh={() => setRefreshToken((value) => value + 1)}
        refreshing={loading}
      >
        {selectedProject ? (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#C6B89E]"
                  style={{ width: `${Math.round(selectedProject.progressPercent)}%` }}
                />
              </div>
              <span className="font-semibold">{Math.round(selectedProject.progressPercent)}% avance</span>
            </div>
          </div>
        ) : null}
      </ClientPageHeader>

      {loading ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando el detalle de tu proyecto…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[1.25rem] border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-12 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : !details ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para ver su avance.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-xl text-[#2F4F4F]">{details.project.name}</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                Estado {formatStatus(details.project.status)} · inicio {formatDate(details.project.startDate)} · entrega{" "}
                {formatDate(details.project.estimatedDelivery)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <SummaryTile
                label="Estado general"
                value={`${Math.round(details.project.progressPercent)}%`}
                description="Progreso acumulado de todas las fases."
              >
                <Progress value={details.project.progressPercent} className="mt-3 h-3 bg-[#E8E6E0]/60" />
              </SummaryTile>
              <SummaryTile
                label="Ubicación"
                value={details.project.locationCity ?? "Sin definir"}
                icon={<MapPin className="h-4 w-4 text-[#2F4F4F]" />}
                description={details.project.locationNotes ?? "Estamos preparando más detalles."}
              />
              <SummaryTile
                label="Duración total"
                value={formatDays(details.project.totalDays)}
                icon={<CalendarDays className="h-4 w-4 text-[#2F4F4F]" />}
                description={`${formatDays(details.project.remainingDays)} restantes`}
              />
              <SummaryTile
                label="Equipo activo"
                value={`${details.teamSummary.activeMembers}/${details.teamSummary.totalMembers}`}
                description="Profesionales conectados hoy."
              />
            </CardContent>
          </Card>

          <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-[#2F4F4F]">Fases del proyecto</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                Así avanza cada etapa de tu construcción.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {details.phases.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Todavía no hay fases registradas para este proyecto.</p>
              ) : (
                details.phases.map((phase) => (
                  <div key={phase.id} className="space-y-2 rounded-[1.25rem] border border-[#E8E6E0] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#2F4F4F]">{phase.name}</p>
                        <Badge variant="outline" className="border-[#E8E6E0] text-xs text-[#4B5563]">
                          {formatStatus(phase.status)}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold text-[#2F4F4F]">{Math.round(phase.progressPercent)}%</span>
                    </div>
                    <Progress value={phase.progressPercent} className="h-2 bg-[#E8E6E0]/60" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-[#2F4F4F]">Actividad reciente</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                Últimos registros compartidos por el equipo Terrazea.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {details.activity.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No hay novedades registradas todavía.</p>
              ) : (
                details.activity.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] border border-[#E8E6E0] bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#2F4F4F]">{item.title}</p>
                      <Badge variant="outline" className="border-[#E8E6E0] text-xs capitalize text-[#4B5563]">
                        {formatStatus(item.status)}
                      </Badge>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-sm text-[#6B7280]">{item.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-[#9CA3AF]">{formatRelative(item.occurredAt)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-[#2F4F4F]">Galería</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                {details.photoSummary.totalPhotos
                  ? `${details.photoSummary.totalPhotos} fotos · última actualización ${formatDate(details.photoSummary.lastUpdate)}`
                  : "Te avisaremos en cuanto se publique la primera foto."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details.photos.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Aún no hay fotos en la galería del proyecto.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {details.photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border border-[#E8E6E0] bg-[#F8F7F4]">
                      <img
                        src={photo.url}
                        alt={photo.caption ?? "Foto del proyecto"}
                        className="h-48 w-full object-cover"
                      />
                      <div className="p-4 text-sm text-[#4B5563]">
                        <p className="font-medium text-[#2F4F4F]">{photo.caption ?? "Actualización del sitio"}</p>
                        <p className="text-xs text-[#9CA3AF]">{formatDate(photo.takenAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  description,
  icon,
  children,
}: {
  label: string
  value: string
  description: string
  icon?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{description}</p>
      {children}
    </div>
  )
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/u, (char) => char.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Pendiente"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
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

function formatDays(value: number | null | undefined) {
  if (!value) return "Pendiente"
  return `${value} días`
}
