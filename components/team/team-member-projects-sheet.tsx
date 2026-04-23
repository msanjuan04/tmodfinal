"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import axios from "axios"
import {
  Briefcase,
  Check,
  FolderKanban,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  fetchAdminProjects,
  setTeamMemberProjects,
  type TeamMemberProjectAssignment,
} from "@app/lib/api/admin"
import type { AdminProjectListItem, AdminTeamMemberProject } from "@app/types/admin"
import {
  getProjectStatusBadgeClass,
  getProjectStatusLabel,
  isCompletedProjectStatus,
} from "@/lib/constants/project-status"

const ROLE_OPTIONS = [
  { value: "director", label: "Director" },
  { value: "arquitecto", label: "Arquitecto" },
  { value: "ingeniero", label: "Ingeniero" },
  { value: "instalador", label: "Instalador" },
  { value: "coordinador", label: "Coordinación" },
  { value: "logistica", label: "Logística" },
  { value: "otro", label: "Equipo" },
] as const

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"]

interface TeamMemberProjectsSheetProps {
  memberId: string
  memberName: string
  /** Rol por defecto al seleccionar proyectos nuevos (el rol del miembro). */
  defaultRole?: string
  /** Proyectos ya asignados (con rol actual). Se usan para prerrellenar. */
  currentAssignments: AdminTeamMemberProject[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface SelectionState {
  projectId: string
  role: RoleValue
}

export function TeamMemberProjectsSheet({
  memberId,
  memberName,
  defaultRole,
  currentAssignments,
  open,
  onOpenChange,
  onSaved,
}: TeamMemberProjectsSheetProps) {
  const [allProjects, setAllProjects] = useState<AdminProjectListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [selections, setSelections] = useState<Map<string, RoleValue>>(new Map())
  const [includeFinalized, setIncludeFinalized] = useState(false)

  // Rol por defecto para proyectos nuevos (fallback a "otro" si el rol no está en la lista).
  const normalizedDefaultRole: RoleValue = useMemo(() => {
    if (!defaultRole) return "otro"
    const match = ROLE_OPTIONS.find((r) => r.value === defaultRole)
    return (match?.value ?? "otro") as RoleValue
  }, [defaultRole])

  // Al abrir: carga proyectos + prerrellena selecciones con las asignaciones actuales
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        // Traemos una lista amplia; si hay muchos proyectos considerar paginación futura.
        const response = await fetchAdminProjects({ pageSize: 500 })
        if (cancelled) return
        setAllProjects(response.projects)
      } catch (err) {
        console.error("No se pudieron cargar los proyectos", err)
        toast.error("No se pudieron cargar los proyectos")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // Prerrellena desde currentAssignments
    const initial = new Map<string, RoleValue>()
    currentAssignments.forEach((p) => {
      const role = ROLE_OPTIONS.find((r) => r.value === p.assignedRole)?.value ?? "otro"
      initial.set(p.id, role as RoleValue)
    })
    setSelections(initial)
    setSearch("")

    return () => {
      cancelled = true
    }
  }, [open, currentAssignments])

  // Lista filtrada y ordenada para mostrar
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allProjects
      .filter((p) => {
        if (!includeFinalized && isCompletedProjectStatus(p.status)) return false
        if (!query) return true
        return (
          p.name.toLowerCase().includes(query) ||
          (p.clientName ?? "").toLowerCase().includes(query) ||
          (p.code ?? "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        // Primero los ya seleccionados, luego por nombre
        const aSel = selections.has(a.id) ? 0 : 1
        const bSel = selections.has(b.id) ? 0 : 1
        if (aSel !== bSel) return aSel - bSel
        return a.name.localeCompare(b.name)
      })
  }, [allProjects, search, includeFinalized, selections])

  const toggleProject = (projectId: string) => {
    setSelections((prev) => {
      const next = new Map(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.set(projectId, normalizedDefaultRole)
      }
      return next
    })
  }

  const changeProjectRole = (projectId: string, role: RoleValue) => {
    setSelections((prev) => {
      const next = new Map(prev)
      next.set(projectId, role)
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    const assignments: TeamMemberProjectAssignment[] = Array.from(selections.entries()).map(
      ([projectId, role]) => ({
        projectId,
        role,
        isPrimary: role === "director",
      }),
    )

    setSaving(true)
    try {
      await setTeamMemberProjects(memberId, assignments)
      toast.success(
        assignments.length === 0
          ? "Proyectos desasignados correctamente"
          : `${assignments.length} proyecto${assignments.length === 1 ? "" : "s"} asignado${
              assignments.length === 1 ? "" : "s"
            }`,
      )
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error guardando asignaciones", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "No se pudieron guardar las asignaciones")
      } else {
        toast.error("No se pudieron guardar las asignaciones")
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = selections.size
  const totalVisible = filteredProjects.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <SheetHeader className="border-b border-[#E8E6E0] bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2F4F4F] text-white">
                <FolderKanban className="h-4 w-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Asignar proyectos</p>
            </div>
            <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">{memberName}</SheetTitle>
            <SheetDescription className="text-sm text-[#6B7280]">
              Elige los proyectos en los que participa y asigna un rol para cada uno. Se guarda al
              pulsar “Guardar cambios”.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-5">
            {/* Resumen + controles */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.25rem] border border-[#E8E6E0] bg-white p-3">
              <div className="flex items-center gap-2 text-sm text-[#2F4F4F]">
                <Briefcase className="h-4 w-4" />
                <span className="font-semibold">
                  {selectedCount} proyecto{selectedCount === 1 ? "" : "s"} seleccionado
                  {selectedCount === 1 ? "" : "s"}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-[#6B7280]">
                <input
                  type="checkbox"
                  checked={includeFinalized}
                  onChange={(e) => setIncludeFinalized(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#C6B89E]"
                />
                Incluir proyectos finalizados
              </label>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cliente o código…"
                className="h-11 rounded-[1rem] border-[#E8E6E0] bg-white pl-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#9CA3AF] hover:bg-[#F8F7F4]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-[#6B7280]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando proyectos…
                </div>
              ) : totalVisible === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-white px-4 py-10 text-center text-sm text-[#6B7280]">
                  {search
                    ? "No hay proyectos que coincidan con tu búsqueda."
                    : "No hay proyectos disponibles."}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredProjects.map((project) => {
                    const isSelected = selections.has(project.id)
                    const selectedRole = selections.get(project.id)
                    return (
                      <li
                        key={project.id}
                        className={cn(
                          "rounded-[1.25rem] border bg-white p-3 transition",
                          isSelected
                            ? "border-[#2F4F4F]/40 bg-[#F4F1EA]/50 shadow-apple-sm"
                            : "border-[#E8E6E0] hover:border-[#2F4F4F]/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleProject(project.id)}
                            aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                              isSelected
                                ? "border-[#2F4F4F] bg-[#2F4F4F] text-white"
                                : "border-[#C6B89E] bg-white hover:border-[#2F4F4F]",
                            )}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleProject(project.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-heading text-sm font-semibold text-[#2F4F4F]">
                                {project.name}
                              </p>
                              <Badge
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  getProjectStatusBadgeClass(project.status),
                                )}
                              >
                                {getProjectStatusLabel(project.status)}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#6B7280]">
                              {project.clientName ?? "Sin cliente"}
                              {project.code ? ` · ${project.code}` : ""}
                            </p>
                          </button>
                          {isSelected ? (
                            <select
                              value={selectedRole}
                              onChange={(e) =>
                                changeProjectRole(project.id, e.target.value as RoleValue)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 shrink-0 rounded-lg border border-[#E8E6E0] bg-white px-2 text-xs text-[#2F4F4F] focus:border-[#2F4F4F]"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-2 border-t border-[#E8E6E0] bg-white px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-full border-[#E8E6E0] px-4 text-sm font-medium text-[#4B5563]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2F4F4F] px-5 text-sm font-semibold text-white hover:bg-[#1F3535]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
