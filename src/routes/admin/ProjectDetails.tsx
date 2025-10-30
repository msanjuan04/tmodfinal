import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  Archive,
  ArrowLeft,
  CheckSquare,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { ProjectTasksManager } from "@/components/project/project-tasks-manager"
import type {
  AdminProjectDetails,
  AdminProjectMilestone,
  AdminProjectPhase,
  AdminProjectDocument,
  AdminProjectPhoto,
  AdminProjectTeamMember,
} from "@app/types/admin"
import {
  archiveAdminProject,
  createAdminProjectMilestone,
  createAdminProjectPhase,
  createAdminProjectTimelineEvent,
  deleteAdminProject,
  deleteAdminProjectDocument,
  deleteAdminProjectMilestone,
  deleteAdminProjectPhase,
  deleteAdminProjectPhoto,
  fetchAdminProjectDetails,
  fetchAdminTeamMembers,
  reorderAdminProjectMilestones,
  reorderAdminProjectPhases,
  reorderAdminProjectPhotos,
  restoreAdminProject,
  updateAdminProject,
  updateAdminProjectDocument,
  updateAdminProjectMilestone,
  updateAdminProjectPhase,
  updateAdminProjectPhoto,
  updateAdminProjectTeam,
  uploadAdminProjectDocument,
  uploadAdminProjectPhoto,
} from "@app/lib/api/admin"

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-[#F8F7F4] text-[#4B5563]",
  in_progress: "bg-[#DBEAFE] text-[#1D4ED8]",
  completed: "bg-[#DCFCE7] text-[#047857]",
  delayed: "bg-[#FEF3C7] text-[#B45309]",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Alcanzado",
  delayed: "Retrasado",
}

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

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  arquitecto: "Arquitecto",
  ingeniero: "Ingeniero",
  instalador: "Instalador",
  coordinador: "Coordinador",
  logistica: "Logística",
  otro: "Equipo",
}

function statusLabel(value: string) {
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha"
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es })
  } catch (error) {
    return value
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha"
  try {
    return format(new Date(value), "d MMM yyyy - HH:mm", { locale: es })
  } catch (error) {
    return value
  }
}

function formatWeight(weight: number) {
  return weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(2)
}

export function AdminProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AdminProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<AdminProjectTeamMember[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [projectDetail, teamDirectory] = await Promise.all([
        fetchAdminProjectDetails(projectId),
        fetchAdminTeamMembers(),
      ])
      setDetail(projectDetail)
      setTeamMembers(teamDirectory)
    } catch (requestError) {
      console.error(requestError)
      setError("No se pudo cargar el proyecto")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadDetail()
  }

  const handleProgressChange = (progress: number) => {
    setDetail((prev) => (prev ? { ...prev, project: { ...prev.project, progressPercent: progress } } : prev))
  }

  const handleTaskStatsChange = (stats: { total: number; done: number }) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            stats: {
              ...prev.stats,
              totalTasks: stats.total,
              completedTasks: stats.done,
            },
          }
        : prev,
    )
  }

  const handleTaskCountersChange = (counters: { completedWeight: number; totalWeight: number }) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            stats: {
              ...prev.stats,
              completedWeight: counters.completedWeight,
              totalWeight: counters.totalWeight,
            },
          }
        : prev,
    )
  }

  if (!projectId) {
    return (
      <div className="space-y-4">
        <Card className="border-[#FCA5A5]">
          <CardContent className="py-10 text-center text-[#B91C1C]">Proyecto no encontrado.</CardContent>
        </Card>
      </div>
    )
  }

  if (loading && !detail) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-[#6B7280]">
        <Loader2 className="h-6 w-6 animate-spin" />
        Cargando detalles del proyecto…
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="inline-flex items-center gap-2 text-[#2F4F4F]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-10 text-center text-[#B91C1C]">{error ?? "No se pudo cargar el proyecto."}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Button variant="ghost" size="sm" className="-ml-2 text-[#2F4F4F]" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Volver
              </Button>
              <span>•</span>
              <span className="text-[#2F4F4F]">Proyecto</span>
            </div>
            <div>
              <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">{detail.project.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
                {detail.project.code ? <span>Proyecto #{detail.project.code}</span> : null}
                {detail.project.clientName ? (
                  <>
                    <span>•</span>
                    <span>Cliente: {detail.project.clientName}</span>
                  </>
                ) : null}
                {detail.project.locationCity ? (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {detail.project.locationCity}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[#2F4F4F] px-4 py-2 text-white">
              {statusLabel(detail.project.status)}
            </Badge>
            <Button variant="outline" className="border-[#E8E6E0] text-[#2F4F4F]" onClick={handleManualRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando" : "Actualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Progreso</p>
            <div className="flex items-end justify-between">
              <span className="font-heading text-3xl text-[#2F4F4F]">{detail.project.progressPercent.toFixed(1)}%</span>
              <span className="text-xs text-[#6B7280]">
                {detail.stats.completedTasks}/{detail.stats.totalTasks} tareas completadas
              </span>
            </div>
            <Progress value={detail.project.progressPercent} className="h-2 bg-[#E8E6E0]" />
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Resumen rápido</p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span>Hitos alcanzados</span>
                <span className="font-semibold">{detail.stats.milestonesCompleted}/{detail.stats.milestonesTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Documentos</span>
                <span className="font-semibold">{detail.stats.documentsTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Fotos</span>
                <span className="font-semibold">{detail.stats.photosTotal}</span>
              </div>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Fechas clave</p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span>Inicio</span>
                <span className="font-semibold">{formatDate(detail.project.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega estimada</span>
                <span className="font-semibold">{formatDate(detail.project.estimatedDelivery)}</span>
              </div>
              <div className="flex justify-between">
                <span>Actualizado</span>
                <span className="font-semibold">{formatDate(detail.project.lastUpdatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="border border-[#E8E6E0] bg-white">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="roadmap">Fases e hitos</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="settings">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-[#E8E6E0]">
            <CardHeader>
              <CardTitle className="text-[#2F4F4F]">Actividades recientes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {detail.timeline.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{formatDateTime(event.occurredAt)}</p>
                  <p className="mt-2 font-medium text-[#2F4F4F]">{event.title}</p>
                  {event.description ? <p className="mt-1 text-xs text-[#6B7280]">{event.description}</p> : null}
                </div>
              ))}
              {detail.timeline.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No hay actividad registrada recientemente.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-[#E8E6E0]">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-[#2F4F4F]">Tareas del proyecto</CardTitle>
                <p className="text-sm text-[#6B7280]">Gestión de tareas y checklist operativo.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ProjectTasksManager
                projectId={detail.project.id}
                projectName={detail.project.name}
                projectCode={detail.project.code}
                projectStatus={detail.project.status}
                initialProgress={detail.project.progressPercent}
                doneCount={detail.stats.completedTasks}
                totalCount={detail.stats.totalTasks}
                teamMembers={teamMembers.map((member) => ({ id: member.id, name: member.name, role: member.role, status: member.status }))}
                onProgressChange={handleProgressChange}
                onStatsChange={(stats) => handleTaskStatsChange({ total: stats.total, done: stats.done })}
                onCountersChange={(counters) => handleTaskCountersChange(counters)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <TeamSection detail={detail} teamMembers={teamMembers} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <RoadmapSection detail={detail} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection projectId={detail.project.id} documents={detail.documents} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="photos">
          <PhotosSection projectId={detail.project.id} photos={detail.photos} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineSection projectId={detail.project.id} timeline={detail.timeline} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsSection detail={detail} onUpdated={loadDetail} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TeamSectionProps {
  detail: AdminProjectDetails
  teamMembers: AdminProjectTeamMember[]
  onUpdated: () => Promise<void>
}

function TeamSection({ detail, teamMembers, onUpdated }: TeamSectionProps) {
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    detail.team.assignments.forEach((assignment) => {
      if (assignment.memberId) map[assignment.role] = assignment.memberId
    })
    return map
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      await updateAdminProjectTeam(detail.project.id, assignments)
      toast.success("Equipo actualizado")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo actualizar el equipo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader>
        <CardTitle className="text-[#2F4F4F]">Equipo asignado</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(["director", "arquitecto", "ingeniero", "instalador", "coordinador", "logistica", "otro"] as const).map((role) => (
              <div key={role} className="space-y-1">
                <Label className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">{ROLE_LABELS[role]}</Label>
                <select
                  className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                  value={assignments[role] ?? ""}
                  onChange={(event) => setAssignments((prev) => ({ ...prev, [role]: event.target.value }))}
                >
                  <option value="">Sin asignar</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="bg-[#2F4F4F]" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar equipo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface RoadmapSectionProps {
  detail: AdminProjectDetails
  onUpdated: () => Promise<void>
}

function RoadmapSection({ detail, onUpdated }: RoadmapSectionProps) {
  const [phaseSaving, setPhaseSaving] = useState(false)
  const [milestoneSaving, setMilestoneSaving] = useState(false)

  const handlePhaseCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const name = String(form.get("name") ?? "").trim()
    if (!name) {
      toast.error("Introduce un nombre para la fase")
      return
    }
    try {
      setPhaseSaving(true)
      await createAdminProjectPhase(detail.project.id, {
        name,
        summary: String(form.get("summary") ?? "") || null,
        expectedStart: String(form.get("expectedStart") ?? "") || null,
        expectedEnd: String(form.get("expectedEnd") ?? "") || null,
        weight: Number(form.get("weight") ?? 1),
      })
      event.currentTarget.reset()
      toast.success("Fase creada")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo crear la fase")
    } finally {
      setPhaseSaving(false)
    }
  }

  const handleMilestoneCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const title = String(form.get("title") ?? "").trim()
    if (!title) {
      toast.error("Introduce un título para el hito")
      return
    }
    try {
      setMilestoneSaving(true)
      await createAdminProjectMilestone(detail.project.id, {
        title,
        summary: String(form.get("summary") ?? "") || null,
        scheduledStart: String(form.get("scheduledStart") ?? "") || null,
        scheduledEnd: String(form.get("scheduledEnd") ?? "") || null,
        weight: Number(form.get("weight") ?? 1),
      })
      event.currentTarget.reset()
      toast.success("Hito creado")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo crear el hito")
    } finally {
      setMilestoneSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-[#E8E6E0]">
        <CardHeader>
          <CardTitle className="text-[#2F4F4F]">Fases del proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SortableList
            items={detail.phases}
            onReorder={async (items) => {
              try {
                await reorderAdminProjectPhases(detail.project.id, items)
                await onUpdated()
              } catch (error) {
                console.error(error)
                toast.error("No se pudo reordenar las fases")
              }
            }}
            renderItem={(phase) => (
              <RoadmapItem
                item={phase}
                onUpdate={async (payload) => {
                  try {
                    await updateAdminProjectPhase(detail.project.id, phase.id, payload as Partial<AdminProjectPhase>)
                    await onUpdated()
                  } catch (error) {
                    console.error(error)
                    toast.error("No se pudo actualizar la fase")
                  }
                }}
                onDelete={async () => {
                  if (!window.confirm("¿Eliminar esta fase?")) return
                  try {
                    await deleteAdminProjectPhase(detail.project.id, phase.id)
                    await onUpdated()
                  } catch (error) {
                    console.error(error)
                    toast.error("No se pudo eliminar la fase")
                  }
                }}
              />
            )}
          />

          <form className="space-y-3 rounded-[1.25rem] border border-dashed border-[#E8E6E0] p-4" onSubmit={handlePhaseCreate}>
            <p className="text-sm font-medium text-[#2F4F4F]">Nueva fase</p>
            <Input name="name" placeholder="Nombre de la fase" className="border-[#E8E6E0]" required />
            <Textarea name="summary" placeholder="Descripción" className="border-[#E8E6E0]" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input name="expectedStart" type="date" className="border-[#E8E6E0]" />
              <Input name="expectedEnd" type="date" className="border-[#E8E6E0]" />
            </div>
            <Input name="weight" type="number" step="0.25" min="0.25" defaultValue={1} className="border-[#E8E6E0]" />
            <Button type="submit" className="bg-[#2F4F4F]" disabled={phaseSaving}>
              {phaseSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Añadir fase
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[#E8E6E0]">
        <CardHeader>
          <CardTitle className="text-[#2F4F4F]">Hitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SortableList
            items={detail.milestones}
            onReorder={async (items) => {
              try {
                await reorderAdminProjectMilestones(detail.project.id, items)
                await onUpdated()
              } catch (error) {
                console.error(error)
                toast.error("No se pudo reordenar los hitos")
              }
            }}
            renderItem={(milestone) => (
              <RoadmapItem
                item={milestone}
                onUpdate={async (payload) => {
                  try {
                    await updateAdminProjectMilestone(detail.project.id, milestone.id, payload as Partial<AdminProjectMilestone>)
                    await onUpdated()
                  } catch (error) {
                    console.error(error)
                    toast.error("No se pudo actualizar el hito")
                  }
                }}
                onDelete={async () => {
                  if (!window.confirm("¿Eliminar este hito?")) return
                  try {
                    await deleteAdminProjectMilestone(detail.project.id, milestone.id)
                    await onUpdated()
                  } catch (error) {
                    console.error(error)
                    toast.error("No se pudo eliminar el hito")
                  }
                }}
              />
            )}
          />

          <form className="space-y-3 rounded-[1.25rem] border border-dashed border-[#E8E6E0] p-4" onSubmit={handleMilestoneCreate}>
            <p className="text-sm font-medium text-[#2F4F4F]">Nuevo hito</p>
            <Input name="title" placeholder="Título del hito" className="border-[#E8E6E0]" required />
            <Textarea name="summary" placeholder="Descripción" className="border-[#E8E6E0]" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input name="scheduledStart" type="date" className="border-[#E8E6E0]" />
              <Input name="scheduledEnd" type="date" className="border-[#E8E6E0]" />
            </div>
            <Input name="weight" type="number" step="0.25" min="0.25" defaultValue={1} className="border-[#E8E6E0]" />
            <Button type="submit" className="bg-[#2F4F4F]" disabled={milestoneSaving}>
              {milestoneSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Añadir hito
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface SortableListProps<T extends { id: string; sortOrder: number }> {
  items: T[]
  onReorder: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>
  renderItem: (item: T) => React.ReactNode
}

function SortableList<T extends { id: string; sortOrder: number }>({ items, onReorder, renderItem }: SortableListProps<T>) {
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result
    if (!destination || destination.index === source.index || destination.droppableId !== source.droppableId) return
    const reordered = [...items]
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    await onReorder(reordered.map((item, index) => ({ id: item.id, sortOrder: index })))
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="roadmap-droppable">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
            {items.map((item, index) => (
              <Draggable draggableId={item.id} index={index} key={item.id}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                    {renderItem(item)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

interface RoadmapItemProps {
  item: AdminProjectMilestone | AdminProjectPhase
  onUpdate: (payload: Record<string, unknown>) => Promise<void>
  onDelete: () => Promise<void>
}

function RoadmapItem({ item, onUpdate, onDelete }: RoadmapItemProps) {
  const isMilestone = "scheduledStart" in item || "scheduled_end" in item
  const startValue = (isMilestone ? (item as AdminProjectMilestone).scheduledStart : (item as AdminProjectPhase).expectedStart) ?? null
  const endValue = (isMilestone ? (item as AdminProjectMilestone).scheduledEnd : (item as AdminProjectPhase).expectedEnd) ?? null

  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-medium text-[#2F4F4F]">{"title" in item ? item.title : item.name}</h3>
          {"summary" in item && item.summary ? <p className="text-xs text-[#6B7280]">{item.summary}</p> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span>Peso {formatWeight(item.weight)}</span>
          <Badge className={STATUS_CHIP[item.status] ?? "bg-[#E8E6E0] text-[#4B5563]"}>{STATUS_LABELS[item.status] ?? item.status}</Badge>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-[#6B7280] md:grid-cols-3">
        <div>
          <span className="uppercase tracking-[0.2em] text-[#C6B89E]">Inicio</span>
          <p className="text-sm text-[#4B5563]">{formatDate(startValue)}</p>
        </div>
        <div>
          <span className="uppercase tracking-[0.2em] text-[#C6B89E]">Entrega</span>
          <p className="text-sm text-[#4B5563]">{formatDate(endValue)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#2F4F4F]"
            onClick={() => onUpdate({ status: item.status === "completed" ? "pending" : "completed" })}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-[#B91C1C]" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface DocumentsSectionProps {
  projectId: string
  documents: AdminProjectDocument[]
  onUpdated: () => Promise<void>
}

const DOCUMENT_CATEGORIES = ["Planos", "Certificados", "Legal", "Garantías", "Técnico", "Fotos del progreso", "Otros"]

function DocumentsSection({ projectId, documents, onUpdated }: DocumentsSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const filteredDocuments = categoryFilter ? documents.filter((doc) => doc.category === categoryFilter) : documents

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const category = categoryFilter || "Planos"
    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        await uploadAdminProjectDocument(projectId, {
          file,
          category,
        })
      }
      toast.success("Documento subido")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo subir el documento")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleCategoryChange = async (documentId: string, category: string) => {
    try {
      await updateAdminProjectDocument(projectId, documentId, { category })
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo actualizar el documento")
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
            <FileText className="h-5 w-5" /> Documentos
          </CardTitle>
          <p className="text-sm text-[#6B7280]">Carga y gestiona documentación del proyecto.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-[#E8E6E0] bg-white px-3 py-1 text-sm text-[#2F4F4F]"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#2F4F4F] px-4 py-2 text-sm font-medium text-[#2F4F4F]">
            <Plus className="h-4 w-4" /> Subir
            <Input type="file" className="hidden" onChange={handleUpload} multiple accept="application/pdf,image/*" />
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploading ? (
          <div className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo documentos…
          </div>
        ) : null}
        {filteredDocuments.length === 0 ? (
          <p className="text-sm text-[#6B7280]">No hay documentos en esta categoría.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4 text-sm text-[#4B5563]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#2F4F4F]">{document.name}</p>
                    <p className="text-xs text-[#9CA3AF]">{formatDate(document.uploadedAt)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-[#B91C1C]" onClick={async () => {
                    if (!window.confirm("¿Eliminar documento?")) return
                    await deleteAdminProjectDocument(projectId, document.id)
                    await onUpdated()
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <select
                    className="w-full rounded-lg border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-2 text-xs text-[#2F4F4F]"
                    value={document.category}
                    onChange={(event) => handleCategoryChange(document.id, event.target.value)}
                  >
                    {DOCUMENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>{document.sizeLabel}</span>
                    {document.url ? (
                      <a href={document.url} target="_blank" rel="noreferrer" className="text-[#2F4F4F] underline">
                        Ver archivo
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface PhotosSectionProps {
  projectId: string
  photos: AdminProjectPhoto[]
  onUpdated: () => Promise<void>
}

function PhotosSection({ projectId, photos, onUpdated }: PhotosSectionProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        await uploadAdminProjectPhoto(projectId, { file })
      }
      toast.success("Foto subida")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo subir la foto")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
            <ImageIcon className="h-5 w-5" /> Galería fotográfica
          </CardTitle>
          <p className="text-sm text-[#6B7280]">Sube evidencias visuales del proyecto y selecciona una portada.</p>
        </div>
        <Label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#2F4F4F] px-4 py-2 text-sm font-medium text-[#2F4F4F]">
          <Plus className="h-4 w-4" /> Añadir fotos
          <Input type="file" className="hidden" onChange={handleUpload} multiple accept="image/*" />
        </Label>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploading ? (
          <div className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo fotos…
          </div>
        ) : null}
        {photos.length === 0 ? (
          <p className="text-sm text-[#6B7280]">Aún no hay fotos asociadas a este proyecto.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group overflow-hidden rounded-[1.5rem] border border-[#E8E6E0]">
                <img src={photo.url} alt={photo.caption ?? "Foto del proyecto"} className="h-48 w-full object-cover transition-transform group-hover:scale-105" />
                <div className="space-y-3 p-3 text-sm text-[#4B5563]">
                  <p className="font-medium text-[#2F4F4F]">{photo.caption ?? "Sin descripción"}</p>
                  <p className="text-xs text-[#9CA3AF]">{formatDate(photo.takenAt)}</p>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`border-[#E8E6E0] ${photo.isCover ? "bg-[#2F4F4F] text-white" : ""}`}
                      onClick={async () => {
                        await updateAdminProjectPhoto(projectId, photo.id, { isCover: true })
                        await onUpdated()
                      }}
                    >
                      Portada
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#B91C1C]"
                      onClick={async () => {
                        if (!window.confirm("¿Eliminar foto?")) return
                        await deleteAdminProjectPhoto(projectId, photo.id)
                        await onUpdated()
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TimelineSectionProps {
  projectId: string
  timeline: AdminProjectDetails["timeline"]
  onUpdated: () => Promise<void>
}

function TimelineSection({ projectId, timeline, onUpdated }: TimelineSectionProps) {
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget as HTMLFormElement)
    const title = String(form.get("title") ?? "").trim()
    if (!title) {
      toast.error("Introduce un título")
      return
    }
    try {
      setSaving(true)
      await createAdminProjectTimelineEvent(projectId, {
        title,
        description: String(form.get("description") ?? "") || undefined,
      })
      event.currentTarget.reset()
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo registrar el evento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader>
        <CardTitle className="text-[#2F4F4F]">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="title" placeholder="Título del evento" className="border-[#E8E6E0]" required />
            <Textarea name="description" placeholder="Descripción" className="border-[#E8E6E0] md:col-span-1" />
          </div>
          <Button type="submit" className="bg-[#2F4F4F]" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registrar evento
          </Button>
        </form>

        <div className="space-y-3">
          {timeline.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Aún no hay eventos registrados.</p>
          ) : (
            timeline.map((event) => (
              <div key={event.id} className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">{formatDateTime(event.occurredAt)}</p>
                <p className="mt-1 font-medium text-[#2F4F4F]">{event.title}</p>
                {event.description ? <p className="mt-1 text-xs text-[#6B7280]">{event.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface SettingsSectionProps {
  detail: AdminProjectDetails
  onUpdated: () => Promise<void>
}

function SettingsSection({ detail, onUpdated }: SettingsSectionProps) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(detail.project.status)
  const [startDate, setStartDate] = useState(detail.project.startDate ?? "")
  const [estimatedDelivery, setEstimatedDelivery] = useState(detail.project.estimatedDelivery ?? "")
  const [locationCity, setLocationCity] = useState(detail.project.locationCity ?? "")
  const [locationNotes, setLocationNotes] = useState(detail.project.locationNotes ?? "")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      await updateAdminProject(detail.project.id, {
        status,
        startDate,
        estimatedDelivery,
        locationCity,
        locationNotes,
      })
      toast.success("Proyecto actualizado")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo actualizar el proyecto")
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveToggle = async () => {
    try {
      if (detail.project.status === "archivado") {
        await restoreAdminProject(detail.project.id)
        toast.success("Proyecto restaurado")
      } else {
        await archiveAdminProject(detail.project.id)
        toast.success("Proyecto archivado")
      }
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo cambiar el estado del proyecto")
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar permanentemente este proyecto?")) return
    try {
      await deleteAdminProject(detail.project.id)
      toast.success("Proyecto eliminado")
      window.history.back()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar el proyecto")
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader>
        <CardTitle className="text-[#2F4F4F]">Ajustes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Estado</Label>
              <select
                className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Inicio</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="border-[#E8E6E0]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Entrega estimada</Label>
              <Input
                type="date"
                value={estimatedDelivery}
                onChange={(event) => setEstimatedDelivery(event.target.value)}
                className="border-[#E8E6E0]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#2F4F4F]">Ciudad</Label>
              <Input value={locationCity} onChange={(event) => setLocationCity(event.target.value)} className="border-[#E8E6E0]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-[#2F4F4F]">Notas</Label>
            <Textarea value={locationNotes} onChange={(event) => setLocationNotes(event.target.value)} className="border-[#E8E6E0]" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="bg-[#2F4F4F]" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar ajustes
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#E8E6E0] pt-4">
          <Button variant="outline" className="border-[#E8E6E0]" onClick={handleArchiveToggle}>
            {detail.project.status === "archivado" ? "Restaurar" : "Archivar"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar proyecto
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
