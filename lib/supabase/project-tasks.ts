import { addDays, isToday, isWithinInterval, startOfDay } from "date-fns"
import { z } from "zod"

import type { SupabaseClient } from "@supabase/supabase-js"

import { PROJECT_TASK_STATUSES, type ProjectTaskStatus } from "../../types/project-tasks"
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
  is_milestone: boolean | null
  show_in_calendar: boolean | null
  created_at: string
  updated_at: string
}

type ProjectTaskCounterRow = {
  id: string
  status: string
  weight: number | null
  due_date: string | null
  assignee_id: string | null
}

type TaskCalendarSnapshot = {
  id: string
  project_id: string
  title: string
  description: string | null
  start_date: string | null
  due_date: string | null
  is_milestone: boolean
  show_in_calendar: boolean
  /** Estado de la tarea en el momento del sync (para reflejarlo en el calendario) */
  status?: string
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
  isMilestone: boolean
  showInCalendar: boolean
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
  isMilestone: z.boolean().optional(),
  showInCalendar: z.boolean().optional(),
})

const taskUpdateSchema = taskWriteSchema.partial().extend({
  title: z.string().min(1).max(200).optional(),
})

type TaskWriteInput = z.infer<typeof taskWriteSchema>
type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

function deriveTaskEventId(taskId: string, kind: "start" | "end"): string {
  const clean = taskId.replace(/-/g, "")
  if (clean.length !== 32) return taskId
  const prefix = kind === "start" ? "0" : "f"
  const mutated = (prefix + clean.slice(1)).toLowerCase()
  return `${mutated.slice(0, 8)}-${mutated.slice(8, 12)}-${mutated.slice(12, 16)}-${mutated.slice(16, 20)}-${mutated.slice(20)}`
}

function calendarIsoFromDate(date: string | null, hour: number): string | null {
  if (!date) return null
  const parts = date.split("-").map((value) => Number.parseInt(value, 10))
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return null
  const [year, month, day] = parts
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0)).toISOString()
}

async function removeTaskCalendarEvent(supabase: SupabaseClient, eventId: string) {
  const { error } = await supabase.from("project_events").delete().eq("id", eventId)
  if (error && error.code !== "PGRST116") {
    throw error
  }
}

async function deleteTaskCalendarEvents(supabase: SupabaseClient, taskId: string) {
  await removeTaskCalendarEvent(supabase, deriveTaskEventId(taskId, "start"))
  await removeTaskCalendarEvent(supabase, deriveTaskEventId(taskId, "end"))
}

async function syncTaskCalendarEvents(
  supabase: SupabaseClient,
  snapshot: TaskCalendarSnapshot,
  actorId: string | null,
) {
  // Si la tarea no debe verse en calendario, limpiamos cualquier evento previo.
  if (!snapshot.show_in_calendar) {
    await deleteTaskCalendarEvents(supabase, snapshot.id)
    return
  }

  const milestonePrefix = snapshot.is_milestone ? "Hito" : null
  const isDone = snapshot.status === "done"

  const upsertTaskEvent = async (kind: "start" | "end", date: string | null) => {
    const iso = calendarIsoFromDate(date, kind === "start" ? 8 : 17)
    const eventId = deriveTaskEventId(snapshot.id, kind)

    if (!iso) {
      await removeTaskCalendarEvent(supabase, eventId)
      return
    }

    const baseLabel = kind === "start" ? "Inicio" : "Entrega"
    const labelCore = milestonePrefix ? `${milestonePrefix} · ${baseLabel}` : baseLabel
    const label = isDone ? `✓ ${labelCore}` : labelCore

    // Si la tarea está marcada como hecha, añadimos sufijo `_done` al event_type.
    // El calendario usa esto para tachar y cambiar el color del evento (estilo completada).
    let eventType: string = snapshot.is_milestone
      ? kind === "start"
        ? "task_milestone_start"
        : "task_milestone_due"
      : kind === "start"
        ? "task_start"
        : "task_due"
    if (isDone) eventType = `${eventType}_done`

    const baseRecord = {
      id: eventId,
      project_id: snapshot.project_id,
      title: `${label} tarea: ${snapshot.title}`,
      description: snapshot.description ?? null,
      event_type: eventType,
      starts_at: iso,
      ends_at: null,
      is_all_day: true,
      visibility: "client_visible",
      task_id: snapshot.id,
      ...(actorId ? { created_by: actorId } : {}),
    }

    let { error } = await supabase.from("project_events").upsert(baseRecord, { onConflict: "id" })

    // Si la columna task_id aún no existe en la BD, reintentamos sin ella para no romper.
    if (error && (error.code === "42703" || (error.message ?? "").toLowerCase().includes("task_id"))) {
      console.warn(
        "[calendar-sync] Columna project_events.task_id no encontrada. Aplica la migración SQL para habilitar la edición de tareas desde el calendario.",
      )
      const { task_id: _ignored, ...fallback } = baseRecord
      const retry = await supabase.from("project_events").upsert(fallback, { onConflict: "id" })
      error = retry.error ?? null
    }

    if (error) throw error
  }

  await upsertTaskEvent("start", snapshot.start_date)
  await upsertTaskEvent("end", snapshot.due_date)
}

function isMissingRelationError(error: unknown, relation?: string) {
  if (!error || typeof error !== "object") return false
  const { code, message, details } = error as { code?: string; message?: string; details?: string }
  const haystack = [message, details, JSON.stringify(error)].filter(Boolean).join(" ").toLowerCase()
  const relationNeedle = relation?.toLowerCase()

  const codeMatches =
    code === "42P01" ||
    code === "42703" ||
    (typeof code === "string" && code.startsWith("PGRST") && haystack.includes("does not exist"))

  if (!codeMatches) return false
  if (!relationNeedle) return true
  return haystack.includes(relationNeedle) || haystack.includes(`${relationNeedle}_`)
}

function buildMissingTaskSchemaError(): Error & { status?: number } {
  const error = new Error(
    "La tabla de tareas no existe en Supabase. Ejecuta las migraciones de `supabase/schema.sql` (sección `project_tasks`) desde el SQL Editor o pídeselo a Cursor para que la aplique.",
  ) as Error & { status?: number }
  error.status = 500
  return error
}

function parseTaskWritePayload(payload: unknown): TaskWriteInput {
  const parsed = taskWriteSchema.safeParse(payload)
  if (!parsed.success) {
    const error = new Error("Datos de tarea inválidos") as Error & { status?: number; details?: unknown }
    error.status = 400
    error.details = parsed.error.flatten().fieldErrors
    throw error
  }
  return parsed.data
}

function parseTaskUpdatePayload(payload: unknown): TaskUpdateInput {
  const parsed = taskUpdateSchema.safeParse(payload)
  if (!parsed.success) {
    const error = new Error("Datos de tarea inválidos") as Error & { status?: number; details?: unknown }
    error.status = 400
    error.details = parsed.error.flatten().fieldErrors
    throw error
  }
  return parsed.data
}

function rethrowIfMissingTaskSchema(error: unknown): never {
  if (
    isMissingRelationError(error, "project_tasks") ||
    isMissingRelationError(error, "project_task_activity") ||
    isMissingRelationError(error, "team_members")
  ) {
    throw buildMissingTaskSchemaError()
  }
  throw error
}

export async function listProjectTasks(projectId: string, filters: ListProjectTasksFilters = {}): Promise<ListProjectTasksResult> {
  const supabase = createServerSupabaseClient()

  const page = Math.max(filters.page ?? 1, 1)
  // Subido de 100 → 2000 para que los proyectos con muchas tareas las muestren todas sin paginar.
  const pageSize = Math.min(Math.max(filters.pageSize ?? 500, 5), 2000)
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
        "is_milestone",
        "show_in_calendar",
        "created_at",
        "updated_at",
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
      assigneeName: null,
      startDate: row.start_date ?? null,
      dueDate: row.due_date ?? null,
      position: Number(row.position ?? 0),
      isMilestone: row.is_milestone === true,
      showInCalendar: row.show_in_calendar !== false,
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
    tasks.forEach((task) => {
      if (task.assigneeId) {
        task.assigneeName = assigneeMap.get(task.assigneeId) ?? null
      }
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

export async function createProjectTask(projectId: string, payload: unknown, actorId: string) {
  const supabase = createServerSupabaseClient()
  const parsed = parseTaskWritePayload(payload)

  const resolvedIsMilestone = parsed.isMilestone ?? false
  const resolvedShowInCalendar = parsed.showInCalendar ?? true

  const insertPayload = {
    project_id: projectId,
    title: parsed.title,
    description: parsed.description ?? null,
    status: parsed.status,
    weight: parsed.weight,
    assignee_id: parsed.assigneeId ?? null,
    start_date: parsed.startDate ?? null,
    due_date: parsed.dueDate ?? null,
    position: parsed.position ?? Date.now(),
    is_milestone: resolvedIsMilestone,
    show_in_calendar: resolvedShowInCalendar,
    created_by: actorId,
    updated_by: actorId,
  }

  let effectiveActorId: string | null = actorId

  let { data, error } = await supabase.from("project_tasks").insert(insertPayload).select("id").maybeSingle()

  if (error || !data) {
    if (isForeignKeyViolation(error)) {
      const retry = await supabase
        .from("project_tasks")
        .insert({
          ...insertPayload,
          created_by: null,
          updated_by: null,
        })
        .select("id")
        .maybeSingle()
      if (retry.error || !retry.data) {
        if (retry.error) {
          rethrowIfMissingTaskSchema(retry.error)
          throw retry.error
        }
        throw new Error("No se pudo crear la tarea")
      }
      data = retry.data
      effectiveActorId = null
    } else {
      if (error) {
        rethrowIfMissingTaskSchema(error)
        throw error
      }
      throw new Error("No se pudo crear la tarea")
    }
  }

  await syncTaskCalendarEvents(
    supabase,
    {
      id: data.id,
      project_id: projectId,
      title: parsed.title,
      description: parsed.description ?? null,
      start_date: parsed.startDate ?? null,
      due_date: parsed.dueDate ?? null,
      is_milestone: resolvedIsMilestone,
      show_in_calendar: resolvedShowInCalendar,
      status: parsed.status,
    },
    effectiveActorId,
  )

  await Promise.all([
    appendTaskActivity(data.id, effectiveActorId, "created", "Tarea creada"),
    recalculateProjectProgress(projectId, effectiveActorId, supabase),
  ])

  return data.id
}

export async function updateProjectTask(taskId: string, payload: unknown, actorId: string) {
  const supabase = createServerSupabaseClient()
  const parsed = parseTaskUpdatePayload(payload)

  const { data: existing, error: fetchError } = await supabase
    .from("project_tasks")
    .select(
      "project_id, status, weight, title, description, start_date, due_date, is_milestone, show_in_calendar",
    )
    .eq("id", taskId)
    .maybeSingle()

  if (fetchError) {
    rethrowIfMissingTaskSchema(fetchError)
    throw fetchError
  }
  if (!existing) throw new Error("Tarea no encontrada")

  const updatePayload = {
    title: parsed.title,
    description: parsed.description,
    status: parsed.status,
    weight: parsed.weight,
    assignee_id: parsed.assigneeId,
    start_date: parsed.startDate,
    due_date: parsed.dueDate,
    position: parsed.position,
    is_milestone: parsed.isMilestone,
    show_in_calendar: parsed.showInCalendar,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  }

  let effectiveActorId: string | null = actorId

  let { error } = await supabase.from("project_tasks").update(updatePayload).eq("id", taskId)

  if (error) {
    if (isForeignKeyViolation(error)) {
      const retry = await supabase
        .from("project_tasks")
        .update({
          ...updatePayload,
          updated_by: null,
        })
        .eq("id", taskId)
      if (retry.error) {
        rethrowIfMissingTaskSchema(retry.error)
        throw retry.error
      }
      effectiveActorId = null
      error = null
    }
  }

  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }

  const snapshot: TaskCalendarSnapshot = {
    id: taskId,
    project_id: existing.project_id,
    title: updatePayload.title ?? existing.title,
    description:
      updatePayload.description !== undefined ? updatePayload.description ?? null : existing.description ?? null,
    start_date:
      updatePayload.start_date !== undefined ? updatePayload.start_date ?? null : existing.start_date ?? null,
    due_date: updatePayload.due_date !== undefined ? updatePayload.due_date ?? null : existing.due_date ?? null,
    is_milestone:
      updatePayload.is_milestone !== undefined
        ? Boolean(updatePayload.is_milestone)
        : existing.is_milestone === true,
    show_in_calendar:
      updatePayload.show_in_calendar !== undefined
        ? Boolean(updatePayload.show_in_calendar)
        : existing.show_in_calendar !== false,
    status: updatePayload.status ?? existing.status,
  }

  await syncTaskCalendarEvents(supabase, snapshot, effectiveActorId)

  const changes: string[] = []
  const statusChanged = parsed.status && parsed.status !== existing.status
  if (statusChanged) {
    changes.push(`Estado cambiado a ${parsed.status}`)
  }
  if (parsed.weight && parsed.weight !== Number(existing.weight ?? 0)) {
    changes.push(`Peso actualizado a ${parsed.weight}`)
  }

  if (changes.length > 0) {
    await appendTaskActivity(taskId, effectiveActorId, "updated", changes.join(". "))
  }

  const progress = await recalculateProjectProgress(existing.project_id, effectiveActorId, supabase)

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

/**
 * Devuelve una única tarea por ID, con el nombre del responsable ya resuelto.
 * Útil para modales de edición desde el calendario.
 */
export async function getProjectTask(taskId: string): Promise<ProjectTask | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_tasks")
    .select(
      "id, project_id, title, description, status, weight, assignee_id, start_date, due_date, position, is_milestone, show_in_calendar, created_at, updated_at",
    )
    .eq("id", taskId)
    .maybeSingle()

  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }

  if (!data) return null

  const row = data as ProjectTaskRow

  let assigneeName: string | null = null
  if (row.assignee_id) {
    const { data: memberRow, error: memberError } = await supabase
      .from("team_members")
      .select("full_name")
      .eq("id", row.assignee_id)
      .maybeSingle()
    if (!memberError) {
      assigneeName = (memberRow?.full_name as string | undefined) ?? null
    }
  }

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? null,
    status: (row.status as ProjectTaskStatus) ?? "todo",
    weight: Number(row.weight ?? 0),
    assigneeId: row.assignee_id ?? null,
    assigneeName,
    startDate: row.start_date ?? null,
    dueDate: row.due_date ?? null,
    position: Number(row.position ?? 0),
    isMilestone: row.is_milestone === true,
    showInCalendar: row.show_in_calendar !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Dado un ID de evento del calendario (derivado de una tarea), intenta recuperar
 * la tarea asociada. Primero consulta por `task_id` (columna explícita).
 * Si no está presente, hace una búsqueda en las tareas del proyecto comparando
 * los IDs derivados (backwards compatibility con eventos antiguos).
 */
export async function findTaskByEventId(eventId: string): Promise<ProjectTask | null> {
  const supabase = createServerSupabaseClient()

  // Intento 1: columna task_id explícita
  const { data: eventRow, error: eventError } = await supabase
    .from("project_events")
    .select("id, project_id, task_id, event_type")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) {
    if (eventError.code === "42703") {
      // Columna task_id no existe todavía → seguimos con fallback
    } else if (eventError.code !== "PGRST116") {
      throw eventError
    }
  }

  const linkedTaskId =
    eventRow && typeof (eventRow as { task_id?: string }).task_id === "string"
      ? (eventRow as { task_id?: string | null }).task_id
      : null

  if (linkedTaskId) {
    return getProjectTask(linkedTaskId)
  }

  // Fallback: iterar tareas del proyecto y comparar con deriveTaskEventId
  if (!eventRow?.project_id) return null

  const { data: tasks, error: listError } = await supabase
    .from("project_tasks")
    .select("id")
    .eq("project_id", eventRow.project_id)

  if (listError) return null

  for (const task of tasks ?? []) {
    const startId = deriveTaskEventId(task.id as string, "start")
    const endId = deriveTaskEventId(task.id as string, "end")
    if (startId === eventId || endId === eventId) {
      return getProjectTask(task.id as string)
    }
  }

  return null
}

export async function deleteProjectTask(taskId: string, actorId: string) {
  const supabase = createServerSupabaseClient()
  const { data: existing, error: fetchError } = await supabase
    .from("project_tasks")
    .select("project_id")
    .eq("id", taskId)
    .maybeSingle()

  if (fetchError) {
    rethrowIfMissingTaskSchema(fetchError)
    throw fetchError
  }
  if (!existing) return

  await deleteTaskCalendarEvents(supabase, taskId)

  await appendTaskActivity(taskId, actorId, "deleted", "Tarea eliminada")

  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId)
  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }
  await recalculateProjectProgress(existing.project_id, actorId, supabase)
}

const FALLBACK_TASK_PREFIX = "phase-"

export interface ReorderPayloadItem {
  id: string
  status: ProjectTaskStatus
  position: number
}

type PhaseStatus = "pending" | "in_progress" | "completed" | "delayed"

function isFallbackTaskId(id: string): boolean {
  return typeof id === "string" && id.startsWith(FALLBACK_TASK_PREFIX)
}

function normalizePhaseId(id: string): string | null {
  if (!isFallbackTaskId(id)) return null
  const value = id.slice(FALLBACK_TASK_PREFIX.length)
  return value.length > 0 ? value : null
}

function mapTaskStatusToPhaseStatus(status: ProjectTaskStatus): PhaseStatus {
  switch (status) {
    case "done":
      return "completed"
    case "in_progress":
    case "review":
      return "in_progress"
    case "blocked":
      return "delayed"
    default:
      return "pending"
  }
}

async function reorderProjectPhasesFallback(
  projectId: string,
  items: ReorderPayloadItem[],
  supabase = createServerSupabaseClient(),
) {
  const updates = items
    .map((item, index) => {
      const phaseId = normalizePhaseId(item.id)
      if (!phaseId) return null
      return {
        id: phaseId,
        project_id: projectId,
        sort_order: Math.round(item.position ?? (index + 1) * 1000),
        status: mapTaskStatusToPhaseStatus(item.status),
      }
    })
    .filter((update): update is NonNullable<typeof update> => Boolean(update))

  if (updates.length === 0) return

  const { error } = await supabase.from("project_phases").upsert(updates, { onConflict: "id" })
  if (error) {
    throw error
  }
}

export async function reorderProjectTasks(projectId: string, items: ReorderPayloadItem[], actorId: string) {
  const supabase = createServerSupabaseClient()

  const fallbackItems = items.filter((item) => isFallbackTaskId(item.id))
  const realItems = items.filter((item) => !isFallbackTaskId(item.id))

  const persistFallback = async () => {
    if (fallbackItems.length === 0) {
      throw buildMissingTaskSchemaError()
    }
    await reorderProjectPhasesFallback(projectId, fallbackItems, supabase)
  }

  if (realItems.length === 0 && fallbackItems.length > 0) {
    await persistFallback()
    return
  }

  let existingTasks: ProjectTaskRow[] = []
  if (realItems.length > 0) {
    const { data, error } = await supabase
      .from("project_tasks")
      .select(
        "id, project_id, title, description, status, weight, assignee_id, start_date, due_date, position, is_milestone, show_in_calendar, created_at, updated_at",
      )
      .in(
        "id",
        realItems.map((item) => item.id),
      )
    if (error) {
      if (isMissingRelationError(error, "project_tasks")) {
        await persistFallback()
        return
      }
      throw error
    }
    existingTasks = data ?? []
  }

  const now = new Date().toISOString()
  const updates = realItems
    .map((item) => {
      const current = existingTasks.find((task) => task.id === item.id)
      if (!current) return null
      return {
        ...current,
        project_id: current.project_id ?? projectId,
        status: item.status,
        position: item.position,
        updated_by: actorId,
        updated_at: now,
      }
    })
    .filter((update): update is NonNullable<typeof update> => Boolean(update))

  if (updates.length === 0) {
    if (fallbackItems.length > 0) {
      await persistFallback()
      return
    }
    return
  }

  const { error } = await supabase.from("project_tasks").upsert(updates, { onConflict: "id" })
  if (error) {
    if (isMissingRelationError(error, "project_tasks")) {
      await persistFallback()
    }
    rethrowIfMissingTaskSchema(error)
    throw error
  }

  await appendTaskActivity(updates[0].id, actorId, "reordered", "La tarea cambió de columna o posición")
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
  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }

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

  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }

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
  const basePayload = {
    task_id: taskId,
    actor_id: actorId,
    event_type: eventType,
    message,
    metadata: metadata ?? null,
  }
  const { error } = await supabase.from("project_task_activity").insert(basePayload)
  if (error) {
    if (isForeignKeyViolation(error)) {
      const retry = await supabase
        .from("project_task_activity")
        .insert({
          ...basePayload,
          actor_id: null,
        })
      if (retry.error) {
        rethrowIfMissingTaskSchema(retry.error)
        throw retry.error
      }
      return
    }
    rethrowIfMissingTaskSchema(error)
    throw error
  }
}

function isForeignKeyViolation(error: unknown) {
  if (!error || typeof error !== "object") return false
  if (!("code" in error) || (error as { code?: string }).code !== "23503") return false
  return true
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

  if (error) {
    rethrowIfMissingTaskSchema(error)
    throw error
  }

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
    .select("id, project_id, title, description, start_date, due_date, is_milestone, show_in_calendar, status")
    .eq("id", taskId)
    .maybeSingle()

  if (error) throw error
  if (!task) throw new Error("Tarea no encontrada")
  if (!task.start_date && !task.due_date) {
    throw new Error("La tarea necesita una fecha de inicio o entrega para sincronizar con el calendario")
  }

  // Al pulsar "Añadir al calendario" forzamos show_in_calendar a true.
  if (task.show_in_calendar === false) {
    await supabase.from("project_tasks").update({ show_in_calendar: true }).eq("id", taskId)
  }

  await syncTaskCalendarEvents(
    supabase,
    {
      id: task.id,
      project_id: task.project_id,
      title: task.title,
      description: task.description ?? null,
      start_date: task.start_date ?? null,
      due_date: task.due_date ?? null,
      is_milestone: task.is_milestone === true,
      show_in_calendar: true,
      status: task.status ?? undefined,
    },
    actorId,
  )

  await appendTaskActivity(taskId, actorId, "calendar", "La tarea se sincronizó con el calendario")

  await supabase.from("project_activity").insert({
    project_id: task.project_id,
    title: `Tarea sincronizada con el calendario: ${task.title}`,
    description: task.description ?? null,
    event_type: "task_calendar",
    status: "info",
    occurred_at: new Date().toISOString(),
  })
}
