import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Loader2,
  Mail,
  UserCircle,
  Users,
  FolderKanban,
  Sparkles,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
} from "lucide-react"

import { createAdminClient, fetchAdminClients, type CreateAdminClientPayload } from "@app/lib/api/admin"
import type { AdminClientOverview } from "@app/types/admin"

interface FormState extends CreateAdminClientPayload {
  status: "idle" | "pending" | "success" | "error"
  message?: string
}

type SortOption = "name" | "projects" | "recent"
type FilterOption = "all" | "with-projects" | "no-projects"

export function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({ fullName: "", email: "", status: "idle" })
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")

  useEffect(() => {
    void refreshClients()
  }, [])

  const totalProjects = useMemo(() => clients.reduce((acc, client) => acc + (client.projects ?? []).length, 0), [clients])

  const filteredAndSortedClients = useMemo(() => {
    let filtered = [...clients]

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (client) =>
          client.fullName.toLowerCase().includes(query) || client.email.toLowerCase().includes(query),
      )
    }

    // Filtro por proyectos
    if (filterBy === "with-projects") {
      filtered = filtered.filter((client) => (client.projects ?? []).length > 0)
    } else if (filterBy === "no-projects") {
      filtered = filtered.filter((client) => (client.projects ?? []).length === 0)
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.fullName.localeCompare(b.fullName)
        case "projects":
          return (b.projects ?? []).length - (a.projects ?? []).length
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [clients, searchQuery, sortBy, filterBy])

  const refreshClients = async () => {
    setLoading(true)
    try {
      const data = await fetchAdminClients()
      setClients(data)
    } catch (error) {
      console.error("Error fetching admin clients", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.fullName.trim() || !form.email.trim()) {
      setForm((prev) => ({ ...prev, status: "error", message: "Introduce nombre y correo válidos." }))
      return
    }

    setForm((prev) => ({ ...prev, status: "pending", message: undefined }))
    try {
      await createAdminClient({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase() })
      setForm({ fullName: "", email: "", status: "success", message: "Cliente creado correctamente." })
      await refreshClients()
    } catch (error) {
      console.error("Error creating client", error)
      setForm((prev) => ({
        ...prev,
        status: "error",
        message: "No se pudo crear el cliente. Revisa el correo indicado.",
      }))
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-[#E8E6E0] bg-white/90 p-8 shadow-apple-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
              <Sparkles className="h-3.5 w-3.5" />
              Experiencia Terrazea
            </span>
            <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Gestión de clientes Terrazea</h1>
            <p className="text-sm text-[#6B7280]">
              Registra nuevas cuentas de clientes y consulta sus proyectos activos con una estética alineada al resto del panel Terrazea.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryTile icon={Users} value={clients.length} label="Clientes activos" />
            <SummaryTile icon={FolderKanban} value={totalProjects} label="Proyectos vinculados" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <UserCircle className="h-5 w-5" />
              Registrar nuevo cliente
            </CardTitle>
            <CardDescription className="text-[#6B7280]">
              El cliente podrá acceder a su área privada con estas credenciales tras iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Nombre completo
                </label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="María García"
                  required
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="cliente@terrazea.com"
                  required
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-[#2F4F4F] text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535]"
                disabled={form.status === "pending"}
              >
                {form.status === "pending" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                  </span>
                ) : (
                  "Registrar cliente"
                )}
              </Button>

              {form.status === "success" && form.message ? (
                <p className="rounded-[0.9rem] border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#047857]">
                  {form.message}
                </p>
              ) : null}
              {form.status === "error" && form.message ? (
                <p className="rounded-[0.9rem] border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">
                  {form.message}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Búsqueda y Filtros */}
          <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-[#2F4F4F]">Directorio de clientes</CardTitle>
                  <CardDescription className="text-[#6B7280]">
                    {loading
                      ? "Cargando..."
                      : `${filteredAndSortedClients.length} de ${clients.length} cliente${clients.length === 1 ? "" : "s"} · ${totalProjects} proyecto${totalProjects === 1 ? "" : "s"}`}
                  </CardDescription>
                </div>
              </div>

              {/* Barra de búsqueda */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] pl-11 pr-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
                />
              </div>

              {/* Filtros tipo pill */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
                  <Filter className="h-4 w-4" />
                  <span>Filtrar:</span>
                </div>
                <button
                  onClick={() => setFilterBy("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    filterBy === "all"
                      ? "bg-[#2F4F4F] text-white shadow-apple"
                      : "bg-[#F8F7F4] text-[#6B7280] hover:bg-[#E8E6E0]"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterBy("with-projects")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    filterBy === "with-projects"
                      ? "bg-[#2F4F4F] text-white shadow-apple"
                      : "bg-[#F8F7F4] text-[#6B7280] hover:bg-[#E8E6E0]"
                  }`}
                >
                  Con proyectos
                </button>
                <button
                  onClick={() => setFilterBy("no-projects")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    filterBy === "no-projects"
                      ? "bg-[#2F4F4F] text-white shadow-apple"
                      : "bg-[#F8F7F4] text-[#6B7280] hover:bg-[#E8E6E0]"
                  }`}
                >
                  Sin proyectos
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-[#6B7280]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none"
                  >
                    <option value="name">Nombre</option>
                    <option value="projects">Proyectos</option>
                    <option value="recent">Recientes</option>
                  </select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Grid de clientes */}
          {loading ? (
            <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
              <CardContent>
                <div className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] py-16 text-sm text-[#6B7280]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cargando clientes…
                </div>
              </CardContent>
            </Card>
          ) : filteredAndSortedClients.length === 0 ? (
            <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
              <CardContent>
                <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-12 text-center">
                  <p className="text-sm font-medium text-[#6B7280]">
                    {searchQuery || filterBy !== "all"
                      ? "No se encontraron clientes con los filtros seleccionados."
                      : "Todavía no has registrado clientes. Cuando lo hagas, verás sus datos y proyectos vinculados en este panel."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredAndSortedClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Sin definir"
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  } catch (error) {
    console.error("Error formatting date", error)
    return value
  }
}

function SummaryTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{label}</p>
        <p className="text-lg font-semibold text-[#2F4F4F]">{value}</p>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-[#6B7280]">{label}:</span>{" "}
      <span className="font-medium text-[#2F4F4F]">{value}</span>
    </p>
  )
}

// Función para generar iniciales del nombre
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Función para obtener color del avatar basado en el nombre
function getAvatarColor(name: string): string {
  const colors = [
    "bg-[#2F4F4F]",
    "bg-[#C6B89E]",
    "bg-[#1F3535]",
    "bg-[#4A6B6B]",
    "bg-[#5A7A7A]",
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

// Componente de card de cliente mejorado
function ClientCard({ client }: { client: AdminClientOverview }) {
  // "Activos" = todas las fases del flujo canónico antes del cierre.
  // "Completados" = en cierre. Los administrativos (archivado/cancelado) no
  // cuentan en ninguno de los dos.
  const activeProjects = (client.projects ?? []).filter(
    (p) =>
      p.status === "inicial" ||
      p.status === "diseno" ||
      p.status === "presupuesto" ||
      p.status === "planificacion" ||
      p.status === "obra_ejecucion",
  )
  const completedProjects = (client.projects ?? []).filter((p) => p.status === "cierre")
  const averageProgress =
    (client.projects ?? []).length > 0
      ? Math.round((client.projects ?? []).reduce((acc, p) => acc + (p.progressPercent ?? 0), 0) / (client.projects ?? []).length)
      : 0

  return (
    <Card className="group relative overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-md transition-all duration-300 hover:border-[#2F4F4F]/50 hover:shadow-apple-xl">
      <CardContent className="p-6">
        {/* Header con avatar y nombre */}
        <div className="mb-6 flex items-start gap-4">
          <Avatar className="h-16 w-16 rounded-[1.25rem] border-2 border-[#E8E6E0] shadow-apple">
            <AvatarFallback className={`${getAvatarColor(client.fullName)} text-lg font-semibold text-white`}>
              {getInitials(client.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="font-heading text-lg font-semibold text-[#2F4F4F]">{client.fullName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{client.email}</span>
            </div>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <MetricBadge
            icon={FolderKanban}
            value={(client.projects ?? []).length}
            label="Total"
            color="bg-[#2F4F4F]"
          />
          <MetricBadge
            icon={TrendingUp}
            value={activeProjects.length}
            label="Activos"
            color="bg-[#047857]"
          />
          <MetricBadge
            icon={CheckCircle2}
            value={completedProjects.length}
            label="Completados"
            color="bg-[#C6B89E]"
          />
        </div>

        {/* Progreso promedio */}
        {(client.projects ?? []).length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#6B7280]">Progreso promedio</span>
              <span className="font-semibold text-[#2F4F4F]">{averageProgress}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#E8E6E0]">
              <div
                className="h-full rounded-full bg-[#2F4F4F] transition-all duration-300"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista de proyectos (máximo 3) */}
        {(client.projects ?? []).length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
              Proyectos ({(client.projects ?? []).length})
            </p>
            <div className="space-y-2">
              {(client.projects ?? []).slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3 transition hover:border-[#2F4F4F]/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[#2F4F4F]">{project.name}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {Math.round(project.progressPercent ?? 0)}% completado
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-[#E8E6E0] bg-white text-[#2F4F4F] text-[10px]"
                    >
                      {(project.status ?? "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E6E0]">
                    <div
                      className="h-full rounded-full bg-[#2F4F4F] transition-all duration-300"
                      style={{ width: `${project.progressPercent ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {(client.projects ?? []).length > 3 && (
                <p className="text-center text-xs text-[#6B7280]">
                  +{(client.projects ?? []).length - 3} proyecto{(client.projects ?? []).length - 3 === 1 ? "" : "s"} más
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-center">
            Sin proyectos
          </div>
        )}

        {/* Fecha de registro */}
        <div className="mt-6 flex items-center gap-2 border-t border-[#E8E6E0] pt-4 text-xs text-[#6B7280]">
          <Clock className="h-3.5 w-3.5" />
          <span>Registrado {formatRelativeDate(client.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricBadge({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof FolderKanban
  value: number
  label: string
  color: string
}) {
  return (
    <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3 text-center">
      <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${color} text-white`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-lg font-semibold text-[#2F4F4F]">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.1em] text-[#6B7280]">{label}</p>
    </div>
  )
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `hace ${weeks} semana${weeks === 1 ? "" : "s"}`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `hace ${months} mes${months === 1 ? "" : "es"}`
  }
  return formatDate(dateString)
}
