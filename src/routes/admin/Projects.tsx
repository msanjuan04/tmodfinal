import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  Archive,
  ArrowLeftRight,
  ArrowUpDown,
  Copy,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

import type {
  AdminClientOverview,
  AdminProjectDetails,
  AdminProjectListItem,
  AdminProjectListResponse,
  AdminProjectTeamMember,
} from "@app/types/admin"
import {
  archiveAdminProject,
  createAdminClient,
  createAdminProject,
  deleteAdminProject,
  duplicateAdminProject,
  fetchAdminClients,
  fetchAdminProjectDetails,
  fetchAdminProjects,
  fetchAdminTeamMembers,
  restoreAdminProject,
  updateAdminProject,
} from "@app/lib/api/admin"

const PROJECT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "borrador", label: "Borrador" },
  { value: "planificacion", label: "Planificación" },
  { value: "en_progreso", label: "En progreso" },
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "En pausa" },
  { value: "completado", label: "Completado" },
  { value: "finalizado", label: "Finalizado" },
  { value: "archivado", label: "Archivado" },
]

const STATUS_BADGES: Record<string, string> = {
  borrador: "bg-[#E8E6E0] text-[#4B5563]",
  planificacion: "bg-[#F1F5F9] text-[#1E293B]",
  en_progreso: "bg-[#DBEAFE] text-[#1D4ED8]",
  activo: "bg-[#DCFCE7] text-[#047857]",
  pausado: "bg-[#FEF3C7] text-[#B45309]",
  completado: "bg-[#C6B89E] text-[#2F4F4F]",
  finalizado: "bg-[#C7F9CC] text-[#166534]",
  archivado: "bg-[#E2E8F0] text-[#475569]",
}

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  arquitecto: "Arquitecto",
  ingeniero: "Ingeniero",
  instalador: "Instalador",
  coordinador: "Coordinador",
  logistica: "Logística",
  otro: "Equipo",
}

const DEFAULT_PAGE_SIZE = 10

interface FilterState {
  search: string
  status: Set<string>
  managerId: string
  startDateFrom: string
  startDateTo: string
  endDateFrom: string
  endDateTo: string
  sortBy: "updated_at" | "name" | "progress" | "start_date" | "estimated_delivery" | "status"
  sortOrder: "asc" | "desc"
}

interface ProjectFormValues {
  name: string
  slug: string
  code: string
  status: string
  startDate: string
  estimatedDelivery: string
  locationCity: string
  locationNotes: string
  clientId: string
  createNewClient: boolean
  newClientFullName: string
  newClientEmail: string
  teamAssignments: Record<string, string>
}

function formatDate(value: string | null) {
  if (!value) return "—"
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es })
  } catch (error) {
    return value
  }
}

function statusLabel(value: string) {
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function emptyForm(): ProjectFormValues {
  return {
    name: "",
    slug: "",
    code: "",
    status: "planificacion",
    startDate: "",
    estimatedDelivery: "",
    locationCity: "",
    locationNotes: "",
    clientId: "",
    createNewClient: false,
    newClientFullName: "",
    newClientEmail: "",
    teamAssignments: {
      director: "",
      arquitecto: "",
      ingeniero: "",
      instalador: "",
    },
  }
}

function getInitialFormFromDetail(detail: AdminProjectDetails): ProjectFormValues {
  const assignments = detail.team.assignments.reduce<Record<string, string>>((acc, assignment) => {
    if (assignment.memberId) acc[assignment.role] = assignment.memberId
    return acc
  }, {})

  return {
    name: detail.project.name,
    slug: detail.project.slug ?? "",
    code: detail.project.code ?? "",
    status: detail.project.status,
    startDate: detail.project.startDate ?? "",
    estimatedDelivery: detail.project.estimatedDelivery ?? "",
    locationCity: detail.project.locationCity ?? "",
    locationNotes: detail.project.locationNotes ?? "",
    clientId: detail.project.clientId ?? "",
    createNewClient: false,
    newClientFullName: "",
    newClientEmail: "",
    teamAssignments: {
      director: assignments.director ?? "",
      arquitecto: assignments.arquitecto ?? "",
      ingeniero: assignments.ingeniero ?? "",
      instalador: assignments.instalador ?? "",
    },
  }
}

export function AdminProjectsPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState<AdminProjectListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState("")
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: new Set<string>(),
    managerId: "",
    startDateFrom: "",
    startDateTo: "",
    endDateFrom: "",
    endDateTo: "",
    sortBy: "updated_at",
    sortOrder: "desc",
  })
  const [clients, setClients] = useState<AdminClientOverview[]>([])
  const [teamMembers, setTeamMembers] = useState<AdminProjectTeamMember[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formValues, setFormValues] = useState<ProjectFormValues>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const statusSummary = useMemo(() => {
    const map = new Map<string, number>()
    response?.filters.statuses.forEach((item) => map.set(item.value, item.count))
    return map
  }, [response?.filters.statuses])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminProjects({
        search: filters.search || undefined,
        status: Array.from(filters.status),
        managerId: filters.managerId || undefined,
        startDateFrom: filters.startDateFrom || undefined,
        startDateTo: filters.startDateTo || undefined,
        endDateFrom: filters.endDateFrom || undefined,
        endDateTo: filters.endDateTo || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        pageSize,
      })
      setResponse(result)
    } catch (requestError) {
      console.error(requestError)
      setError("No se pudieron cargar los proyectos.")
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }))
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    let cancelled = false

    const loadAuxiliaryData = async () => {
      try {
        const clientsData = await fetchAdminClients()
        if (!cancelled) {
          setClients(clientsData)
        }
      } catch (requestError) {
        console.error(requestError)
        toast.error("No se pudieron cargar los clientes.")
      }

      try {
        const teamData = await fetchAdminTeamMembers()
        if (!cancelled) {
          setTeamMembers(teamData)
        }
      } catch (requestError) {
        console.error(requestError)
        toast.error("No se pudo cargar el equipo.")
      }
    }

    void loadAuxiliaryData()

    return () => {
      cancelled = true
    }
  }, [])

  const totalPages = response ? Math.max(Math.ceil(response.pagination.total / response.pagination.pageSize), 1) : 1

  const handleStatusToggle = (value: string) => {
    setFilters((prev) => {
      const next = new Set(prev.status)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return { ...prev, status: next }
    })
    setPage(1)
  }

  const handleOpenCreate = () => {
    setFormMode("create")
    setFormValues(emptyForm())
    setEditingProjectId(null)
    setFormOpen(true)
  }

  const handleOpenEdit = async (projectId: string) => {
    setFormMode("edit")
    setFormOpen(true)
    setFormLoading(true)
    setEditingProjectId(projectId)
    try {
      const detail = await fetchAdminProjectDetails(projectId)
      setFormValues({
        ...getInitialFormFromDetail(detail),
      })
      if (!detail.project.clientName && clients.length > 0) {
        setFormValues((prev) => ({ ...prev, clientId: clients[0]?.id ?? "" }))
      }
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo cargar la información del proyecto")
      setFormOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDuplicate = async (projectId: string) => {
    try {
      await duplicateAdminProject(projectId)
      toast.success("Proyecto duplicado")
      await loadProjects()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo duplicar el proyecto")
    }
  }

  const handleArchive = async (projectId: string) => {
    try {
      await archiveAdminProject(projectId)
      toast.success("Proyecto archivado")
      await loadProjects()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo archivar el proyecto")
    }
  }

  const handleRestore = async (projectId: string) => {
    try {
      await restoreAdminProject(projectId)
      toast.success("Proyecto restaurado")
      await loadProjects()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo restaurar el proyecto")
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este proyecto?")) return
    try {
      await deleteAdminProject(projectId)
      toast.success("Proyecto eliminado")
      await loadProjects()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo eliminar el proyecto")
    }
  }

  const handleFormSubmit = async (values: ProjectFormValues) => {
    if (values.createNewClient) {
      if (!values.newClientFullName.trim() || !values.newClientEmail.trim()) {
        toast.error("Introduce los datos del nuevo cliente")
        return
      }
    } else if (!values.clientId || values.clientId.trim().length === 0) {
      toast.error("Selecciona un cliente antes de crear el proyecto.")
      return
    }

    setFormLoading(true)

    try {
      let clientId = values.clientId ?? ""

      if (values.createNewClient) {
        const client = await createAdminClient({
          fullName: values.newClientFullName,
          email: values.newClientEmail,
        })
        setClients((prev) => [
          ...prev,
          {
            id: client.id,
            fullName: client.full_name,
            email: client.email,
            createdAt: new Date().toISOString(),
            projects: [],
          },
        ])
        clientId = client.id
      }

      const sanitizedAssignments = Object.entries(values.teamAssignments ?? {}).reduce<Record<string, string>>((acc, [role, memberId]) => {
        const trimmed = (memberId ?? "").trim()
        if (trimmed.length > 0) {
          acc[role] = trimmed
        }
        return acc
      }, {})

      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        code: values.code || undefined,
        status: values.status,
        startDate: values.startDate || null,
        estimatedDelivery: values.estimatedDelivery || null,
        locationCity: values.locationCity || null,
        locationNotes: values.locationNotes || null,
        clientId: clientId || undefined,
        teamAssignments: Object.keys(sanitizedAssignments).length > 0 ? sanitizedAssignments : undefined,
        managerId: sanitizedAssignments.director ?? undefined,
      }

      if (formMode === "create") {
        await createAdminProject(payload)
        toast.success("Proyecto creado correctamente")
      } else if (formMode === "edit" && editingProjectId) {
        await updateAdminProject(editingProjectId, payload)
        toast.success("Proyecto actualizado")
      }

      setFormOpen(false)
      await loadProjects()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo guardar el proyecto")
    } finally {
      setFormLoading(false)
    }
  }

  const projects = response?.projects ?? []

  return (
    <div className="space-y-6">
      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="font-heading text-3xl text-[#2F4F4F]">Gestión de proyectos</CardTitle>
            <p className="text-sm text-[#6B7280]">Controla los proyectos Terrazea: estados, equipo, avance y fechas clave.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-[#E8E6E0] text-[#2F4F4F]" onClick={loadProjects} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Actualizando" : "Actualizar"}
            </Button>
            <Button className="bg-[#2F4F4F] text-white hover:bg-[#1F3535]" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full items-center gap-3 lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, código o cliente"
                className="w-full rounded-full border-[#E8E6E0] bg-[#F8F7F4] pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full border-[#E8E6E0] text-[#2F4F4F]">
                  <Filter className="mr-2 h-4 w-4" /> Estado
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={(event) => {
                      event.preventDefault()
                      handleStatusToggle(option.value)
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#E8E6E0]"
                        checked={filters.status.has(option.value)}
                        readOnly
                      />
                      <span>{option.label}</span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">{statusSummary.get(option.value) ?? 0}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setFilters((prev) => ({ ...prev, status: new Set() }))
                    setPage(1)
                  }}
                >
                  Limpiar filtros
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Gestor</span>
              <select
                className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                value={filters.managerId}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, managerId: event.target.value }))
                  setPage(1)
                }}
              >
                <option value="">Todos</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Orden</span>
              <select
                className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F]"
                value={filters.sortBy}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, sortBy: event.target.value as FilterState["sortBy"] }))
                  setPage(1)
                }}
              >
                <option value="updated_at">Última actualización</option>
                <option value="name">Nombre</option>
                <option value="progress">Avance</option>
                <option value="start_date">Fecha inicio</option>
                <option value="estimated_delivery">Entrega estimada</option>
                <option value="status">Estado</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                className="border-[#E8E6E0]"
                onClick={() => setFilters((prev) => ({ ...prev, sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-[#2F4F4F]">Listado de proyectos</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
            <span>{response?.pagination.total ?? 0} proyectos</span>
            <span>•</span>
            <span>Página {page} de {totalPages}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E6E0]">
              <thead className="bg-[#F8F7F4]">
                <tr className="text-left text-xs uppercase tracking-[0.25em] text-[#9CA3AF]">
                  <th className="px-4 py-3">Proyecto</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Avance</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Entrega estimada</th>
                  <th className="px-4 py-3">Gestor</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando proyectos…
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-[#6B7280]">
                      No hay proyectos. Crea el primero para comenzar.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => {
                    const progress = Math.round(project.progressPercent)
                    return (
                      <tr key={project.id} className="hover:bg-[#F8F7F4]">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/projects/${project.slug ?? project.id}`)}
                              className="text-left font-semibold text-[#2F4F4F] hover:underline"
                            >
                              {project.name}
                            </button>
                            <span className="text-xs text-[#9CA3AF]">{project.code ?? "Sin código"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-[#4B5563]">{project.clientName ?? "—"}</div>
                          <div className="text-xs text-[#9CA3AF]">{project.clientEmail ?? ""}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={STATUS_BADGES[project.status] ?? "bg-[#E8E6E0] text-[#2F4F4F]"}>{statusLabel(project.status)}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 w-28" />
                            <span className="text-xs text-[#4B5563]">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#4B5563]">{formatDate(project.startDate)}</td>
                        <td className="px-4 py-4 text-[#4B5563]">{formatDate(project.estimatedDelivery)}</td>
                        <td className="px-4 py-4 text-[#4B5563]">{project.managerName ?? "—"}</td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleOpenEdit(project.id)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDuplicate(project.id)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicar
                              </DropdownMenuItem>
                              {project.status === "archivado" ? (
                                <DropdownMenuItem onSelect={() => handleRestore(project.id)}>
                                  <ArrowLeftRight className="mr-2 h-4 w-4" /> Restaurar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => handleArchive(project.id)}>
                                  <Archive className="mr-2 h-4 w-4" /> Archivar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDelete(project.id)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {projects.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#E8E6E0] px-4 py-3 text-sm text-[#6B7280]">
              <div>
                Mostrando {response?.pagination.pageSize ?? pageSize} por página · Total {response?.pagination.total ?? projects.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E8E6E0]"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E8E6E0]"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        values={formValues}
        setValues={setFormValues}
        loading={formLoading}
        clients={clients}
        teamMembers={teamMembers}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}

interface ProjectFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  values: ProjectFormValues
  setValues: (updater: ProjectFormValues | ((prev: ProjectFormValues) => ProjectFormValues)) => void
  loading: boolean
  clients: AdminClientOverview[]
  teamMembers: AdminProjectTeamMember[]
  onSubmit: (values: ProjectFormValues) => Promise<void>
}

function ProjectFormSheet({ open, onOpenChange, mode, values, setValues, loading, clients, teamMembers, onSubmit }: ProjectFormSheetProps) {
  const handleChange = (field: keyof ProjectFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSelectChange = (field: keyof ProjectFormValues) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleAssignmentChange = (role: string, memberId: string) => {
    setValues((prev) => ({
      ...prev,
      teamAssignments: {
        ...prev.teamAssignments,
        [role]: memberId,
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const safeValues = {
      ...values,
      locationNotes: values.locationNotes || ""
    };
    await onSubmit(safeValues)
  }

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.fullName }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="w-full overflow-hidden border-white/50 bg-gradient-to-br from-white/95 via-white/90 to-[#F8F7F4]/95 p-0 sm:max-w-[640px]"
      >
        <SheetHeader className="px-8 pb-2 pt-8">
          <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
            {mode === "create" ? "Nuevo proyecto" : "Editar proyecto"}
          </SheetTitle>
          <p className="text-sm text-[#6B7280]">
            Completa los datos clave y comparte el código Terrazea con tu cliente para que siga el progreso.
          </p>
        </SheetHeader>
        <ScrollArea className="h-[calc(95vh-8rem)] px-8">
          <form className="space-y-5 py-6" onSubmit={handleSubmit}>
            <div className="rounded-[1.5rem] border border-[#E8E6E0]/70 bg-white/80 p-5 shadow-[0_15px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Código Terrazea</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-2xl text-[#0D9488]">{values.code || "Se generará automáticamente"}</p>
                  <p className="text-xs text-[#6B7280]">
                    El código se asigna automáticamente al guardar y el cliente podrá usarlo en cuanto actives el proyecto.
                  </p>
                </div>
                <Badge className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#0D9488]">
                  {mode === "create" ? "Nuevo" : "Editando"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">Nombre del proyecto</Label>
                <Input value={values.name} onChange={handleChange("name")} required className="border-[#E8E6E0]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">Slug</Label>
                <Input value={values.slug} onChange={handleChange("slug")} className="border-[#E8E6E0]" placeholder="terraza-mediterranea" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-[#2F4F4F]">Estado</Label>
                  <select
                    className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                    value={values.status}
                    onChange={handleSelectChange("status")}
                  >
                    {PROJECT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#2F4F4F]">Cliente</Label>
                  {values.createNewClient ? (
                    <div className="space-y-2">
                      <Input value={values.newClientFullName} onChange={handleChange("newClientFullName")} placeholder="Nombre completo" className="border-[#E8E6E0]" />
                      <Input value={values.newClientEmail} onChange={handleChange("newClientEmail")} placeholder="correo@cliente.com" className="border-[#E8E6E0]" />
                    </div>
                  ) : (
                    <select
                      className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                      value={values.clientId}
                      onChange={handleSelectChange("clientId")}
                    >
                      <option value="">Selecciona cliente</option>
                      {clientOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="text-xs font-medium text-[#2F4F4F] underline"
                    onClick={() => setValues((prev) => ({ ...prev, createNewClient: !prev.createNewClient }))}
                  >
                    {values.createNewClient ? "Seleccionar existente" : "Crear nuevo cliente"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-[#2F4F4F]">Fecha de inicio</Label>
                  <Input type="date" value={values.startDate} onChange={handleChange("startDate")} className="border-[#E8E6E0]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#2F4F4F]">Entrega estimada</Label>
                  <Input type="date" value={values.estimatedDelivery} onChange={handleChange("estimatedDelivery")} className="border-[#E8E6E0]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">Ubicación</Label>
                <Input value={values.locationCity} onChange={handleChange("locationCity")} className="border-[#E8E6E0]" placeholder="Ciudad" />
                <Textarea value={values.locationNotes} onChange={handleChange("locationNotes")} className="border-[#E8E6E0]" placeholder="Notas de ubicación" />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[#2F4F4F]">Asignar equipo</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["director", "arquitecto", "ingeniero", "instalador"] as const).map((role) => (
                    <div key={role} className="space-y-1">
                      <span className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">{ROLE_LABELS[role]}</span>
                      <select
                        className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                        value={values.teamAssignments[role] ?? ""}
                        onChange={(event) => handleAssignmentChange(role, event.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <SheetFooter className="border-t border-white/50 pt-4">
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#E8E6E0] bg-white/70 text-[#2F4F4F] hover:bg-white"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#2F4F4F] shadow-[0_15px_35px_rgba(15,23,42,0.25)] hover:bg-[#1F3535]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Crear proyecto" : "Guardar cambios"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
