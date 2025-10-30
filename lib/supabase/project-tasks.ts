import { addDays, isToday, isWithinInterval, startOfDay } from "date-fns"
import { z } from "zod"

import { PROJECT_TASK_STATUSES, type ProjectTaskStatus } from "../../types/project-tasks"
import { createProjectEvent } from "./project-events"
import { createServerSupabaseClient } from "./server"

export const TASK_STATUSES = PROJECT_TASK_STATUSES

type ProjectTaskRow = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  weight: number | null
  assignee_id: string | null
  start_date: string | null
  due_date: string | null
  position: number | null
  created_at: string
  updated_at: string
  team_members?:
    | {
        full_name: string | null
      }
    | Array<{
        full_name: string | null
      }>
    | null
}

type ProjectTaskCounterRow = {
  id: string
  status: string
  weight: number | null
  due_date: string | null
  assignee_id: string | null
}

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  description: string | null
  status: ProjectTaskStatus
  weight: number
  assigneeId: string | null
  assigneeName: string | null
  startDate: string | null
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface ProjectTaskActivity {
  id: string
  taskId: string
  actorId: string | null
  eventType: string
  message: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ListProjectTasksFilters {
  search?: string
  status?: string[]
  assigneeId?: string
  startDateFrom?: string
  startDateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
  page?: number
  pageSize?: number
}

export interface ListProjectTasksResult {
  tasks: ProjectTask[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  stats: {
    total: number
    done: number
    dueToday: number
    dueThisWeek: number
  }
  counters: {
    completedWeight: number
    totalWeight: number
  }
  assignees: Array<{ id: string; name: string }>
}

const taskWriteSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).default("todo"),
  weight: z.number().min(0.25),
  assigneeId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  position: z.number().optional(),
})

const taskUpdateSchema = taskWriteSchema.partial().extend({
  title: z.string().min(1).max(200).optional(),
})

export async function listProjectTasks(projectId: string, filters: ListProjectTasksFilters = {}): Promise<ListProjectTasksResult> {
  const supabase = createServerSupabaseClient()

  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let baseQuery: any = supabase
    .from("project_tasks")
    .select(
      [
        "id",
        "project_id",
        "title",
        "description",
        "status",
        "weight",
        "assignee_id",
        "start_date",
        "due_date",
        "position",
        "created_at",
        "updated_at",
        "team_members!project_tasks_assignee_id_fkey(full_name)",
      ].join(","),
      { count: "exact" },
    )
    .eq("project_id", projectId)

  let countersQuery: any = supabase
    .from("project_tasks")
    .select("id, status, weight, due_date, assignee_id")
    .eq("project_id", projectId)

  const applyFilters = (query: any) => {
    let q = query

    if (filters.status && filters.status.length > 0) {
      q = q.in("status", filters.status)
    }
    if (filters.assigneeId) {
      q = q.eq("assignee_id", filters.assigneeId)
    }
    if (filters.search && filters.search.trim().length > 0) {
      q = q.ilike("title", `%${filters.search.trim()}%`)
    }
    if (filters.startDateFrom) {
      q = q.gte("start_date", filters.startDateFrom)
    }
    if (filters.startDateTo) {
      q = q.lte("start_date", filters.startDateTo)
    }
    if (filters.dueDateFrom) {
      q = q.gte("due_date", filters.dueDateFrom)
    }
    if (filters.dueDateTo) {
      q = q.lte("due_date", filters.dueDateTo)
    }

    return q
  }

  baseQuery = applyFilters(baseQuery).order("position", { ascending: true })
  countersQuery = applyFilters(countersQuery)

  const [taskResult, counterResult] = await Promise.all([baseQuery.range(from, to), countersQuery])

  const { data: rawRows, error, count } = taskResult as {
    data: ProjectTaskRow[] | null
    error: Error | null
    count: number | null
  }

  const { data: rawCounterRows, error: counterError } = counterResult as {
    data: ProjectTaskCounterRow[] | null
    error: Error | null
  }

  if (error) throw error
  if (counterError) throw counterError

  const rows = rawRows ?? []
  const counterRows = rawCounterRows ?? []

  const tasks: ProjectTask[] =
    rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description ?? null,
      status: (row.status as ProjectTaskStatus) ?? "todo",
      weight: Number(row.weight ?? 0),
      assigneeId: row.assignee_id ?? null,
      assigneeName: Array.isArray(row.team_members)
        ? row.team_members[0]?.full_name ?? null
        : row.team_members?.full_name ?? null,
      startDate: row.start_date ?? null,
      dueDate: row.due_date ?? null,
      position: Number(row.position ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

  const today = startOfDay(new Date())
  const endOfWeek = addDays(today, 7)

  let totalWeight = 0
  let completedWeight = 0
  let dueToday = 0
  let dueThisWeek = 0

  const assigneeMap = new Map<string, string>()

  counterRows.forEach((task) => {
    const weight = Number(task.weight ?? 0)
    totalWeight += weight
    if (task.status === "done") {
      completedWeight += weight
    }
    if (task.due_date) {
      const dueDate = new Date(task.due_date)
      if (isToday(dueDate)) dueToday += 1
      if (isWithinInterval(dueDate, { start: today, end: endOfWeek })) dueThisWeek += 1
    }
    if (task.assignee_id) {
      assigneeMap.set(task.assignee_id, "")
    }
  })

  if (assigneeMap.size > 0) {
    const assigneeIds = Array.from(assigneeMap.keys())
    const { data: assigneesData, error: assigneeError } = await supabase
      .from("team_members")
      .select("id, full_name")
      .in("id", assigneeIds)
    if (assigneeError) throw assigneeError
    assigneesData?.forEach((member) => {
      assigneeMap.set(member.id, member.full_name ?? "Responsable")
    })
  }

  return {
    tasks,
    pagination: { page, pageSize, total: count ?? 0 },
    stats: {
      total: counterRows.length,
      done: counterRows.filter((task) => task.status === "done").length,
      dueToday,
      dueThisWeek,
    },
    counters: {
      completedWeight,
      totalWeight,
    },
    assignees: Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name })),
  }
}

export async function createProjectTask(
  projectId: string,
  payload: z.infer<typeof taskWriteSchema>,
  actorId: string,
) {
  const supabase = createServerSupabaseClient()
  const parsed = taskWriteSchema.parse(payload)

  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: projectId,
      title: parsed.title,
      description: parsed.description ?? null,
      status: parsed.status,
      weight: parsed.weight,
      assignee_id: parsed.assigneeId ?? null,
      start_date: parsed.startDate ?? null,
      due_date: parsed.dueDate ?? null,
      position: parsed.position ?? Date.now(),
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo crear la tarea")

  await Promise.all([
    appendTaskActivity(data.id, actorId, "created", "Tarea creada"),
    recalculateProjectProgress(projectId, actorId, supabase),
  ])

  return data.id
}

export async function updateProjectTask(taskId: string, payload: z.infer<typeof taskUpdateSchema>, actorId: string) {
  const supabase = createServerSupabaseClient()
  const parsed = taskUpdateSchema.parse(payload)

  const { data: existing, error: fetchError } = await supabase
    .from("project_tasks")
    .select("project_id, status, weight, title, due_date")
    .eq("id", taskId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) throw new Error("Tarea no encontrada")

  const { error } = await supabase
    .from("project_tasks")
    .update({
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      weight: parsed.weight,
      assignee_id: parsed.assigneeId,
      start_date: parsed.startDate,
      due_date: parsed.dueDate,
      position: parsed.position,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error

  const changes: string[] = []
  const statusChanged = parsed.status && parsed.status !== existing.status
  if (statusChanged) {
    changes.push(`Estado cambiado a ${parsed.status}`)
  }
  if (parsed.weight && parsed.weight !== Number(existing.weight ?? 0)) {
    changes.push(`Peso actualizado a ${parsed.weight}`)
  }

  if (changes.length > 0) {
    await appendTaskActivity(taskId, actorId, "updated", changes.join(". "))
  }

  const progress = await recalculateProjectProgress(existing.project_id, actorId, supabase)

  if (statusChanged && parsed.status === "done") {
    await supabase.from("project_activity").insert({
      project_id: existing.project_id,
      title: "Tarea completada",
      description: `La tarea "${existing.title}" se marcó como hecha. Progreso global ${progress.toFixed(1)}%.`,
      event_type: "task_completed",
      status: "completed",
      occurred_at: new Date().toISOString(),
    })
  }

  const dueDate = parsed.dueDate ?? existing.due_date
  if (dueDate && (statusChanged ? parsed.status !== "done" : existing.status !== "done")) {
    const due = new Date(dueDate)
    if (due < startOfDay(new Date())) {
      await supabase.from("project_activity").insert({
        project_id: existing.project_id,
        title: "Tarea vencida",
        description: `La tarea "${existing.title}" está vencida. El progreso actual es ${progress.toFixed(1)}%.`,
        event_type: "task_overdue",
        status: "warning",
        occurred_at: new Date().toISOString(),
      })
    }
  }
}

export async function deleteProjectTask(taskId: string, actorId: string) {
  const supabase = createServerSupabaseClient()
  const { data: existing, error: fetchError } = await supabase
    .from("project_tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!existing) return

  await appendTaskActivity(taskId, actorId, "deleted", "Tarea eliminada")

  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId)
  if (error) throw error
  await recalculateProjectProgress(existing.project_id, actorId, supabase)
}

export interface ReorderPayloadItem {
  id: string
  status: ProjectTaskStatus
  position: number
}

export async function reorderProjectTasks(projectId: string, items: ReorderPayloadItem[], actorId: string) {
  const supabase = createServerSupabaseClient()

  const updates = items.map((item) => ({
    id: item.id,
    status: item.status,
    position: item.position,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("project_tasks").upsert(updates, { onConflict: "id" })
  if (error) throw error

  if (items.length > 0) {
    await appendTaskActivity(items[0].id, actorId, "reordered", "La tarea cambió de columna o posición")
  }
  await recalculateProjectProgress(projectId, actorId, supabase)
}

export interface BulkUpdateTasksPayload {
  ids: string[]
  status?: ProjectTaskStatus
  assigneeId?: string | null
}

export async function bulkUpdateProjectTasks(projectId: string, payload: BulkUpdateTasksPayload, actorId: string) {
  if (!payload.ids || payload.ids.length === 0) {
    return
  }
  const supabase = createServerSupabaseClient()

  const update: Record<string, unknown> = {
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  }
  if (payload.status && TASK_STATUSES.includes(payload.status)) update.status = payload.status
  if (payload.assigneeId !== undefined) update.assignee_id = payload.assigneeId

  const { error } = await supabase.from("project_tasks").update(update).in("id", payload.ids)
  if (error) throw error

  await Promise.all(
    payload.ids.map((id) =>
      appendTaskActivity(
        id,
        actorId,
        "bulk_update",
        `Tarea actualizada en lote${payload.status ? `, nuevo estado: ${payload.status}` : ""}${
          payload.assigneeId !== undefined ? ", responsable actualizado" : ""
        }`,
      ),
    ),
  )

  await recalculateProjectProgress(projectId, actorId, supabase)
}

export async function fetchTaskActivity(taskId: string): Promise<ProjectTaskActivity[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_task_activity")
    .select("id, task_id, actor_id, event_type, message, metadata, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (
    data?.map((entry) => ({
      id: entry.id,
      taskId: entry.task_id,
      actorId: entry.actor_id,
      eventType: entry.event_type,
      message: entry.message ?? null,
      metadata: entry.metadata ?? null,
      createdAt: entry.created_at,
    })) ?? []
  )
}

export async function appendTaskActivity(
  taskId: string,
  actorId: string | null,
  eventType: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_task_activity").insert({
    task_id: taskId,
    actor_id: actorId,
    event_type: eventType,
    message,
    metadata: metadata ?? null,
  })
  if (error) throw error
}

export async function recalculateProjectProgress(
  projectId: string,
  actorId: string | null,
  supabase = createServerSupabaseClient(),
): Promise<number> {
  const { data: taskRows, error } = await supabase
    .from("project_tasks")
    .select("status, weight")
    .eq("project_id", projectId)

  if (error) throw error

  const totalWeight = taskRows?.reduce((sum, task) => sum + Number(task.weight ?? 0), 0) ?? 0
  const doneWeight =
    taskRows?.filter((task) => task.status === "done").reduce((sum, task) => sum + Number(task.weight ?? 0), 0) ?? 0

  const progress = totalWeight > 0 ? Math.min((doneWeight / totalWeight) * 100, 100) : 0

  const { error: updateError } = await supabase
    .from("projects")
    .update({ progress_percent: progress })
    .eq("id", projectId)

  if (updateError) throw updateError

  if (actorId) {
    await supabase.from("project_activity").insert({
      project_id: projectId,
      title: "Progreso actualizado",
      description: `El progreso del proyecto ahora es ${progress.toFixed(1)}%.`,
      status: "info",
      occurred_at: new Date().toISOString(),
    })
  }
  return progress
}

export async function addTaskToCalendar(taskId: string, actorId: string) {
  const supabase = createServerSupabaseClient()

  const { data: task, error } = await supabase
    .from("project_tasks")
    .select("id, project_id, title, description, due_date")
    .eq("id", taskId)
    .maybeSingle()

  if (error) throw error
  if (!task) throw new Error("Tarea no encontrada")
  if (!task.due_date) throw new Error("La tarea no tiene fecha límite")

  await createProjectEvent(
    {
      projectId: task.project_id,
      title: `Entrega tarea: ${task.title}`,
      description: task.description ?? null,
      eventType: "tarea",
      startsAt: new Date(task.due_date).toISOString(),
      endsAt: new Date(task.due_date).toISOString(),
      visibility: "internal",
      isAllDay: true,
    },
    actorId,
  )

  await appendTaskActivity(taskId, actorId, "calendar", "La fecha límite se añadió al calendario")

  await supabase.from("project_activity").insert({
    project_id: task.project_id,
    title: `Tarea añadida al calendario: ${task.title}`,
    description: task.description ?? null,
    event_type: "task_calendar",
    status: "info",
    occurred_at: new Date().toISOString(),
  })
}
