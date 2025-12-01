import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { fetchAdminDashboard } from "@app/lib/api/admin"
import type {
  AdminDashboardAlert,
  AdminDashboardData,
  AdminDashboardProjectProgress,
  AdminDashboardProjectLocation,
} from "@app/types/admin"
import { Loader2, RefreshCw, Search, Users, FolderKanban, CalendarDays, AlertTriangle } from "lucide-react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, Tooltip, Cell } from "recharts"

const STATUS_LABELS: Record<string, string> = {
  en_progreso: "En progreso",
  finalizado: "Finalizado",
  pendiente: "Pendiente",
}

const BAR_COLORS = ["#2F4F4F", "#C6B89E", "#0D9488", "#B45309", "#DB2777", "#4B5563"]

// Configuración del icono por defecto de Leaflet para que funcione bien con Vite
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

const EMPTY_DASHBOARD: AdminDashboardData = {
  summary: {
    projects: { total: 0, active: 0, completed: 0, pending: 0 },
    averageProgress: 0,
    clients: { total: 0, newThisMonth: 0 },
    billing: { total: 0, pending: 0, hasData: false },
  },
  upcomingMilestones: [],
  alerts: [],
  projectsProgress: [],
  projectLocations: [],
  filters: {
    statuses: [],
    managers: [],
    activeStatus: undefined,
    activeManagerId: undefined,
  },
}

function normalizeAdminDashboard(raw: AdminDashboardData | null): AdminDashboardData | null {
  if (!raw) return null

  return {
    summary: {
      projects: {
        total: raw.summary?.projects?.total ?? 0,
        active: raw.summary?.projects?.active ?? 0,
        completed: raw.summary?.projects?.completed ?? 0,
        pending: raw.summary?.projects?.pending ?? 0,
      },
      averageProgress: raw.summary?.averageProgress ?? 0,
      clients: {
        total: raw.summary?.clients?.total ?? 0,
        newThisMonth: raw.summary?.clients?.newThisMonth ?? 0,
      },
      billing: {
        total: raw.summary?.billing?.total ?? 0,
        pending: raw.summary?.billing?.pending ?? 0,
        hasData: raw.summary?.billing?.hasData ?? false,
      },
    },
    upcomingMilestones: raw.upcomingMilestones ?? [],
    alerts: raw.alerts ?? [],
    projectsProgress: raw.projectsProgress ?? [],
    projectLocations: raw.projectLocations ?? [],
    filters: {
      statuses: raw.filters?.statuses ?? [],
      managers: raw.filters?.managers ?? [],
      activeStatus: raw.filters?.activeStatus,
      activeManagerId: raw.filters?.activeManagerId,
    },
  }
}

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [managerFilter, setManagerFilter] = useState<string>("")
  const [refreshToken, setRefreshToken] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const safeData = data ?? EMPTY_DASHBOARD
  const shouldShowData = Boolean(data) || (!loading && !error)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchAdminDashboard({
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
      })
      setData(normalizeAdminDashboard(response))
    } catch (err) {
      console.error("Error fetching admin dashboard", err)
      setError("No se pudo cargar el panel. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, managerFilter])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard, refreshToken])

  const statusOptions = useMemo(() => {
    return safeData.filters.statuses.map((value) => ({ value, label: STATUS_LABELS[value] ?? value }))
  }, [safeData.filters.statuses])

  const managerOptions = useMemo(() => {
    return safeData.filters.managers
  }, [safeData.filters.managers])

  const handleRefresh = () => setRefreshToken((prev) => prev + 1)

  return (
    <div className="space-y-8">
      {/* Hero + barra superior */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F] lg:text-4xl">
            Panel general Terrazea
          </h1>
          <p className="max-w-xl text-sm text-[#6B7280]">
            Visión global de la operación: proyectos, clientes, hitos y alertas priorizadas.
          </p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              type="search"
              placeholder="Buscar proyecto, cliente o alerta…"
              className="h-10 rounded-full border-[#E5E7EB] bg-white/80 pl-9 pr-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-[#E8E6E0] bg-white px-3 py-2 text-xs text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
          >
            <option value="">Estado: todos</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
              className="rounded-full border border-[#E8E6E0] bg-white px-3 py-2 text-xs text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
          >
            <option value="">Project manager: todos</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>

            <Button variant="outline" className="gap-1 rounded-full px-4 py-2 text-xs" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>
      </section>

      {error ? (
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-[#B91C1C]">
            <Loader2 className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      ) : null}

      {loading && !data ? (
        <Card className="border-[#E8E6E0]">
          <CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando datos del panel…
          </CardContent>
        </Card>
      ) : null}

      {shouldShowData ? (
        <div className="space-y-8">
          {/* Tarjeta principal tipo hero con KPIs */}
          <section className="grid gap-4 lg:grid-cols-[2.2fr,1.3fr]">
            <Card className="overflow-hidden rounded-[1.75rem] border-[#E8E6E0] bg-gradient-to-br from-[#2F4F4F] via-[#243B3B] to-[#1F3535] text-white shadow-apple-xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-xl text-white">Visión general de proyectos</CardTitle>
                    <CardDescription className="text-xs text-white/70">
                      Comparativa de progreso entre los proyectos en seguimiento.
                    </CardDescription>
                  </div>
                  <Badge className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-200">
                    {safeData.summary.projects.active} activos · {safeData.summary.projects.completed} finalizados
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-white/80">
                    <span>Avance medio global</span>
                    <span className="font-semibold">
                      {Math.round(safeData.summary.averageProgress)}%
                    </span>
                  </div>
                  <Progress value={safeData.summary.averageProgress} className="h-2.5 rounded-full bg-white/10" />
                </div>
                <div className="h-[260px] rounded-[1.5rem] bg-black/10 px-2 py-2">
                  {safeData.projectsProgress.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-white/70">
                      Sin proyectos en este filtro.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={safeData.projectsProgress} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(248,247,244,0.12)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "rgba(248,247,244,0.8)", fontSize: 11 }}
                          interval={0}
                          angle={-20}
                          dy={20}
                          height={60}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(47,79,79,0.08)" }}
                          formatter={(value: number, _name, item) => [
                            `${value}%`,
                            (item.payload as AdminDashboardProjectProgress).status,
                          ]}
                          contentStyle={{
                            backgroundColor: "#111827",
                            borderRadius: 12,
                            border: "1px solid rgba(248,247,244,0.12)",
                            color: "#F9FAFB",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="progressPercent" radius={[8, 8, 0, 0]}>
                          {safeData.projectsProgress.map((item, index) => (
                            <Cell key={item.id} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Columna derecha tipo “My Card” */}
            <Card className="rounded-[1.75rem] border-[#E8E6E0] bg-white/95 shadow-apple-md">
              <CardHeader>
                <CardTitle className="font-heading text-base text-[#111827]">
                  Estado global
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280]">
                  Resumen rápido de proyectos, clientes y facturación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[#374151]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniKpiCard
                    icon={FolderKanban}
                    label="Proyectos activos"
                    value={safeData.summary.projects.active}
                    helper={`Total: ${safeData.summary.projects.total}`}
                  />
                  <MiniKpiCard
                    icon={Users}
                    label="Clientes activos"
                    value={safeData.summary.clients.total}
                    helper={`${safeData.summary.clients.newThisMonth} nuevos este mes`}
                  />
                </div>
                <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#4B5563]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#2F4F4F]">Facturación</span>
                    <CalendarDays className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  {safeData.summary.billing.hasData ? (
                    <div className="mt-2 space-y-1">
                      <p>Total facturado: {formatCurrency(safeData.summary.billing.total ?? 0)}</p>
                      <p>Pendiente: {formatCurrency(safeData.summary.billing.pending ?? 0)}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[#6B7280]">
                      Aún no hay datos de facturación registrados en Terrazea para este filtro.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-[1.25rem] bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {safeData.alerts.length > 0
                      ? `${safeData.alerts.length} alerta(s) prioritaria(s) en proyectos activos.`
                      : "Sin alertas activas. Todo en orden."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Tarjetas inferiores tipo stats + mapa */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
            <StatCard
              title="Proyectos activos"
              value={safeData.summary.projects.active}
              description={`Total: ${safeData.summary.projects.total}`}
            />
            <StatCard
              title="Proyectos finalizados"
              value={safeData.summary.projects.completed}
              description={`${safeData.summary.projects.pending} pendientes`}
            />
            <StatCard
              title="Clientes activos"
              value={safeData.summary.clients.total}
              description={`${safeData.summary.clients.newThisMonth} nuevos este mes`}
            />
            <StatCard
              title="Avance medio"
              value={`${Math.round(safeData.summary.averageProgress)}%`}
              description="Promedio ponderado del progreso"
            />
                  </div>
            <div className="lg:col-span-2">
              <ProjectsMapCard locations={safeData.projectLocations ?? []} />
                </div>
          </section>

          {/* Hitos + alertas como tarjetas apiladas */}
          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[#E8E6E0]">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-[#2F4F4F]">Próximos hitos (30 días)</CardTitle>
                <CardDescription>Hitos previstos para el próximo mes, sincronizados con el calendario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeData.upcomingMilestones.length === 0 ? (
                  <EmptyState message="No hay hitos programados en las próximas semanas." />
                ) : (
                  safeData.upcomingMilestones.map((milestone) => (
                    <article key={milestone.id} className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-sm font-semibold text-[#2F4F4F]">{milestone.title}</p>
                          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{milestone.projectName}</p>
                        </div>
                        <Badge variant="secondary" className="bg-white text-[#2F4F4F]">
                          {formatDate(milestone.scheduledEnd ?? milestone.scheduledStart)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-[#6B7280]">Estado: {milestone.status}</p>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-[#E8E6E0]">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-[#2F4F4F]">Alertas prioritarias</CardTitle>
                <CardDescription>Proyectos con incidencias o fechas comprometidas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeData.alerts.length === 0 ? (
                  <EmptyState message="Sin alertas activas. Todo en orden." />
                ) : (
                  safeData.alerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ title, value, description }: { title: string; value: string | number; description?: string }) {
  return (
    <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/95 shadow-apple-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium text-[#6B7280]">{title}</CardTitle>
        <CardDescription className="text-3xl font-semibold text-[#2F4F4F]">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </CardDescription>
      </CardHeader>
      {description ? (
        <CardContent>
          <p className="text-xs text-[#6B7280]">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}

function parseCoordinates(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Aceptamos formatos tipo "41.3902, 2.1540" o "41.3902 2.1540"
  const parts = trimmed.split(/[, ]+/u).filter(Boolean)
  if (parts.length !== 2) return null

  const lat = Number.parseFloat(parts[0])
  const lng = Number.parseFloat(parts[1])

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

function ProjectsMapCard({ locations }: { locations: AdminDashboardProjectLocation[] }) {
  const [search, setSearch] = useState("")

  const locationsWithCoords = locations
    .map((loc) => {
      const parsed = parseCoordinates(loc.mapUrl)
      if (!parsed) return null
      return { ...loc, coords: parsed }
    })
    .filter((loc): loc is AdminDashboardProjectLocation & { coords: { lat: number; lng: number } } => Boolean(loc))

  const filtered = locationsWithCoords.filter((loc) => {
    if (!search.trim()) return true
    const haystack = `${loc.name} ${loc.city ?? ""}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  // Centro aproximado: media de lat/lng de los proyectos con coordenadas, o un centro por defecto (España)
  const hasAnyCoords = filtered.length > 0 || locationsWithCoords.length > 0
  const sourceForCenter = filtered.length > 0 ? filtered : locationsWithCoords
  const defaultCenter =
    sourceForCenter.length > 0
      ? [
          sourceForCenter.reduce((sum, loc) => sum + loc.coords.lat, 0) / sourceForCenter.length,
          sourceForCenter.reduce((sum, loc) => sum + loc.coords.lng, 0) / sourceForCenter.length,
        ]
      : [40.4168, -3.7038] // Madrid como centro por defecto

  return (
    <Card className="h-full rounded-[1.5rem] border-[#E8E6E0] bg-white/95 shadow-apple-md">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base text-[#2F4F4F]">Proyectos en el mapa</CardTitle>
        <CardDescription className="text-xs text-[#6B7280]">
          Visualiza todos los proyectos con coordenadas en el mapa y filtra rápidamente por nombre o ciudad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar proyecto por nombre o ciudad…"
            className="h-8 rounded-full border-[#E5E7EB] bg-white/80 pl-8 pr-3 text-xs text-[#111827] placeholder:text-[#9CA3AF]"
          />
        </div>

        <div className="overflow-hidden rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4]">
          <MapContainer
            center={defaultCenter as [number, number]}
            zoom={hasAnyCoords ? 6 : 4}
            scrollWheelZoom={false}
            className="h-80 w-full md:h-96"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {(filtered.length > 0 ? filtered : locationsWithCoords).map((loc) => (
              <Marker key={loc.id} position={[loc.coords.lat, loc.coords.lng]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-[#111827]">{loc.name}</p>
                    {loc.city ? <p className="text-[#6B7280]">{loc.city}</p> : null}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {!hasAnyCoords ? (
          <p className="text-[11px] text-[#6B7280]">
            Añade coordenadas en tus proyectos (formato{" "}
            <span className="font-mono font-semibold text-[#374151]">41.3902, 2.1540</span>) para verlos sobre el mapa.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(filtered.length > 0 ? filtered : locationsWithCoords).map((loc) => (
              <span
                key={loc.id}
                className="rounded-full bg-[#F8F7F4] px-3 py-1 text-[11px] font-medium text-[#374151] shadow-sm"
              >
                {loc.name}
                {loc.city ? ` · ${loc.city}` : ""}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MiniKpiCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  helper?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.25rem] bg-[#F8F7F4] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-apple">
          <Icon className="h-4 w-4 text-[#2F4F4F]" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#6B7280]">{label}</p>
          <p className="text-base font-semibold text-[#111827]">
            {typeof value === "number" ? value.toLocaleString("es-ES") : value}
          </p>
        </div>
      </div>
      {helper ? <p className="text-[11px] text-[#9CA3AF]">{helper}</p> : null}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-lg border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#6B7280]">{message}</p>
}

function AlertCard({ alert }: { alert: AdminDashboardAlert }) {
  const badgeColor = alert.severity === "critical" ? "bg-[#FEE2E2] text-[#991B1B]" : alert.severity === "warning" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DBEAFE] text-[#1D4ED8]"

  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#FDEDEA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-[#B91C1C]">{alert.projectName}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{alert.message}</p>
        </div>
        <Badge className={badgeColor}>{alert.severity.toUpperCase()}</Badge>
      </div>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
}
