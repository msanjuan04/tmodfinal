"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import { format, parseISO, isBefore, isValid } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  PenSquare,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Search as SearchIcon,
  Layers,
  Info,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

import type {
  AdminProjectTask,
  AdminProjectTaskActivity,
  AdminProjectTaskListResponse,
} from "@app/types/admin"
import type { ProjectTaskStatus } from "@/types/project-tasks"
import {
  addProjectTaskToCalendar,
  bulkUpdateAdminProjectTasks,
  createAdminProjectTask,
  deleteAdminProjectTask,
  fetchAdminProjectTaskActivity,
  fetchAdminProjectTasks,
  recalculateAdminProjectProgress,
  reorderAdminProjectTasks,
  updateAdminProjectTask,
} from "@app/lib/api/admin"

type ViewMode = "kanban" | "table"

const STATUS_COLUMNS: Array<{ id: ProjectTaskStatus; title: string; description: string }> = [
  { id: "todo", title: "Por hacer", description: "Tareas pendientes de iniciar" },
  { id: "in_progress", title: "En curso", description: "Trabajo activo en progreso" },
  { id: "blocked", title: "Bloqueada", description: "Requiere intervención" },
  { id: "review", title: "Revisión", description: "Pendiente de validación" },
  { id: "done", title: "Hecha", description: "Trabajo finalizado" },
]

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueada",
  review: "Revisión",
  done: "Hecha",
}

const STATUS_BADGES: Record<ProjectTaskStatus, string> = {
  todo: "bg-[#F8F7F4] text-[#4B5563]",
  in_progress: "bg-[#DBEAFE] text-[#1D4ED8]",
  blocked: "bg-[#FEE2E2] text-[#B91C1C]",
  review: "bg-[#FEF3C7] text-[#B45309]",
  done: "bg-[#DCFCE7] text-[#047857]",
}

const WEIGHT_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5]

interface ProjectTasksManagerProps {
  projectId: string
  projectName: string
  projectCode?: string | null
  projectStatus: string
  initialProgress: number
  doneCount: number
  totalCount: number
  teamMembers: Array<{ id: string; name: string; role: string; status: string }>
  onProgressChange: (value: number) => void
  onStatsChange?: (stats: AdminProjectTaskListResponse["stats"]) => void
  onCountersChange?: (counters: AdminProjectTaskListResponse["counters"]) => void
}

interface TaskFormState {
  title: string
  description: string
  status: ProjectTaskStatus
  weight: number
  assigneeId: string | ""
  startDate: string
  dueDate: string
}

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  status: "todo",
  weight: 1,
  assigneeId: "",
  startDate: "",
  dueDate: "",
}

export function ProjectTasksManager({
  projectId,
  projectName,
  projectCode,
  projectStatus,
  initialProgress,
  doneCount,
  totalCount,
  teamMembers,
  onProgressChange,
  onStatsChange,
  onCountersChange,
}: ProjectTasksManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectTaskStatus[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string>("")
  const [dueFrom, setDueFrom] = useState<string>("")
  const [dueTo, setDueTo] = useState<string>("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<AdminProjectTask[]>([])
  const [stats, setStats] = useState<AdminProjectTaskListResponse["stats"]>({
    total: totalCount,
    done: doneCount,
    dueToday: 0,
    dueThisWeek: 0,
  })
  const [counters, setCounters] = useState<AdminProjectTaskListResponse["counters"]>({
    completedWeight: 0,
    totalWeight: 0,
  })
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([])
  const [pagination, setPagination] = useState<AdminProjectTaskListResponse["pagination"]>({
    page: 1,
    pageSize,
    total: 0,
  })
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<AdminProjectTask | null>(null)
  const [activityTask, setActivityTask] = useState<AdminProjectTask | null>(null)
  const [activityHistory, setActivityHistory] = useState<AdminProjectTaskActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [progress, setProgress] = useState(initialProgress)
  const tasksRef = useRef<AdminProjectTask[]>([])

  const combinedAssignees = useMemo(() => {
    const map = new Map<string, string>()
    teamMembers.forEach((member) => map.set(member.id, member.name))
    assignees.forEach((member) => {
      if (!map.has(member.id)) map.set(member.id, member.name)
    })
    tasks.forEach((task) => {
      if (task.assigneeId && task.assigneeName) {
        map.set(task.assigneeId, task.assigneeName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [assignees, teamMembers, tasks])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const fetchTasks = useCallback(async () => {
    const showInitialLoading = tasksRef.current.length === 0
    if (showInitialLoading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)
    try {
      const response = await fetchAdminProjectTasks(projectId, {
        search: search.trim() || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        assigneeId: assigneeFilter || undefined,
        dueDateFrom: dueFrom || undefined,
        dueDateTo: dueTo || undefined,
        page,
        pageSize,
      })
      setTasks(response.tasks)
      setStats(response.stats)
      onStatsChange?.(response.stats)
      setCounters(response.counters)
      onCountersChange?.(response.counters)
      setPagination(response.pagination)
      setAssignees(response.assignees)
      const pct =
        response.counters.totalWeight > 0
          ? Math.min((response.counters.completedWeight / response.counters.totalWeight) * 100, 100)
          : 0
      setProgress(pct)
      onProgressChange(pct)
      setSelection(new Set())
    } catch (err) {
      console.error(err)
      setError("No se pudieron obtener las tareas. Inténtalo mas tarde.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [
    projectId,
    search,
    statusFilter,
    assigneeFilter,
    dueFrom,
    dueTo,
    page,
    pageSize,
    onProgressChange,
  ])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, assigneeFilter, dueFrom, dueTo])

  const totalPages = useMemo(
    () => Math.max(Math.ceil(pagination.total / pagination.pageSize), 1),
    [pagination],
  )

  const columns = useMemo(() => {
    const grouped: Record<ProjectTaskStatus, AdminProjectTask[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      review: [],
      done: [],
    }
    tasks.forEach((task) => {
      grouped[(task.status as ProjectTaskStatus) ?? "todo"].push(task)
    })
    Object.values(grouped).forEach((columnTasks) =>
      columnTasks.sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)),
    )
    return grouped
  }, [tasks])

  const usesFallbackTasks = useMemo(() => tasks.some((task) => task.id.startsWith("phase-")), [tasks])

  const completedLabel = `${stats.done}/${stats.total}`
  const dueSummaryLabel =
    stats.dueToday > 0 || stats.dueThisWeek > 0
      ? `${stats.dueToday} vencen hoy · ${stats.dueThisWeek} esta semana`
      : "Sin vencimientos cercanos"

  const handleCreateTask = async (form: TaskFormState) => {
    setIsSaving(true)
    try {
      await createAdminProjectTask(projectId, {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        weight: form.weight,
        assigneeId: form.assigneeId || null,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
      })
      toast.success("Tarea creada correctamente")
      setTaskFormOpen(false)
      setEditingTask(null)
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo crear la tarea")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateTask = async (taskId: string, patch: Partial<AdminProjectTask>) => {
    const previous = tasks
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)))
    try {
      await updateAdminProjectTask(projectId, taskId, {
        title: patch.title,
        description: patch.description ?? undefined,
        status: patch.status as ProjectTaskStatus | undefined,
        weight: patch.weight ?? undefined,
        assigneeId: patch.assigneeId ?? undefined,
        startDate: patch.startDate ?? undefined,
        dueDate: patch.dueDate ?? undefined,
      })
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron guardar los cambios")
      setTasks(previous)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("¿Deseas eliminar esta tarea?")) return
    const previous = tasks
    setTasks((current) => current.filter((task) => task.id !== taskId))
    try {
      await deleteAdminProjectTask(projectId, taskId)
      toast.success("Tarea eliminada")
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo eliminar la tarea")
      setTasks(previous)
    }
  }

  const handleDuplicateTask = async (task: AdminProjectTask) => {
    try {
      await createAdminProjectTask(projectId, {
        title: `${task.title} (copia)`,
        description: task.description ?? undefined,
        status: task.status as ProjectTaskStatus,
        weight: task.weight,
        assigneeId: task.assigneeId,
        startDate: task.startDate,
        dueDate: task.dueDate,
      })
      toast.success("Tarea duplicada")
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo duplicar la tarea")
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (usesFallbackTasks) {
      toast.warning("Primero migra la tabla project_tasks en Supabase para poder reordenar tareas.")
      return
    }
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceStatus = source.droppableId as ProjectTaskStatus
    const destStatus = destination.droppableId as ProjectTaskStatus

    const statuses: ProjectTaskStatus[] = ["todo", "in_progress", "blocked", "review", "done"]
    const lists: Record<ProjectTaskStatus, AdminProjectTask[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      review: [],
      done: [],
    }

    tasks.forEach((task) => {
      const key = (task.status as ProjectTaskStatus) ?? "todo"
      lists[key]?.push({ ...task })
    })

    const sourceList = lists[sourceStatus]
    const destList = lists[destStatus]
    const sourceIndex = sourceList.findIndex((task) => task.id === draggableId)
    if (sourceIndex === -1) return

    const [moved] = sourceList.splice(sourceIndex, 1)
    const updatedTask = { ...moved, status: destStatus }
    destList.splice(destination.index, 0, updatedTask)

    const normalize = (list: AdminProjectTask[], status: ProjectTaskStatus) => {
      const columnIndex = statuses.indexOf(status)
      const basePosition = columnIndex >= 0 ? columnIndex * 100000 : 0
      return list.map((task, index) => ({
        ...task,
        status,
        position: basePosition + (index + 1) * 1000,
      }))
    }

    statuses.forEach((status) => {
      lists[status] = normalize(lists[status], status)
    })

    const nextTasks = statuses.flatMap((status) => lists[status])
    const payload: Array<{ id: string; status: ProjectTaskStatus; position: number }> = nextTasks.map((task) => ({
      id: task.id,
      status: task.status as ProjectTaskStatus,
      position: task.position,
    }))

    setTasks(nextTasks)

    try {
      if (payload.length > 0) {
        await reorderAdminProjectTasks(projectId, payload)
      }
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo reordenar la tarea")
      await fetchTasks()
    }
  }

  const handleBulkUpdate = async (action: { status?: ProjectTaskStatus; assigneeId?: string | null }) => {
    const ids = Array.from(selection)
    if (ids.length === 0) return
    try {
      await bulkUpdateAdminProjectTasks(projectId, {
        ids,
        status: action.status,
        assigneeId: action.assigneeId,
      })
      toast.success("Cambios aplicados")
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudieron aplicar los cambios")
    }
  }

  const handleMarkAsDone = async (taskId: string) => {
    await handleUpdateTask(taskId, { status: "done" })
    toast.success("Tarea marcada como hecha")
  }

  const handleAddToCalendar = async (task: AdminProjectTask) => {
    try {
      await addProjectTaskToCalendar(projectId, task.id)
      toast.success("Evento creado en el calendario")
    } catch (err) {
      console.error(err)
      toast.error("No se pudo crear el evento")
    }
  }

  const handleRecalculate = async () => {
    try {
      const pct = await recalculateAdminProjectProgress(projectId)
      setProgress(pct)
      onProgressChange(pct)
      toast.success("Progreso recalculado")
      await fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo recalcular el progreso")
    }
  }

  const openActivity = async (task: AdminProjectTask) => {
    setActivityTask(task)
    setActivityLoading(true)
    try {
      const history = await fetchAdminProjectTaskActivity(projectId, task.id)
      setActivityHistory(history)
    } catch (err) {
      console.error(err)
      toast.error("No se pudo cargar el historial")
      setActivityHistory([])
    } finally {
      setActivityLoading(false)
    }
  }

  const isOverdue = useCallback((task: AdminProjectTask) => {
    if (!task.dueDate || task.status === "done") return false
    const due = parseISO(task.dueDate)
    return isValid(due) && isBefore(due, new Date())
  }, [])

  return (
    <>
      <Card className="border-[#E8E6E0] bg-white/90">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-2xl text-[#2F4F4F]">Gestión de tareas</CardTitle>
            <p className="text-sm text-[#6B7280]">
              {projectName}
              {projectCode ? ` · ${projectCode}` : ""} · Estado actual: {projectStatus}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleRecalculate} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Recalcular progreso
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = "/dashboard/calendar"
              }}
            >
              <CalendarDays className="h-4 w-4" />
              Ver en calendario
            </Button>
            <Sheet
              open={taskFormOpen}
              onOpenChange={(open) => {
                setTaskFormOpen(open)
                if (!open) setEditingTask(null)
              }}
            >
              <SheetTrigger asChild>
                <Button className="gap-2 bg-[#2F4F4F] text-white hover:bg-[#1F3535]">
                  <Plus className="h-4 w-4" />
                  Nueva tarea
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full gap-0 bg-[#F8F7F4]/95 p-0 sm:max-w-xl">
                <SheetHeader className="gap-2 border-b border-[#E8E6E0] bg-white/95 px-6 py-5">
                  <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
                    {editingTask ? "Editar tarea" : "Crear nueva tarea"}
                  </SheetTitle>
                  <p className="text-sm text-[#6B7280]">
                    Define los detalles, asigna responsables y sincroniza con el calendario.
                  </p>
                </SheetHeader>
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <TaskForm
                      saving={isSaving}
                      initialValues={
                        editingTask
                          ? {
                              title: editingTask.title,
                              description: editingTask.description ?? "",
                              status: editingTask.status as ProjectTaskStatus,
                              weight: editingTask.weight,
                              assigneeId: editingTask.assigneeId ?? "",
                              startDate: editingTask.startDate ?? "",
                              dueDate: editingTask.dueDate ?? "",
                            }
                          : DEFAULT_FORM
                      }
                      teamMembers={combinedAssignees}
                      onSubmit={async (values) => {
                        if (editingTask) {
                          await handleUpdateTask(editingTask.id, {
                            title: values.title,
                            description: values.description,
                            status: values.status,
                            weight: values.weight,
                            assigneeId: values.assigneeId || null,
                            startDate: values.startDate || null,
                            dueDate: values.dueDate || null,
                          })
                          setTaskFormOpen(false)
                          setEditingTask(null)
                        } else {
                          await handleCreateTask(values)
                        }
                      }}
                      onCancel={() => {
                        setTaskFormOpen(false)
                        setEditingTask(null)
                      }}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ProgressCard
            label="Progreso"
            value={progress}
            description="Se actualiza automáticamente con cada cambio."
          />
          <SummaryCard label="Hechas / Totales" value={completedLabel} icon={ClipboardList} />
          <SummaryCard label="Vencimientos" value={dueSummaryLabel} icon={AlertTriangle} />
          <SummaryCard
            label="Peso completado"
            value={`${counters.completedWeight.toFixed(2)} / ${counters.totalWeight.toFixed(2)}`}
            icon={Layers}
          />
        </CardContent>
      </Card>

      <FiltersBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        assignees={combinedAssignees}
        dueFrom={dueFrom}
        dueTo={dueTo}
        onDueFromChange={setDueFrom}
        onDueToChange={setDueTo}
        selectionCount={selection.size}
        onClearSelection={() => setSelection(new Set())}
        onBulkStatus={(status) => handleBulkUpdate({ status })}
        onBulkAssignee={(assigneeId) => handleBulkUpdate({ assigneeId })}
      />

      {usesFallbackTasks ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
          <Info className="mt-0.5 h-4 w-4 text-[#D97706]" />
          <div>
            El tablero está usando tareas de respaldo generadas desde las fases del proyecto. Ejecuta las migraciones del
            archivo <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs text-[#92400E]">supabase/schema.sql</code>{" "}
            (sección <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs text-[#92400E]">project_tasks</code>) en Supabase para
            habilitar el guardado real del drag & drop. Mientras tanto el reordenamiento está desactivado para evitar errores.
          </div>
        </div>
      ) : null}

      {error ? (
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-[#B91C1C]">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="border-[#E8E6E0] bg-white/90">
          <CardContent className="flex items-center justify-center gap-3 py-16 text-sm text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando tareas...
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          columns={STATUS_COLUMNS}
          groupedTasks={columns}
          onDragEnd={handleDragEnd}
          onEdit={(task) => {
            setEditingTask(task)
            setTaskFormOpen(true)
          }}
          onDuplicate={handleDuplicateTask}
          onDelete={handleDeleteTask}
          onMarkDone={handleMarkAsDone}
          onAddToCalendar={handleAddToCalendar}
          onActivity={openActivity}
          isOverdue={isOverdue}
          refreshing={refreshing}
          reorderDisabled={usesFallbackTasks}
        />
      ) : (
        <TaskTable
          tasks={tasks}
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onEdit={(task) => {
            setEditingTask(task)
            setTaskFormOpen(true)
          }}
          onInlineUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
          onMarkDone={handleMarkAsDone}
          onAddToCalendar={handleAddToCalendar}
          selection={selection}
          onSelectionChange={setSelection}
          assignees={combinedAssignees}
          isOverdue={isOverdue}
          refreshing={refreshing}
        />
      )}

      <Sheet
        open={Boolean(activityTask)}
        onOpenChange={(open) => {
          if (!open) {
            setActivityTask(null)
            setActivityHistory([])
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl text-[#2F4F4F]">
              {activityTask ? activityTask.title : "Historial de tareas"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {activityLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando historial...
              </div>
            ) : activityHistory.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Aún no hay actividad registrada para esta tarea.</p>
            ) : (
              activityHistory.map((entry) => (
                <div key={entry.id} className="border-l-2 border-[#E8E6E0] pl-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
                    {format(parseISO(entry.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#2F4F4F]">{entry.message ?? entry.eventType}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function ProgressCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} className="mt-2 h-3 bg-[#E8E6E0]" />
      <p className="mt-2 text-xs text-[#6B7280]">{description}</p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof ClipboardList
}) {
  return (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#2F4F4F]">{value}</p>
    </div>
  )
}

interface FiltersBarProps {
  viewMode: ViewMode
  onViewChange: (view: ViewMode) => void
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ProjectTaskStatus[]
  onStatusFilterChange: (values: ProjectTaskStatus[]) => void
  assigneeFilter: string
  onAssigneeFilterChange: (value: string) => void
  assignees: Array<{ id: string; name: string }>
  dueFrom: string
  dueTo: string
  onDueFromChange: (value: string) => void
  onDueToChange: (value: string) => void
  selectionCount: number
  onClearSelection: () => void
  onBulkStatus: (status: ProjectTaskStatus) => void
  onBulkAssignee: (assigneeId: string | null) => void
}

function FiltersBar({
  viewMode,
  onViewChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  assignees,
  dueFrom,
  dueTo,
  onDueFromChange,
  onDueToChange,
  selectionCount,
  onClearSelection,
  onBulkStatus,
  onBulkAssignee,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.25rem] border border-[#E8E6E0] bg-white/90 p-4 shadow-apple-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              placeholder="Buscar tareas..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-64 border-[#E8E6E0] pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtrar estado
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_COLUMNS.map((column) => {
                const active = statusFilter.includes(column.id)
                return (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={() =>
                      onStatusFilterChange(
                        active
                          ? statusFilter.filter((value) => value !== column.id)
                          : [...statusFilter, column.id],
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="h-3.5 w-3.5 rounded border-[#E8E6E0]"
                    />
                    <span>{column.title}</span>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onStatusFilterChange([])}>Borrar filtros</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Responsable
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={() => onAssigneeFilterChange("")}>Todos</DropdownMenuItem>
              <DropdownMenuSeparator />
              {assignees.map((member) => (
                <DropdownMenuItem key={member.id} onSelect={() => onAssigneeFilterChange(member.id)}>
                  {member.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <small className="text-xs text-[#6B7280]">Vencimiento</small>
            <Input type="date" value={dueFrom} onChange={(event) => onDueFromChange(event.target.value)} className="w-36" />
            <Input type="date" value={dueTo} onChange={(event) => onDueToChange(event.target.value)} className="w-36" />
          </div>
          <div className="inline-flex rounded-full border border-[#E8E6E0] bg-[#F8F7F4] p-1">
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                viewMode === "kanban" ? "bg-white text-[#2F4F4F]" : "text-[#6B7280]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => onViewChange("table")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                viewMode === "table" ? "bg-white text-[#2F4F4F]" : "text-[#6B7280]"
              }`}
            >
              <List className="h-4 w-4" />
              Tabla
            </button>
          </div>
        </div>
      </div>

      {selectionCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[0.9rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3 text-xs text-[#4B5563]">
          <span>
            {selectionCount} seleccionada{selectionCount > 1 ? "s" : ""}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Cambiar estado
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STATUS_COLUMNS.map((column) => (
                <DropdownMenuItem key={column.id} onSelect={() => onBulkStatus(column.id)}>
                  {column.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Asignar responsable
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => onBulkAssignee(null)}>Sin responsable</DropdownMenuItem>
              <DropdownMenuSeparator />
              {assignees.map((member) => (
                <DropdownMenuItem key={member.id} onSelect={() => onBulkAssignee(member.id)}>
                  {member.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="text-[#B91C1C] hover:bg-[#FEE2E2]" onClick={onClearSelection}>
            Limpiar selección
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function KanbanBoard({
  columns,
  groupedTasks,
  onDragEnd,
  onEdit,
  onDuplicate,
  onDelete,
  onMarkDone,
  onAddToCalendar,
  onActivity,
  isOverdue,
  refreshing = false,
  reorderDisabled = false,
}: {
  columns: Array<{ id: ProjectTaskStatus; title: string; description: string }>
  groupedTasks: Record<ProjectTaskStatus, AdminProjectTask[]>
  onDragEnd: (result: DropResult) => void
  onEdit: (task: AdminProjectTask) => void
  onDuplicate: (task: AdminProjectTask) => void
  onDelete: (taskId: string) => void
  onMarkDone: (taskId: string) => void
  onAddToCalendar: (task: AdminProjectTask) => void
  onActivity: (task: AdminProjectTask) => void
  isOverdue: (task: AdminProjectTask) => boolean
  refreshing?: boolean
  reorderDisabled?: boolean
}) {
  return (
    <Card className="border-[#E8E6E0] bg-white/90">
      <CardContent className="relative overflow-x-auto py-6">
        {reorderDisabled ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
            <Info className="mt-0.5 h-3.5 w-3.5 text-[#D97706]" />
            Arrastra deshabilitado: crea la tabla{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[10px] text-[#92400E]">project_tasks</code> en Supabase para mover tareas
            entre columnas.
          </div>
        ) : null}
        {refreshing ? (
          <div className="pointer-events-none absolute right-6 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-[#4B5563] shadow-apple">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Actualizando...
          </div>
        ) : null}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid min-w-[960px] gap-4 lg:grid-cols-5">
            {columns.map((column) => (
              <Droppable droppableId={column.id} key={column.id} isDropDisabled={reorderDisabled}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex min-h-[320px] flex-col gap-3 rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4"
                  >
                    <div>
                      <p className="font-heading text-sm font-semibold text-[#2F4F4F]">
                        {column.title} ({groupedTasks[column.id].length})
                      </p>
                      <p className="text-xs text-[#6B7280]">{column.description}</p>
                    </div>
                    {groupedTasks[column.id].map((task, index) => (
                      <Draggable draggableId={task.id} index={index} key={task.id} isDragDisabled={reorderDisabled}>
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-[1rem] border border-[#E8E6E0] bg-white p-4 shadow-apple transition ${
                              snapshot.isDragging ? "ring-2 ring-[#2F4F4F]" : ""
                            } ${isOverdue(task) ? "border-[#F87171]" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-heading text-sm font-semibold text-[#2F4F4F]">{task.title}</h3>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                                  <Badge className={STATUS_BADGES[task.status as ProjectTaskStatus]}>
                                    {STATUS_LABELS[task.status as ProjectTaskStatus]}
                                  </Badge>
                                  <Badge variant="outline" className="border-[#E8E6E0] text-[#4B5563]">
                                    Peso {task.weight.toFixed(2)}
                                  </Badge>
                                  {task.assigneeName ? (
                                    <span className="rounded-full bg-[#E8E6E0] px-2 py-0.5 text-xs text-[#4B5563]">
                                      {task.assigneeName}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="rounded-full p-1 text-[#6B7280] transition hover:bg-[#F3F4F6]">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => onEdit(task)}>
                                    <PenSquare className="mr-2 h-3.5 w-3.5" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => onDuplicate(task)}>
                                    <ClipboardList className="mr-2 h-3.5 w-3.5" />
                                    Duplicar
                                  </DropdownMenuItem>
                                  {task.status !== "done" ? (
                                    <DropdownMenuItem onSelect={() => onMarkDone(task.id)}>
                                      <Check className="mr-2 h-3.5 w-3.5" />
                                      Marcar como hecha
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuItem onSelect={() => onAddToCalendar(task)}>
                                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                                    Añadir al calendario
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => onActivity(task)}>
                                    <ClipboardList className="mr-2 h-3.5 w-3.5" />
                                    Ver historial
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => onDelete(task.id)}
                                    className="text-[#B91C1C] focus:text-[#B91C1C]"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="mt-3 text-xs text-[#6B7280]">
                              {task.dueDate ? (
                                <p className={isOverdue(task) ? "font-semibold text-[#B91C1C]" : ""}>
                                  Vence {format(parseISO(task.dueDate), "d MMM yyyy", { locale: es })}
                                </p>
                              ) : (
                                <p>Sin fecha límite</p>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  )
}

interface TaskTableProps {
  tasks: AdminProjectTask[]
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onEdit: (task: AdminProjectTask) => void
  onInlineUpdate: (taskId: string, patch: Partial<AdminProjectTask>) => Promise<void>
  onDelete: (taskId: string) => void
  onDuplicate: (task: AdminProjectTask) => void
  onMarkDone: (taskId: string) => void
  onAddToCalendar: (task: AdminProjectTask) => void
  selection: Set<string>
  onSelectionChange: (value: Set<string>) => void
  assignees: Array<{ id: string; name: string }>
  isOverdue: (task: AdminProjectTask) => boolean
  refreshing?: boolean
}

function TaskTable({
  tasks,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onInlineUpdate,
  onDelete,
  onDuplicate,
  onMarkDone,
  onAddToCalendar,
  selection,
  onSelectionChange,
  assignees,
  isOverdue,
  refreshing = false,
}: TaskTableProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const toggleSelection = (taskId: string, checked: boolean) => {
    const next = new Set(selection)
    if (checked) {
      next.add(taskId)
    } else {
      next.delete(taskId)
    }
    onSelectionChange(next)
  }

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      onSelectionChange(new Set())
      return
    }
    onSelectionChange(new Set(tasks.map((task) => task.id)))
  }

  return (
    <Card className="border-[#E8E6E0] bg-white/90">
      <CardContent className="relative overflow-x-auto py-4">
        {refreshing ? (
          <div className="pointer-events-none absolute right-6 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-[#4B5563] shadow-apple">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Actualizando...
          </div>
        ) : null}
        <table className="min-w-full divide-y divide-[#E5E7EB] text-sm text-[#4B5563]">
          <thead className="bg-[#F8F7F4] text-xs uppercase tracking-[0.25em] text-[#C6B89E]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selection.size > 0 && selection.size === tasks.length}
                  onChange={(event) => toggleSelectAll(event.target.checked)}
                  className="h-4 w-4 rounded border-[#E8E6E0]"
                />
              </th>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Peso</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Responsable</th>
              <th className="px-3 py-2 text-left">Fecha límite</th>
              <th className="px-3 py-2 text-left">Última actualización</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] bg-white">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                  Crea tu primera tarea para comenzar a gestionar el proyecto.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className={isOverdue(task) ? "bg-[#FEF2F2]/60" : ""}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selection.has(task.id)}
                      onChange={(event) => toggleSelection(task.id, event.target.checked)}
                      className="h-4 w-4 rounded border-[#E8E6E0]"
                    />
                  </td>
                  <td className="max-w-[240px] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="text-left font-medium text-[#2F4F4F] hover:underline"
                    >
                      {task.title}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <EditableNumber
                      value={task.weight}
                      onSubmit={async (value) => {
                        await onInlineUpdate(task.id, { weight: value })
                        toast.success("Peso actualizado")
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={task.status}
                      onChange={async (event) => {
                        const status = event.target.value as ProjectTaskStatus
                        await onInlineUpdate(task.id, { status })
                        toast.success("Estado actualizado")
                      }}
                      className="w-full rounded-md border border-[#E8E6E0] bg-white px-2 py-1 text-xs text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                    >
                      {STATUS_COLUMNS.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={task.assigneeId ?? ""}
                      onChange={async (event) => {
                        const assigneeId = event.target.value || null
                        await onInlineUpdate(task.id, { assigneeId })
                        toast.success("Responsable actualizado")
                      }}
                      className="w-full rounded-md border border-[#E8E6E0] bg-white px-2 py-1 text-xs text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                    >
                      <option value="">Sin responsable</option>
                      {assignees.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <EditableDate
                      value={task.dueDate}
                      onSubmit={async (value) => {
                        await onInlineUpdate(task.id, { dueDate: value })
                        toast.success("Fecha límite actualizada")
                      }}
                      highlight={isOverdue(task)}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs text-[#6B7280]">
                    {format(parseISO(task.updatedAt), "d MMM yyyy · HH:mm", { locale: es })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <TaskActionsMenu
                      task={task}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                      onMarkDone={onMarkDone}
                      onAddToCalendar={onAddToCalendar}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-[#6B7280]">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page === 1}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TaskActionsMenu({
  task,
  onEdit,
  onDuplicate,
  onDelete,
  onMarkDone,
  onAddToCalendar,
}: {
  task: AdminProjectTask
  onEdit: (task: AdminProjectTask) => void
  onDuplicate: (task: AdminProjectTask) => void
  onDelete: (taskId: string) => void
  onMarkDone: (taskId: string) => void
  onAddToCalendar: (task: AdminProjectTask) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full p-1 text-[#6B7280] transition hover:bg-[#F3F4F6]">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onEdit(task)}>
          <PenSquare className="mr-2 h-3.5 w-3.5" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(task)}>
          <ClipboardList className="mr-2 h-3.5 w-3.5" />
          Duplicar
        </DropdownMenuItem>
        {task.status !== "done" ? (
          <DropdownMenuItem onSelect={() => onMarkDone(task.id)}>
            <Check className="mr-2 h-3.5 w-3.5" />
            Marcar como hecha
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => onAddToCalendar(task)}>
          <CalendarDays className="mr-2 h-3.5 w-3.5" />
          Añadir al calendario
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[#B91C1C] focus:text-[#B91C1C]" onSelect={() => onDelete(task.id)}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TaskFormProps {
  initialValues: TaskFormState
  onSubmit: (values: TaskFormState) => Promise<void>
  onCancel: () => void
  saving: boolean
  teamMembers: Array<{ id: string; name: string }>
}

function TaskForm({ initialValues, onSubmit, onCancel, saving, teamMembers }: TaskFormProps) {
  const [formState, setFormState] = useState<TaskFormState>(initialValues)

  useEffect(() => {
    setFormState(initialValues)
  }, [initialValues])

  const handleChange = (field: keyof TaskFormState, value: string | number) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.title.trim()) {
      toast.error("Introduce un título")
      return
    }
    if (formState.weight < 0.25) {
      toast.error("El peso mínimo es 0.25")
      return
    }
    await onSubmit(formState)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-16">
      <section className="space-y-5 rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Detalles</p>
          <h3 className="font-heading text-lg text-[#2F4F4F]">Información principal</h3>
          <p className="text-sm text-[#6B7280]">Describe la tarea para que el equipo la identifique rápido.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Título</label>
            <Input
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="Instalación de pérgola"
              required
              className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Descripción</label>
            <Textarea
              value={formState.description}
              onChange={(event) => handleChange("description", event.target.value)}
              rows={4}
              placeholder="Añade contexto, dependencias o materiales clave."
              className="min-h-[140px] rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Planificación</p>
          <h3 className="font-heading text-lg text-[#2F4F4F]">Seguimiento y asignación</h3>
          <p className="text-sm text-[#6B7280]">
            Ajusta el estado, los pesos y quién se encarga para mantener el tablero sincronizado.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Estado</label>
            <select
              value={formState.status}
              onChange={(event) => handleChange("status", event.target.value as ProjectTaskStatus)}
              className="h-12 w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            >
              {STATUS_COLUMNS.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Peso</label>
            <select
              value={formState.weight}
              onChange={(event) => handleChange("weight", Number(event.target.value))}
              className="h-12 w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            >
              {WEIGHT_OPTIONS.map((weight) => (
                <option key={weight} value={weight}>
                  {weight.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Inicio</label>
            <Input
              type="date"
              value={formState.startDate}
              onChange={(event) => handleChange("startDate", event.target.value)}
              className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#2F4F4F]">Fecha límite</label>
            <Input
              type="date"
              value={formState.dueDate}
              onChange={(event) => handleChange("dueDate", event.target.value)}
              className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2F4F4F]">Responsable</label>
              <select
                value={formState.assigneeId}
                onChange={(event) => handleChange("assigneeId", event.target.value)}
                className="h-12 w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
              >
                <option value="">Sin responsable</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-5 shadow-apple-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#6B7280]">
            Al guardar se actualizarán el tablero, el calendario y los indicadores del proyecto.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-11 rounded-full border-[#E8E6E0] bg-white px-5 text-sm font-medium text-[#4B5563] shadow-apple transition hover:bg-[#F8F7F4]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-full bg-[#2F4F4F] px-6 text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535]"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function EditableNumber({ value, onSubmit }: { value: number; onSubmit: (value: number) => Promise<void> }) {
  const [local, setLocal] = useState(value.toFixed(2))
  useEffect(() => {
    setLocal(value.toFixed(2))
  }, [value])

  const commit = async () => {
    const parsed = Number(local)
    if (Number.isNaN(parsed) || parsed < 0.25) {
      setLocal(value.toFixed(2))
      toast.error("El peso debe ser un número válido (mínimo 0.25)")
      return
    }
    if (Math.abs(parsed - value) < 0.001) return
    const normalized = Math.round(parsed * 4) / 4
    await onSubmit(normalized)
  }

  return (
    <input
      type="number"
      min={0.25}
      step={0.25}
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur()
        }
      }}
      className="w-20 rounded-md border border-[#E8E6E0] px-2 py-1 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
    />
  )
}

function EditableDate({
  value,
  onSubmit,
  highlight,
}: {
  value: string | null
  onSubmit: (value: string | null) => Promise<void>
  highlight?: boolean
}) {
  const [local, setLocal] = useState(value ?? "")
  useEffect(() => {
    setLocal(value ?? "")
  }, [value])

  return (
    <input
      type="date"
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      onBlur={async () => {
        const normalized = local || null
        if (normalized === value) return
        await onSubmit(normalized)
      }}
      className={`rounded-md border px-2 py-1 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20 ${
        highlight ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#E8E6E0]"
      }`}
    />
  )
}
