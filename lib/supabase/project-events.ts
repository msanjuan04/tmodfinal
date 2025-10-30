import { z } from "zod"

import { createServerSupabaseClient } from "./server"

const visibilityEnum = z.enum(["client_visible", "internal"])

const projectEventRowSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  event_type: z.string(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  is_all_day: z.boolean(),
  visibility: visibilityEnum,
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const projectEventWithProjectRowSchema = projectEventRowSchema.extend({
  projects: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      client_id: z.string().uuid().optional(),
    })
    .optional(),
})

const projectCalendarSummaryRow = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  clients: z
    .object({
      full_name: z.string().nullable(),
    })
    .nullable(),
})

export type ProjectEventVisibility = z.infer<typeof visibilityEnum>

export interface ProjectEvent {
  id: string
  projectId: string
  title: string
  description: string | null
  eventType: string
  startsAt: string
  endsAt: string | null
  isAllDay: boolean
  visibility: ProjectEventVisibility
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectCalendarContext {
  projectId: string
  projectSlug: string
  projectName: string
}

export interface ClientProjectEventsResult {
  project: ProjectCalendarContext | null
  events: ProjectEvent[]
}

export interface AdminGlobalEvent extends ProjectEvent {
  project: {
    id: string
    name: string
    slug: string
  }
}

export interface ProjectCalendarSummary {
  id: string
  name: string
  slug: string
  clientName: string | null
}

const eventRangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .optional()

export const projectEventWriteSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(160),
  description: z.string().max(4000).optional().nullable(),
  eventType: z.string().min(2).max(64),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  isAllDay: z.boolean().optional().default(false),
  visibility: visibilityEnum.default("client_visible"),
})

export type ProjectEventWriteInput = z.input<typeof projectEventWriteSchema>

function mapRowToEvent(row: z.infer<typeof projectEventRowSchema>): ProjectEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isAllDay: row.is_all_day,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchEventsForProject(
  projectId: string,
  visibility: ProjectEventVisibility | "all",
  range?: z.infer<typeof eventRangeSchema>,
): Promise<ProjectEvent[]> {
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from("project_events")
    .select("*")
    .eq("project_id", projectId)
    .order("starts_at", { ascending: true })

  if (visibility !== "all") {
    query = query.eq("visibility", visibility)
  }

  if (range?.from) {
    query = query.gte("starts_at", range.from)
  }

  if (range?.to) {
    query = query.lte("starts_at", range.to)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRowToEvent(projectEventRowSchema.parse(row)))
}

export async function getClientProjectEvents(
  clientId: string,
  projectSlug?: string | null,
  rangeInput?: z.infer<typeof eventRangeSchema>,
): Promise<ClientProjectEventsResult> {
  const supabase = createServerSupabaseClient()
  const range = eventRangeSchema.parse(rangeInput)

  let projectQuery = supabase
    .from("projects")
    .select("id, slug, name")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (projectSlug) {
    projectQuery = supabase
      .from("projects")
      .select("id, slug, name")
      .eq("client_id", clientId)
      .eq("slug", projectSlug)
      .limit(1)
  }

  const { data: projectRows, error: projectError } = await projectQuery

  if (projectError) {
    throw projectError
  }

  const projectRow = projectRows?.[0]

  if (!projectRow) {
    return { project: null, events: [] }
  }

  const events = await fetchEventsForProject(projectRow.id, "client_visible", range)

  return {
    project: {
      projectId: projectRow.id,
      projectSlug: projectRow.slug,
      projectName: projectRow.name,
    },
    events,
  }
}

export async function getAdminProjectEventsBySlug(projectSlug: string, range?: z.infer<typeof eventRangeSchema>) {
  const supabase = createServerSupabaseClient()

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id, slug, name")
    .eq("slug", projectSlug)
    .maybeSingle()

  if (projectError) {
    throw projectError
  }

  if (!projectRow) {
    return null
  }

  const events = await fetchEventsForProject(projectRow.id, "all", range)

  return {
    project: {
      id: projectRow.id,
      projectSlug: projectRow.slug,
      projectName: projectRow.name,
    },
    events,
  }
}

export async function getAdminGlobalEvents(rangeInput?: z.infer<typeof eventRangeSchema>): Promise<AdminGlobalEvent[]> {
  const supabase = createServerSupabaseClient()
  const range = eventRangeSchema.parse(rangeInput)

  let query = supabase
    .from("project_events")
    .select("*, projects(id, name, slug)")
    .order("starts_at", { ascending: true })

  if (range?.from) {
    query = query.gte("starts_at", range.from)
  }

  if (range?.to) {
    query = query.lte("starts_at", range.to)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const parsed = projectEventWithProjectRowSchema.parse(row)
    if (!parsed.projects) {
      throw new Error("Project relationship missing for global event")
    }

    return {
      ...mapRowToEvent(parsed),
      project: {
        id: parsed.projects.id,
        name: parsed.projects.name,
        slug: parsed.projects.slug,
      },
    }
  })
}

export async function listProjectCalendarSummaries(): Promise<ProjectCalendarSummary[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, clients(full_name)")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const parsed = projectCalendarSummaryRow.parse(row)
    return {
      id: parsed.id,
      name: parsed.name,
      slug: parsed.slug,
      clientName: parsed.clients?.full_name ?? null,
    }
  })
}

export async function createProjectEvent(input: ProjectEventWriteInput, createdBy: string) {
  const payload = projectEventWriteSchema.parse(input)
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("project_events")
    .insert({
      project_id: payload.projectId,
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.eventType,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt ?? null,
      is_all_day: payload.isAllDay ?? false,
      visibility: payload.visibility,
      created_by: createdBy,
    })
    .select("*")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo crear el evento")
  }

  return mapRowToEvent(projectEventRowSchema.parse(data))
}

export async function updateProjectEvent(eventId: string, input: ProjectEventWriteInput) {
  const payload = projectEventWriteSchema.parse(input)
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("project_events")
    .update({
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.eventType,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt ?? null,
      is_all_day: payload.isAllDay ?? false,
      visibility: payload.visibility,
    })
    .eq("id", eventId)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo actualizar el evento")
  }

  return mapRowToEvent(projectEventRowSchema.parse(data))
}

export async function deleteProjectEvent(eventId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_events").delete().eq("id", eventId)
  if (error) {
    throw error
  }
}
