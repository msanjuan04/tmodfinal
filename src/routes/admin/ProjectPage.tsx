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

export function AdminProjectPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AdminProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<AdminProjectTeamMember[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const projectRef = projectSlug?.trim()

  const loadDetail = useCallback(async () => {
    if (!projectRef) return
    setLoading(true)
    setError(null)
    try {
      const [projectDetail, teamDirectory] = await Promise.all([fetchAdminProjectDetails(projectRef), fetchAdminTeamMembers()])
      setDetail(projectDetail)
      setTeamMembers(teamDirectory)
    } catch (requestError) {
      console.error(requestError)
      setError("No se pudo cargar el proyecto")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [projectRef])

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

  const handleDelete = useCallback(async () => {
    if (!detail) return
    if (!window.confirm(`¿Eliminar permanentemente el proyecto "${detail.project.name}"?`)) return
    try {
      setDeleting(true)
      await deleteAdminProject(detail.project.id)
      toast.success("Proyecto eliminado")
      navigate("/dashboard/projects")
    } catch (requestError) {
      console.error(requestError)
      toast.error("No se pudo eliminar el proyecto")
    } finally {
      setDeleting(false)
    }
  }, [detail, navigate])

  if (!projectRef) {
    return (
      <div className="space-y-4">
        <Card className="border-[#FCA5A5]">
          <CardContent className="py-10 text-center text-[#B91C1C]">Proyecto no especificado.</CardContent>
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
    <div className="container mx-auto max-w-5xl pb-16">
      <h1 className="mb-4 text-3xl font-bold text-[#2F4F4F]">{detail.project.name}</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="rounded-xl border border-[#E8E6E0] bg-white shadow">
        <TabsList className="flex flex-wrap gap-2 border-b border-[#E8E6E0] p-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="gallery">Galería</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="edit">Editar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
                  <h2 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">{detail.project.name}</h2>
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
                <Badge className="rounded-full bg-[#2F4F4F] px-4 py-2 text-white">{statusLabel(detail.project.status)}</Badge>
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
                    <span className="font-semibold">
                      {detail.stats.milestonesCompleted}/{detail.stats.milestonesTotal}
                    </span>
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
              {detail.timeline.length === 0 ? <p className="text-sm text-[#6B7280]">No hay actividad registrada recientemente.</p> : null}
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

        <TabsContent value="gallery">
          <PhotosSection projectId={detail.project.id} photos={detail.photos} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsSection projectId={detail.project.id} documents={detail.documents} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineSection projectId={detail.project.id} timeline={detail.timeline} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="team">
          <TeamSection detail={detail} teamMembers={teamMembers} onUpdated={loadDetail} />
        </TabsContent>

        <TabsContent value="edit">
          <SettingsSection detail={detail} onUpdated={loadDetail} onDelete={handleDelete} deleting={deleting} />
        </TabsContent>
      </Tabs>
      <div className="flex justify-end pt-8">
        <Button
          variant="destructive"
          onClick={() => {
            void handleDelete()
          }}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Eliminar proyecto
        </Button>
      </div>
    </div>
  )
}

interface PhotosSectionProps {
  projectId: string
  photos: AdminProjectPhoto[]
  onUpdated: () => Promise<void>
}

function PhotosSection({ projectId, photos, onUpdated }: PhotosSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [reordering, setReordering] = useState(false)
  const items = useMemo(() => photos.sort((a, b) => a.sortOrder - b.sortOrder), [photos])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      await uploadAdminProjectPhoto(projectId, {
        file,
      })
      toast.success("Foto subida correctamente")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo subir la foto")
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm("¿Eliminar esta foto?")) return
    try {
      await deleteAdminProjectPhoto(projectId, photoId)
      toast.success("Foto eliminada")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar la foto")
    }
  }

  const handleReorder = async (result: DropResult) => {
    if (!result.destination) return
    const reordered = Array.from(items)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)

    try {
      setReordering(true)
      await reorderAdminProjectPhotos(
        projectId,
        reordered.map((item, index) => ({
          id: item.id,
          sortOrder: index,
        })),
      )
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo reordenar la galería")
    } finally {
      setReordering(false)
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-[#2F4F4F]">Galería del proyecto</CardTitle>
          <p className="text-sm text-[#6B7280]">Comparte hitos visuales con el cliente.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="border-[#E8E6E0] text-[#2F4F4F]" disabled={uploading}>
            <label className="flex cursor-pointer items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Añadir foto"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-12 text-center text-sm text-[#6B7280]">
            Aún no hay fotos en este proyecto.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleReorder}>
            <Droppable droppableId="photos" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid gap-4 md:grid-cols-3"
                >
                  {items.map((photo, index) => (
                    <Draggable draggableId={photo.id} index={index} key={photo.id}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="group overflow-hidden rounded-2xl border border-[#E8E6E0] bg-[#FDFCF9]"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            <img src={photo.url ?? "/placeholder.svg"} alt={photo.caption ?? "Foto del proyecto"} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-end gap-2 bg-black/0 p-3 opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
                              <Button size="icon" variant="outline" className="border-white/40 bg-white/20 text-white" onClick={() => handleDeletePhoto(photo.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-sm font-medium text-[#2F4F4F]">{photo.caption ?? `Foto ${index + 1}`}</p>
                            <p className="text-xs text-[#9CA3AF]">{photo.takenAt ? formatDate(photo.takenAt) : "Sin fecha"}</p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
        {reordering ? <p className="mt-3 text-xs text-[#6B7280]">Guardando nuevo orden…</p> : null}
      </CardContent>
    </Card>
  )
}

interface DocumentsSectionProps {
  projectId: string
  documents: AdminProjectDocument[]
  onUpdated: () => Promise<void>
}

function DocumentsSection({ projectId, documents, onUpdated }: DocumentsSectionProps) {
  const [uploading, setUploading] = useState(false)

  const groupedDocuments = useMemo(() => {
    const map = new Map<string, AdminProjectDocument[]>()
    documents.forEach((doc) => {
      const key = doc.category ?? "General"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
    })
    return Array.from(map.entries())
  }, [documents])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      await uploadAdminProjectDocument(projectId, {
        file,
        category: "General",
        notifyClient: false,
      })
      toast.success("Documento subido")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo subir el documento")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("¿Eliminar este documento?")) return
    try {
      await deleteAdminProjectDocument(projectId, documentId)
      toast.success("Documento eliminado")
      await onUpdated()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar el documento")
    }
  }

  return (
    <Card className="border-[#E8E6E0]">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-[#2F4F4F]">Documentos del proyecto</CardTitle>
          <p className="text-sm text-[#6B7280]">Planos, licencias y documentación clave para el cliente.</p>
        </div>
        <Button variant="outline" asChild className="border-[#E8E6E0] text-[#2F4F4F]" disabled={uploading}>
          <label className="flex cursor-pointer items-center gap-2">
            <FileText className="h-4 w-4" />
            {uploading ? "Subiendo…" : "Añadir documento"}
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedDocuments.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-12 text-center text-sm text-[#6B7280]">
            Aún no hay documentos registrados.
          </div>
        ) : (
          groupedDocuments.map(([category, docs]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">{category}</h3>
                <span className="text-xs text-[#9CA3AF]">{docs.length} documento(s)</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-[#E8E6E0] bg-[#FDFCF9] p-4 text-sm text-[#4B5563]">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#2F4F4F]">{doc.name}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {doc.fileType} · {doc.sizeLabel ?? "Tamaño desconocido"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#2F4F4F] text-white">{doc.status}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="h-4 w-4 text-[#B91C1C]" />
                        </Button>
                      </div>
                    </div>
                    {doc.notes ? <p className="mt-3 text-xs text-[#6B7280]">{doc.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ))
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
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const description = String(formData.get("description") ?? "").trim()
    try {
      setSaving(true)
      await createAdminProjectTimelineEvent(projectId, {
        title,
        description: description.length > 0 ? description : undefined,
      })
      event.currentTarget.reset()
      toast.success("Evento registrado")
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
              <div key={role} className="space-y-2">
                <Label className="text-sm text-[#2F4F4F]">{ROLE_LABELS[role] ?? role}</Label>
                <select
                  className="w-full rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                  value={assignments[role] ?? ""}
                  onChange={(event) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [role]: event.target.value,
                    }))
                  }
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

interface SettingsSectionProps {
  detail: AdminProjectDetails
  onUpdated: () => Promise<void>
  onDelete: () => Promise<void>
  deleting: boolean
}

function SettingsSection({ detail, onUpdated, onDelete, deleting }: SettingsSectionProps) {
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
              <Input type="date" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} className="border-[#E8E6E0]" />
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
          <Button
            variant="destructive"
            onClick={() => {
              void onDelete()
            }}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Eliminar proyecto
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
