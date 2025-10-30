import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Filter, Loader2, Plus, RefreshCw, Search, UserPlus, Users2 } from "lucide-react"

import type { AdminProjectTeamMember, AdminTeamMemberProject } from "@app/types/admin"
import { createAdminTeamMember, fetchAdminTeamDirectory } from "@app/lib/api/admin"

type TeamStatusValue = "online" | "offline" | "busy" | "vacation" | "in_field"

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "director", label: "Director" },
  { value: "arquitecto", label: "Arquitecto" },
  { value: "ingeniero", label: "Ingeniero" },
  { value: "instalador", label: "Instalador" },
  { value: "coordinador", label: "Coordinación" },
  { value: "logistica", label: "Logística" },
  { value: "otro", label: "Equipo" },
]

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((option) => [option.value, option.label]))

const STATUS_OPTIONS: Array<{ value: TeamStatusValue; label: string }> = [
  { value: "online", label: "Disponible" },
  { value: "busy", label: "Ocupado" },
  { value: "in_field", label: "En obra" },
  { value: "vacation", label: "Fuera de oficina" },
  { value: "offline", label: "No disponible" },
]

const STATUS_LABELS = STATUS_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const STATUS_BADGES: Record<string, string> = {
  online: "bg-[#DCFCE7] text-[#047857]",
  busy: "bg-[#FEF3C7] text-[#B45309]",
  in_field: "bg-[#DBEAFE] text-[#1D4ED8]",
  vacation: "bg-[#E9D5FF] text-[#6D28D9]",
  offline: "bg-[#E5E7EB] text-[#374151]",
}

const INITIAL_TOTALS = {
  total: 0,
  byRole: {} as Record<string, number>,
  byStatus: {} as Record<string, number>,
}

interface CreateTeamMemberFormValues {
  fullName: string
  role: string
  email: string
  phone: string
  status: TeamStatusValue
}

export function AdminTeamPage() {
  const [teamMembers, setTeamMembers] = useState<AdminProjectTeamMember[]>([])
  const [totals, setTotals] = useState<typeof INITIAL_TOTALS>(INITIAL_TOTALS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilters, setRoleFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<TeamStatusValue[]>([])
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminTeamDirectory({
        search: search.length > 0 ? search : undefined,
        roles: roleFilters.length > 0 ? roleFilters : undefined,
        status: statusFilters.length > 0 ? statusFilters : undefined,
      })

      setTeamMembers(result.teamMembers)
      setTotals(
        result.totals ?? {
          total: result.teamMembers.length,
          byRole: {},
          byStatus: {},
        },
      )
    } catch (requestError) {
      console.error(requestError)
      setError("No se pudo cargar el equipo.")
      toast.error("No se pudo cargar el equipo.")
    } finally {
      setLoading(false)
    }
  }, [roleFilters, search, statusFilters])

  useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  const toggleRole = (value: string) => {
    setRoleFilters((prev) => (prev.includes(value) ? prev.filter((role) => role !== value) : [...prev, value]))
  }

  const toggleStatus = (value: TeamStatusValue) => {
    setStatusFilters((prev) => (prev.includes(value) ? prev.filter((status) => status !== value) : [...prev, value]))
  }

  const roleSummary = useMemo(() => {
    return ROLE_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
      count: totals.byRole[option.value] ?? 0,
    })).filter((entry) => entry.count > 0)
  }, [totals.byRole])

  const statusSummary = useMemo(() => {
    return STATUS_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
      count: totals.byStatus[option.value] ?? 0,
    })).filter((entry) => entry.count > 0)
  }, [totals.byStatus])

  const handleCreateMember = async (values: CreateTeamMemberFormValues) => {
    const fullName = values.fullName.trim()
    if (fullName.length === 0) {
      toast.error("Introduce el nombre completo.")
      return
    }
    if (!values.role) {
      toast.error("Selecciona un rol.")
      return
    }

    setCreating(true)
    try {
      await createAdminTeamMember({
        fullName,
        role: values.role,
        email: values.email.trim().length > 0 ? values.email.trim() : undefined,
        phone: values.phone.trim().length > 0 ? values.phone.trim() : undefined,
        status: values.status,
      })
      toast.success("Miembro del equipo creado.")
      setCreateSheetOpen(false)
      await loadTeam()
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo crear el miembro del equipo.")
    } finally {
      setCreating(false)
    }
  }

  const projectsLabel = (projects?: AdminTeamMemberProject[]) => {
    if (!projects || projects.length === 0) return "Sin proyectos"
    if (projects.length === 1) return projects[0].name
    const [first, second, ...rest] = projects
    if (!second) return first.name
    if (projects.length === 2) return `${first.name}, ${second.name}`
    return `${first.name}, ${second.name} +${rest.length}`
  }

  const resetFilters = () => {
    setRoleFilters([])
    setStatusFilters([])
    setSearchInput("")
    setSearch("")
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="font-heading text-3xl text-[#2F4F4F]">Equipo Terrazea</CardTitle>
            <p className="text-sm text-[#6B7280]">Gestiona el equipo interno y asigna responsables a los proyectos.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-[#E8E6E0] text-[#2F4F4F]" onClick={loadTeam} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button className="bg-[#2F4F4F] text-white hover:bg-[#1F3535]" onClick={() => setCreateSheetOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Nuevo miembro
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
                placeholder="Buscar por nombre, rol o email"
                className="w-full rounded-full border-[#E8E6E0] bg-[#F8F7F4] pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full border-[#E8E6E0] text-[#2F4F4F]">
                  <Users2 className="mr-2 h-4 w-4" /> Roles
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Filtrar por rol</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ROLE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={(event) => {
                      event.preventDefault()
                      toggleRole(option.value)
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#E8E6E0]" checked={roleFilters.includes(option.value)} readOnly />
                      <span>{option.label}</span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">{totals.byRole[option.value] ?? 0}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setRoleFilters([])
                  }}
                >
                  Limpiar roles
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full border-[#E8E6E0] text-[#2F4F4F]">
                  <Filter className="mr-2 h-4 w-4" /> Estado
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={(event) => {
                      event.preventDefault()
                      toggleStatus(option.value)
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#E8E6E0]" checked={statusFilters.includes(option.value)} readOnly />
                      <span>{option.label}</span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">{totals.byStatus[option.value] ?? 0}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setStatusFilters([])
                  }}
                >
                  Limpiar estados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
            <span>{totals.total} personas</span>
            {(roleFilters.length > 0 || statusFilters.length > 0 || search.length > 0) && (
              <>
                <span>•</span>
                <button type="button" className="underline" onClick={resetFilters}>
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F4F4F]/10">
              <Users2 className="h-6 w-6 text-[#2F4F4F]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#9CA3AF]">Total equipo</p>
              <p className="text-2xl font-semibold text-[#2F4F4F]">{totals.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8E6E0] bg-white">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#9CA3AF]">Roles activos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roleSummary.length === 0 ? (
                <span className="text-sm text-[#6B7280]">No hay asignaciones registradas.</span>
              ) : (
                roleSummary.map((entry) => (
                  <Badge key={entry.value} className="bg-[#F8F7F4] text-[#2F4F4F]">
                    {entry.label} ({entry.count})
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E8E6E0] bg-white">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[#9CA3AF]">Estado del equipo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusSummary.length === 0 ? (
                <span className="text-sm text-[#6B7280]">Sin información de estado.</span>
              ) : (
                statusSummary.map((entry) => (
                  <Badge key={entry.value} className={STATUS_BADGES[entry.value] ?? "bg-[#E5E7EB] text-[#374151]"}>
                    {STATUS_LABELS[entry.value] ?? entry.value} ({entry.count})
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-[#2F4F4F]">Directorio del equipo</CardTitle>
          <p className="text-xs text-[#9CA3AF]">Gestiona responsables, consulta contactos y revisa su carga de proyectos.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E6E0]">
              <thead className="bg-[#F8F7F4]">
                <tr className="text-left text-xs uppercase tracking-[0.25em] text-[#9CA3AF]">
                  <th className="px-4 py-3">Miembro</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Proyectos asignados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando equipo…
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-[#6B7280]">
                      No hay miembros registrados. Crea el primero para comenzar.
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-[#F8F7F4]">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#2F4F4F]">{member.name}</span>
                          <span className="text-xs text-[#9CA3AF]">{member.email ?? "Sin correo"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#4B5563]">{ROLE_LABELS[member.role] ?? member.role}</td>
                      <td className="px-4 py-4">
                        <Badge className={STATUS_BADGES[member.status] ?? "bg-[#E5E7EB] text-[#374151]"}>
                          {STATUS_LABELS[member.status] ?? member.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col text-[#4B5563]">
                          <span>{member.phone ?? "Sin teléfono"}</span>
                          {member.createdAt && <span className="text-xs text-[#9CA3AF]">Alta {new Date(member.createdAt).toLocaleDateString("es-ES")}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 text-sm text-[#4B5563]">
                          <span>{projectsLabel(member.projects)}</span>
                          {member.projects && member.projects.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {member.projects.slice(0, 4).map((project) => (
                                <Badge key={project.id} className="bg-[#F8F7F4] text-[#2F4F4F]">
                                  {project.name}
                                </Badge>
                              ))}
                              {member.projects.length > 4 && (
                                <span className="text-xs text-[#6B7280]">+{member.projects.length - 4} más</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateTeamMemberSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} loading={creating} onSubmit={handleCreateMember} />
    </div>
  )
}

const EMPTY_FORM: CreateTeamMemberFormValues = {
  fullName: "",
  role: ROLE_OPTIONS[0]?.value ?? "director",
  email: "",
  phone: "",
  status: "online",
}

interface CreateTeamMemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onSubmit: (values: CreateTeamMemberFormValues) => Promise<void> | void
}

function CreateTeamMemberSheet({ open, onOpenChange, loading, onSubmit }: CreateTeamMemberSheetProps) {
  const [values, setValues] = useState<CreateTeamMemberFormValues>(EMPTY_FORM)

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_FORM)
    }
  }, [open])

  const handleChange = (field: keyof CreateTeamMemberFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#E8E6E0] px-6 py-5">
          <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">Nuevo miembro del equipo</SheetTitle>
        </SheetHeader>
        <form className="px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Nombre completo</Label>
              <Input required value={values.fullName} onChange={handleChange("fullName")} className="border-[#E8E6E0]" placeholder="Nombre y apellidos" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Rol</Label>
              <select
                className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                value={values.role}
                onChange={handleChange("role")}
                required
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">Email (opcional)</Label>
                <Input type="email" value={values.email} onChange={handleChange("email")} className="border-[#E8E6E0]" placeholder="correo@terrazea.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">Teléfono (opcional)</Label>
                <Input value={values.phone} onChange={handleChange("phone")} className="border-[#E8E6E0]" placeholder="+34 600 123 456" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Estado</Label>
              <select
                className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                value={values.status}
                onChange={handleChange("status")}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SheetFooter className="mt-6 border-t border-[#E8E6E0] pt-4">
            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" className="border-[#E8E6E0]" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#2F4F4F]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {loading ? "Guardando" : "Guardar miembro"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
