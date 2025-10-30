import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { fetchAdminDashboard } from "@app/lib/api/admin"
import type { AdminDashboardAlert, AdminDashboardData, AdminDashboardProjectProgress } from "@app/types/admin"
import { Loader2, RefreshCw } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, Tooltip, Cell } from "recharts"

const STATUS_LABELS: Record<string, string> = {
  en_progreso: "En progreso",
  finalizado: "Finalizado",
  pendiente: "Pendiente",
}

const BAR_COLORS = ["#2F4F4F", "#C6B89E", "#0D9488", "#B45309", "#DB2777", "#4B5563"]

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [managerFilter, setManagerFilter] = useState<string>("")
  const [refreshToken, setRefreshToken] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchAdminDashboard({
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
      })
      setData(response)
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
    if (!data) return []
    return data.filters.statuses.map((value) => ({ value, label: STATUS_LABELS[value] ?? value }))
  }, [data])

  const managerOptions = useMemo(() => {
    if (!data) return []
    return data.filters.managers
  }, [data])

  const handleRefresh = () => setRefreshToken((prev) => prev + 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Panel general Terrazea</h1>
          <p className="text-sm text-[#6B7280]">
            Visión global de la operación: proyectos, clientes, hitos y alertas priorizadas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
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
            className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
          >
            <option value="">Project manager: todos</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>

          <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

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

      {data ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Proyectos activos"
              value={data.summary.projects.active}
              description={`Total: ${data.summary.projects.total}`}
            />
            <StatCard
              title="Proyectos finalizados"
              value={data.summary.projects.completed}
              description={`${data.summary.projects.pending} pendientes`}
            />
            <StatCard
              title="Clientes activos"
              value={data.summary.clients.total}
              description={`${data.summary.clients.newThisMonth} nuevos este mes`}
            />
            <StatCard
              title="Avance medio"
              value={`${Math.round(data.summary.averageProgress)}%`}
              description="Promedio ponderado del progreso"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="border-[#E8E6E0]">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-[#2F4F4F]">Avance por proyecto</CardTitle>
                <CardDescription>Comparativa de progreso entre los proyectos en seguimiento.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {data.projectsProgress.length === 0 ? (
                  <EmptyState message="Sin proyectos en este filtro." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.projectsProgress} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E0" />
                      <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 12 }} interval={0} angle={-20} dy={20} height={60} />
                      <Tooltip
                        cursor={{ fill: "rgba(47,79,79,0.08)" }}
                        formatter={(value: number, _name, item) => [`${value}%`, (item.payload as AdminDashboardProjectProgress).status]}
                      />
                      <Bar dataKey="progressPercent" radius={[8, 8, 0, 0]}>
                        {data.projectsProgress.map((item, index) => (
                          <Cell key={item.id} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#E8E6E0]">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-[#2F4F4F]">Avance medio global</CardTitle>
                <CardDescription>Progreso consolidado considerando los proyectos filtrados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm text-[#6B7280]">
                    <span>Avance general</span>
                    <span className="font-semibold text-[#2F4F4F]">{Math.round(data.summary.averageProgress)}%</span>
                  </div>
                  <Progress value={data.summary.averageProgress} className="mt-2 h-3 bg-[#E8E6E0]/80" />
                </div>
                <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#4B5563]">
                  <p className="font-semibold text-[#2F4F4F]">Facturación</p>
                  {data.summary.billing.hasData ? (
                    <div className="mt-2 space-y-1">
                      <p>Total facturado: {formatCurrency(data.summary.billing.total ?? 0)}</p>
                      <p>Pendiente: {formatCurrency(data.summary.billing.pending ?? 0)}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[#6B7280]">
                      Integraremos la facturación cuando esté disponible en Supabase. De momento se muestra solo el progreso.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="border-[#E8E6E0]">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-[#2F4F4F]">Próximos hitos (30 días)</CardTitle>
                <CardDescription>Hitos previstos para el próximo mes, sincronizados con el calendario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.upcomingMilestones.length === 0 ? (
                  <EmptyState message="No hay hitos programados en las próximas semanas." />
                ) : (
                  data.upcomingMilestones.map((milestone) => (
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
                {data.alerts.length === 0 ? (
                  <EmptyState message="Sin alertas activas. Todo en orden." />
                ) : (
                  data.alerts.map((alert) => (
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
    <Card className="border-[#E8E6E0] bg-white/90">
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
