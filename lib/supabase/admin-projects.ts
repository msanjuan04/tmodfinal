import { createServerSupabaseClient } from "./server"
import type {
  AdminProjectDetails,
  AdminProjectListFilters,
  AdminProjectListItem,
  AdminProjectListResponse,
  AdminProjectStatus,
  AdminProjectTeamAssignment,
  AdminProjectTeamMember,
  AdminProjectMilestone,
  AdminProjectPhase,
  AdminProjectDocument,
  AdminProjectPhoto,
  AdminProjectTimelineEvent,
  AdminProjectTeamRole,
} from "@app/types/admin"

const STORAGE_BUCKET = "project-assets"

export const PROJECT_TEAM_ROLES: AdminProjectTeamRole[] = ["director", "arquitecto", "ingeniero", "instalador", "coordinador", "logistica", "otro"]

const PROJECT_STATUS_DEFAULT: AdminProjectStatus = "planificacion"

type TeamAssignmentsMap = Partial<Record<AdminProjectTeamRole, string | null>>

const PROJECT_DETAIL_COLUMNS = [
  "id",
  "client_id",
  "name",
  "code",
  "status",
  "progress_percent",
  "start_date",
  "estimated_delivery",
  "location_city",
  "location_notes",
  "map_url",
  "created_at",
  "updated_at",
  "clients(full_name)",
]

const PROJECT_DETAIL_FALLBACK_COLUMNS = PROJECT_DETAIL_COLUMNS.filter((column) => !column.startsWith("clients("))

function isMissingRelationError(error: unknown, relation?: string) {
  if (!error || typeof error !== "object") return false
  const { code, message, details } = error as { code?: string; message?: string; details?: string }
  const lowerRelation = relation?.toLowerCase()
  const haystack = [message, details, JSON.stringify(error)].filter(Boolean).join(" ").toLowerCase()

  const codeMatches =
    code === "42P01" ||
    code === "42703" ||
    (typeof code === "string" && code.startsWith("PGRST") && haystack.includes("does not exist"))

  if (!codeMatches) return false
  if (!lowerRelation) return true
  if (haystack.includes(lowerRelation)) return true
  if (haystack.includes(`${lowerRelation}_`)) return true
  return false
}

function rowsOrEmpty<T>(result: { data: T[] | null; error: unknown }, relation?: string): T[] {
  if (result.error) {
    if (isMissingRelationError(result.error, relation)) {
      return []
    }
    throw result.error
  }
  return result.data ?? []
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export interface AdminProjectUpsertInput {
  name: string
  slug?: string
  clientId: string
  code?: string | null
  status?: string
  startDate?: string | null
  estimatedDelivery?: string | null
  locationCity?: string | null
  locationNotes?: string | null
  locationMapUrl?: string | null
  managerId?: string | null
  assignments?: TeamAssignmentsMap
}

function randomCodeSegment(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length)
    result += alphabet[index]
  }
  return result
}

async function generateProjectCode(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `TRZ-${year}-${randomCodeSegment(4)}`
    const { data, error } = await supabase.from("projects").select("id").eq("code", candidate).maybeSingle()
    if (!error && !data) {
      return candidate
    }
    if (error && error.code !== "PGRST116") {
      throw error
    }
  }
  throw new Error("No se pudo generar un código único para el proyecto.")
}

export async function createAdminProjectRecord(
  payload: AdminProjectUpsertInput,
): Promise<{ id: string; slug: string; code: string; name: string }> {
  const supabase = createServerSupabaseClient()
  const codeToUse =
    payload.code && payload.code.trim().length > 0 ? payload.code.trim() : await generateProjectCode(supabase)

  const baseSlug = slugify(payload.slug && payload.slug.length > 0 ? payload.slug : payload.name)
  let candidateSlug = baseSlug
  let attempt = 1

  while (true) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_id: payload.clientId,
        name: payload.name.trim(),
        slug: candidateSlug,
        code: codeToUse,
        status: payload.status ?? PROJECT_STATUS_DEFAULT,
        start_date: payload.startDate ?? null,
        estimated_delivery: payload.estimatedDelivery ?? null,
        location_city: payload.locationCity ?? null,
        location_notes: payload.locationNotes ?? null,
        map_url: payload.locationMapUrl ?? null,
      })
      .select("id, slug")
      .maybeSingle()

    if (!error && data) {
      if (payload.assignments) {
        await assignProjectTeamRoles(data.id, payload.assignments)
      } else if (payload.managerId) {
        const managerAssignments: TeamAssignmentsMap = { director: payload.managerId }
        await assignProjectTeamRoles(data.id, managerAssignments)
      }
      return { id: data.id, slug: data.slug, code: codeToUse, name: payload.name.trim() }
    }

    if (error?.code === "23505") {
      candidateSlug = `${baseSlug}-${++attempt}`
      continue
    }

    throw error ?? new Error("No se pudo crear el proyecto")
  }
}

export async function updateAdminProjectBasics(projectId: string, payload: Partial<AdminProjectUpsertInput>): Promise<void> {
  const supabase = createServerSupabaseClient()
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.name !== undefined) update.name = payload.name.trim()
  if (payload.code !== undefined) update.code = payload.code ?? null
  if (payload.status !== undefined) update.status = payload.status ?? PROJECT_STATUS_DEFAULT
  if (payload.startDate !== undefined) update.start_date = payload.startDate ?? null
  if (payload.estimatedDelivery !== undefined) update.estimated_delivery = payload.estimatedDelivery ?? null
  if (payload.locationCity !== undefined) update.location_city = payload.locationCity ?? null
  if (payload.locationNotes !== undefined) update.location_notes = payload.locationNotes ?? null
  if (payload.locationMapUrl !== undefined) update.map_url = payload.locationMapUrl ?? null
  if (payload.slug !== undefined && payload.slug.trim().length > 0) update.slug = slugify(payload.slug)

  const { error } = await supabase.from("projects").update(update).eq("id", projectId)
  if (error) throw error

  if (payload.assignments) {
    await assignProjectTeamRoles(projectId, payload.assignments)
  } else if (payload.managerId !== undefined) {
    const managerAssignments: TeamAssignmentsMap = { director: payload.managerId ?? null }
    await assignProjectTeamRoles(projectId, managerAssignments)
  }
}

export async function assignProjectTeamRoles(projectId: string, assignments: TeamAssignmentsMap): Promise<void> {
  const supabase = createServerSupabaseClient()

  const rolesToAffect = Object.keys(assignments)

  if (rolesToAffect.length > 0) {
    const { error: deleteError } = await supabase
      .from("project_team_members")
      .delete()
      .eq("project_id", projectId)
      .in("assigned_role", rolesToAffect)
    if (deleteError) throw deleteError
  }

  const rows = Object.entries(assignments)
    .filter(([, memberId]) => memberId)
    .map(([role, memberId]) => ({
      project_id: projectId,
      team_member_id: memberId,
      assigned_role: role,
      status: "online",
      is_primary: role === "director",
    }))

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("project_team_members").insert(rows)
    if (upsertError) throw upsertError
  }
}

export async function archiveAdminProject(projectId: string): Promise<void> {
  await updateAdminProjectBasics(projectId, { status: "archivado" })
}

export async function deleteAdminProjectRecord(projectId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("projects").delete().eq("id", projectId)
  if (error) throw error
}

export async function duplicateAdminProject(projectId: string): Promise<{ id: string; slug: string; code: string }> {
  const supabase = createServerSupabaseClient()
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, client_id, name, slug, code, status, start_date, estimated_delivery, location_city, location_notes")
    .eq("id", projectId)
    .maybeSingle()
  if (error) throw error
  if (!project) throw new Error("Proyecto no encontrado")

  const { data: assignmentsData, error: teamError } = await supabase
    .from("project_team_members")
    .select("assigned_role, team_member_id")
    .eq("project_id", projectId)
  if (teamError) throw teamError

  const assignments: TeamAssignmentsMap = {}
  assignmentsData?.forEach((row) => {
    if (row.assigned_role && PROJECT_TEAM_ROLES.includes(row.assigned_role as AdminProjectTeamRole)) {
      assignments[row.assigned_role as AdminProjectTeamRole] = row.team_member_id ?? null
    }
  })

  const copyName = `${project.name} (Copia)`
  const copySlug = `${project.slug}-copia`

  const created = await createAdminProjectRecord({
    name: copyName,
    slug: copySlug,
    clientId: project.client_id,
    status: "borrador",
    startDate: project.start_date ?? null,
    estimatedDelivery: project.estimated_delivery ?? null,
    locationCity: project.location_city ?? null,
    locationNotes: project.location_notes ?? null,
    assignments,
  })

  const [{ data: phases }, { data: milestones }] = await Promise.all([
    supabase
      .from("project_phases")
      .select("name, summary, expected_start, expected_end, weight, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("title, summary, scheduled_start, scheduled_end, weight, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ])

  if (phases && phases.length > 0) {
    await supabase.from("project_phases").insert(
      phases.map((phase: any) => ({
        project_id: created.id,
        name: phase.name,
        summary: phase.summary ?? null,
        expected_start: phase.expected_start ?? null,
        expected_end: phase.expected_end ?? null,
        weight: phase.weight ?? 1,
        status: "pending",
        progress_percent: 0,
        sort_order: phase.sort_order ?? 0,
      })),
    )
  }

  if (milestones && milestones.length > 0) {
    await supabase.from("project_milestones").insert(
      milestones.map((milestone: any) => ({
        project_id: created.id,
        title: milestone.title,
        summary: milestone.summary ?? null,
        scheduled_start: milestone.scheduled_start ?? null,
        scheduled_end: milestone.scheduled_end ?? null,
        weight: milestone.weight ?? 1,
        status: "pending",
        progress_percent: 0,
        sort_order: milestone.sort_order ?? 0,
      })),
    )
  }

  return created
}

function sanitizeSearch(value?: string): string | undefined {
  if (!value) return undefined
  const cleaned = value.trim().replace(/[%]/g, "")
  return cleaned.length > 0 ? cleaned : undefined
}

export interface ListProjectsResult extends AdminProjectListResponse {}

export async function listAdminProjects(filters: AdminProjectListFilters = {}): Promise<ListProjectsResult> {
  const supabase = createServerSupabaseClient()

  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const search = sanitizeSearch(filters.search)
  const statuses = filters.status && filters.status.length > 0 ? filters.status : undefined

  let query = supabase
    .from("projects")
    .select(
      [
        "id",
        "name",
        "slug",
        "code",
        "status",
        "progress_percent",
        "start_date",
        "estimated_delivery",
        "created_at",
        "updated_at",
        "clients(id, full_name, email)",
        "project_team_members(team_member_id, assigned_role, team_members(full_name))",
      ].join(","),
      { count: "exact" },
    )

  if (search) {
    query = query.or(
      [
        `name.ilike.%${search}%`,
        `code.ilike.%${search}%`,
        `slug.ilike.%${search}%`,
        `clients.full_name.ilike.%${search}%`,
      ].join(","),
    )
  }

  if (statuses) {
    query = query.in("status", statuses)
  }

  if (filters.managerId) {
    query = query.eq("project_team_members.team_member_id", filters.managerId)
  }

  if (filters.startDateFrom) {
    query = query.gte("start_date", filters.startDateFrom)
  }
  if (filters.startDateTo) {
    query = query.lte("start_date", filters.startDateTo)
  }
  if (filters.endDateFrom) {
    query = query.gte("estimated_delivery", filters.endDateFrom)
  }
  if (filters.endDateTo) {
    query = query.lte("estimated_delivery", filters.endDateTo)
  }

  const sortBy = filters.sortBy ?? "updated_at"
  const sortOrder = filters.sortOrder ?? "desc"

  const sortColumn = (() => {
    switch (sortBy) {
      case "name":
        return "name"
      case "progress":
        return "progress_percent"
      case "start_date":
        return "start_date"
      case "estimated_delivery":
        return "estimated_delivery"
      case "status":
        return "status"
      case "updated_at":
      default:
        return "updated_at"
    }
  })()

  query = query.order(sortColumn, { ascending: sortOrder === "asc" })
  query = query.order("created_at", { ascending: false })

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = (data ?? []) as Array<any>

  const projects: AdminProjectListItem[] = rows.map((project) => {
      const manager = (project.project_team_members ?? []).find((member: any) => member.assigned_role === "director")
      const managerInfo = Array.isArray(manager?.team_members) ? manager?.team_members[0] : manager?.team_members
      const clientInfo = Array.isArray(project.clients) ? project.clients[0] : project.clients

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        code: project.code ?? null,
        clientName: clientInfo?.full_name ?? null,
        clientEmail: clientInfo?.email ?? null,
        status: project.status ?? "en_progreso",
        progressPercent: Number(project.progress_percent ?? 0),
        startDate: project.start_date ?? null,
        estimatedDelivery: project.estimated_delivery ?? null,
        managerId: manager?.team_member_id ?? null,
        managerName: managerInfo?.full_name ?? null,
        createdAt: project.created_at,
        updatedAt: project.updated_at ?? project.created_at,
      }
    })

  const { data: statusCounts } = await supabase
    .from("projects")
    .select("status", { head: false, count: "exact" })
    .neq("status", "")
  const statusAggregation = ((statusCounts ?? []) as Array<{ status: string | null }>).reduce<Record<string, number>>((acc, row) => {
    if (!row.status) return acc
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  const { data: allManagers } = await supabase
    .from("project_team_members")
    .select("team_member_id, assigned_role, team_members(full_name)")
    .eq("assigned_role", "director")

  const managers = ((allManagers ?? []) as Array<any>).reduce<Array<{ id: string; name: string }>>((acc, row) => {
      if (!row.team_member_id) return acc
      const info = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members
      if (!info?.full_name) return acc
      if (acc.some((item) => item.id === row.team_member_id)) return acc
      acc.push({ id: row.team_member_id, name: info.full_name })
      return acc
    }, [])

  return {
    projects,
    pagination: {
      page,
      pageSize,
      total: count ?? projects.length,
    },
    filters: {
      statuses: Object.entries(statusAggregation).map(([value, total]) => ({
        value,
        label: value,
        count: total,
      })),
      managers,
    },
  }
}

function normalizeTeamAssignments(rows: any[]): AdminProjectTeamAssignment[] {
  const map = new Map<AdminProjectTeamRole, AdminProjectTeamAssignment>()

  PROJECT_TEAM_ROLES.forEach((role) => {
    map.set(role, { role, memberId: null })
  })

  rows.forEach((row) => {
    const assignmentRole = (row.assigned_role ?? "otro") as AdminProjectTeamRole
    const member = Array.isArray(row.team_members) ? row.team_members[0] : row.team_members
    map.set(assignmentRole, {
      role: assignmentRole,
      memberId: row.team_member_id ?? null,
      memberName: member?.full_name ?? null,
      memberEmail: member?.email ?? null,
      memberRole: member?.role ?? null,
      status: row.status ?? null,
    })
  })

  return Array.from(map.values())
}

function computeWeightProgress(rows: Array<{ weight: number; status: string; progress_percent?: number }>) {
  const totalWeight = rows.reduce((acc, row) => acc + Number(row.weight ?? 1), 0)
  const completedWeight = rows.reduce((acc, row) => {
    if (row.status === "completed" || row.status === "alcanzado") {
      return acc + Number(row.weight ?? 1)
    }
    return acc
  }, 0)

  const inProgressWeight = rows.reduce((acc, row) => {
    if (row.status === "in_progress") {
      return acc + Number(row.weight ?? 1) * ((Number(row.progress_percent ?? 0) || 0) / 100)
    }
    return acc
  }, 0)

  const effectiveCompleted = completedWeight + inProgressWeight
  const ratio = totalWeight > 0 ? Math.min(effectiveCompleted / totalWeight, 1) : 0
  return { totalWeight, completedWeight: effectiveCompleted, ratio }
}

export async function getAdminProjectDetail(projectRef: string): Promise<AdminProjectDetails> {
  const supabase = createServerSupabaseClient()
  const storage = supabase.storage.from(STORAGE_BUCKET)
  const resolveStorageUrl = (path: string | null | undefined) => {
    if (!path) return null
    const { data } = storage.getPublicUrl(path)
    return data?.publicUrl ?? null
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectRef)
  const projectResult = await supabase
    .from("projects")
    .select(PROJECT_DETAIL_COLUMNS.join(","))
    .eq(isUuid ? "id" : "slug", projectRef)
    .maybeSingle()

  let projectRow = projectResult.data as any
  let clientInfo: any = null

  if (projectResult.error) {
    if (isMissingRelationError(projectResult.error, "clients")) {
      const fallback = await supabase
        .from("projects")
        .select(PROJECT_DETAIL_FALLBACK_COLUMNS.join(","))
        .eq(isUuid ? "id" : "slug", projectRef)
        .maybeSingle()
      if (fallback.error) throw fallback.error
      projectRow = fallback.data as any
    } else {
      throw projectResult.error
    }
  }

  if (!projectRow) {
    throw new Error("Proyecto no encontrado")
  }

  clientInfo = Array.isArray(projectRow?.clients) ? projectRow.clients[0] : projectRow?.clients

  const projectId = projectRow.id as string

  const [teamResult, directoryResult, milestonesResult, phasesResult, documentsResult, photosResult, timelineResult, tasksResult] = await Promise.all([
    supabase
      .from("project_team_members")
      .select("team_member_id, assigned_role, status, team_members(full_name, email, role)")
      .eq("project_id", projectId),
    supabase.from("team_members").select("id, full_name, role, email, phone_number, avatar_url, default_status").order("full_name", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("id, title, summary, scheduled_start, scheduled_end, actual_date, weight, progress_percent, status, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_phases")
      .select("id, name, summary, expected_start, expected_end, actual_end, weight, progress_percent, status, sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_documents")
      .select("id, name, category, file_type, size_label, uploaded_at, status, storage_path, uploaded_by, notify_client, tags, notes, team_members!project_documents_uploaded_by_fkey(full_name)")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("project_photos")
      .select("id, url, caption, taken_at, sort_order, storage_path, tags, is_cover")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_activity")
      .select("id, occurred_at, title, description, event_type, status")
      .eq("project_id", projectId)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase.from("project_tasks").select("status, weight").eq("project_id", projectId),
  ])

  const teamRows = rowsOrEmpty(teamResult, "project_team_members") as any[]
  const directoryRows = rowsOrEmpty(directoryResult, "team_members") as any[]
  const milestonesRows = rowsOrEmpty(milestonesResult, "project_milestones") as any[]
  const phasesRows = rowsOrEmpty(phasesResult, "project_phases") as any[]
  const documentsRows = rowsOrEmpty(documentsResult, "project_documents") as any[]
  const photosRows = rowsOrEmpty(photosResult, "project_photos") as any[]
  const timelineRows = rowsOrEmpty(timelineResult, "project_activity") as any[]
  const tasksRows = rowsOrEmpty(tasksResult, "project_tasks") as any[]

  const assignments = normalizeTeamAssignments(teamRows)

  const directory: AdminProjectTeamMember[] =
    directoryRows.map((member: any) => ({
      id: member.id,
      name: member.full_name,
      role: member.role,
      email: member.email ?? null,
      phone: member.phone_number ?? null,
      status: member.default_status,
    })) ?? []

  const milestones: AdminProjectMilestone[] =
    milestonesRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      summary: row.summary ?? null,
      scheduledStart: row.scheduled_start ?? null,
      scheduledEnd: row.scheduled_end ?? null,
      actualDate: row.actual_date ?? null,
      weight: Number(row.weight ?? 1),
      progressPercent: Number(row.progress_percent ?? 0),
      status: row.status ?? "pending",
      sortOrder: row.sort_order ?? 0,
    })) ?? []

  const phases: AdminProjectPhase[] =
    phasesRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      summary: row.summary ?? null,
      expectedStart: row.expected_start ?? null,
      expectedEnd: row.expected_end ?? null,
      actualEnd: row.actual_end ?? null,
      weight: Number(row.weight ?? 1),
      progressPercent: Number(row.progress_percent ?? 0),
      status: row.status ?? "pending",
      sortOrder: row.sort_order ?? 0,
    })) ?? []

  const documents: AdminProjectDocument[] =
    documentsRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      fileType: row.file_type,
      sizeLabel: row.size_label ?? null,
      uploadedAt: row.uploaded_at ?? null,
      status: row.status ?? "vigente",
      storagePath: row.storage_path ?? null,
      url: resolveStorageUrl(row.storage_path ?? null),
      uploadedById: row.uploaded_by ?? null,
      uploadedByName: Array.isArray(row.team_members) ? row.team_members[0]?.full_name ?? null : row.team_members?.full_name ?? null,
      notifyClient: Boolean(row.notify_client),
      tags: Array.isArray(row.tags) ? row.tags : [],
      notes: row.notes ?? null,
    })) ?? []

  const photos: AdminProjectPhoto[] =
    photosRows.map((row: any) => {
      const publicUrl = row.url ?? resolveStorageUrl(row.storage_path ?? null) ?? ""
      return {
        id: row.id,
        url: publicUrl,
        caption: row.caption ?? null,
        takenAt: row.taken_at ?? null,
        sortOrder: row.sort_order ?? 0,
        storagePath: row.storage_path ?? null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        isCover: Boolean(row.is_cover),
      }
    }) ?? []

  const timeline: AdminProjectTimelineEvent[] =
    timelineRows.map((row: any) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      title: row.title,
      description: row.description ?? null,
      status: row.status ?? "info",
      eventType: row.event_type ?? "project",
    })) ?? []

  const taskRows = tasksRows as Array<any>
  const taskTotalWeight = taskRows.reduce((acc, task) => acc + Number(task.weight ?? 0), 0)
  const taskCompletedWeight = taskRows
    .filter((task) => task.status === "done")
    .reduce((acc, task) => acc + Number(task.weight ?? 0), 0)
  const taskProgress = taskTotalWeight > 0 ? Math.min((taskCompletedWeight / taskTotalWeight) * 100, 100) : Number(projectRow.progress_percent ?? 0)

  const milestoneProgress = computeWeightProgress(milestones.map((milestone) => ({ weight: milestone.weight, status: milestone.status, progress_percent: milestone.progressPercent })))
  const phaseProgress = computeWeightProgress(phases.map((phase) => ({ weight: phase.weight, status: phase.status, progress_percent: phase.progressPercent })))

  const progressSources = [
    { value: taskProgress, active: taskRows.length > 0 },
    { value: milestoneProgress.ratio * 100, active: milestoneProgress.totalWeight > 0 },
    { value: phaseProgress.ratio * 100, active: phaseProgress.totalWeight > 0 },
  ].filter((entry) => entry.active)

  const combinedProgress =
    progressSources.length > 0 ? progressSources.reduce((acc, entry) => acc + entry.value, 0) / progressSources.length : Number(projectRow.progress_percent ?? 0)

  const completedTasks = taskRows.filter((task) => task.status === "done").length

  return {
    project: {
      id: projectRow.id,
      name: projectRow.name,
      slug: projectRow.slug ?? null,
      code: projectRow.code ?? null,
      status: projectRow.status ?? "en_progreso",
      startDate: projectRow.start_date ?? null,
      estimatedDelivery: projectRow.estimated_delivery ?? null,
      locationCity: projectRow.location_city ?? null,
      locationNotes: projectRow.location_notes ?? null,
      locationMapUrl: projectRow.map_url ?? null,
      clientName: clientInfo?.full_name ?? null,
      clientId: projectRow.client_id ?? null,
      managerId: assignments.find((assignment) => assignment.role === "director")?.memberId ?? null,
      managerName: assignments.find((assignment) => assignment.role === "director")?.memberName ?? null,
      progressPercent: Number(combinedProgress.toFixed(2)),
      createdAt: projectRow.created_at,
      lastUpdatedAt: projectRow.updated_at ?? projectRow.created_at,
    },
    stats: {
      totalTasks: taskRows.length,
      completedTasks,
      dueToday: 0,
      dueThisWeek: 0,
      completedWeight: milestoneProgress.completedWeight + phaseProgress.completedWeight,
      totalWeight: milestoneProgress.totalWeight + phaseProgress.totalWeight,
      milestonesCompleted: milestones.filter((milestone) => milestone.status === "completed").length,
      milestonesTotal: milestones.length,
      documentsTotal: documents.length,
      photosTotal: photos.length,
    },
    team: {
      assignments,
      directory,
    },
    phases,
    milestones,
    documents,
    photos,
    timeline,
  }
}

export interface AdminProjectMilestoneInput {
  title: string
  summary?: string | null
  scheduledStart?: string | null
  scheduledEnd?: string | null
  actualDate?: string | null
  weight?: number
  status?: string
  progressPercent?: number
}

export async function createProjectMilestone(projectId: string, payload: AdminProjectMilestoneInput): Promise<string> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      project_id: projectId,
      title: payload.title.trim(),
      summary: payload.summary ?? null,
      scheduled_start: payload.scheduledStart ?? null,
      scheduled_end: payload.scheduledEnd ?? null,
      actual_date: payload.actualDate ?? null,
      weight: payload.weight ?? 1,
      status: payload.status ?? "pending",
      progress_percent: payload.progressPercent ?? 0,
    })
    .select("id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo crear el hito")
  await recalculateProjectCompositeProgress(projectId)
  return data.id
}

export async function updateProjectMilestone(milestoneId: string, payload: Partial<AdminProjectMilestoneInput>): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error, data } = await supabase
    .from("project_milestones")
    .update({
      title: payload.title?.trim(),
      summary: payload.summary ?? undefined,
      scheduled_start: payload.scheduledStart ?? undefined,
      scheduled_end: payload.scheduledEnd ?? undefined,
      actual_date: payload.actualDate ?? undefined,
      weight: payload.weight ?? undefined,
      status: payload.status ?? undefined,
      progress_percent: payload.progressPercent ?? undefined,
    })
    .eq("id", milestoneId)
    .select("project_id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo actualizar el hito")
  await recalculateProjectCompositeProgress(data.project_id)
}

export async function reorderProjectMilestones(projectId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const supabase = createServerSupabaseClient()
  if (items.length === 0) return
  const { error } = await supabase
    .from("project_milestones")
    .upsert(items.map((item) => ({ id: item.id, project_id: projectId, sort_order: item.sortOrder })), { onConflict: "id" })
  if (error) throw error
}

export async function deleteProjectMilestone(milestoneId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("project_milestones").delete().eq("id", milestoneId).select("project_id").maybeSingle()
  if (error) throw error
  if (data?.project_id) {
    await recalculateProjectCompositeProgress(data.project_id)
  }
}

export interface AdminProjectPhaseInput {
  name: string
  summary?: string | null
  expectedStart?: string | null
  expectedEnd?: string | null
  actualEnd?: string | null
  weight?: number
  status?: string
  progressPercent?: number
}

export async function createProjectPhase(projectId: string, payload: AdminProjectPhaseInput): Promise<string> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_phases")
    .insert({
      project_id: projectId,
      name: payload.name.trim(),
      summary: payload.summary ?? null,
      expected_start: payload.expectedStart ?? null,
      expected_end: payload.expectedEnd ?? null,
      actual_end: payload.actualEnd ?? null,
      weight: payload.weight ?? 1,
      status: payload.status ?? "pending",
      progress_percent: payload.progressPercent ?? 0,
    })
    .select("id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo crear la fase")
  await recalculateProjectCompositeProgress(projectId)
  return data.id
}

export async function updateProjectPhase(phaseId: string, payload: Partial<AdminProjectPhaseInput>): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_phases")
    .update({
      name: payload.name?.trim(),
      summary: payload.summary ?? undefined,
      expected_start: payload.expectedStart ?? undefined,
      expected_end: payload.expectedEnd ?? undefined,
      actual_end: payload.actualEnd ?? undefined,
      weight: payload.weight ?? undefined,
      status: payload.status ?? undefined,
      progress_percent: payload.progressPercent ?? undefined,
    })
    .eq("id", phaseId)
    .select("project_id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo actualizar la fase")
  await recalculateProjectCompositeProgress(data.project_id)
}

export async function reorderProjectPhases(projectId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const supabase = createServerSupabaseClient()
  if (items.length === 0) return
  const { error } = await supabase
    .from("project_phases")
    .upsert(items.map((item) => ({ id: item.id, project_id: projectId, sort_order: item.sortOrder })), { onConflict: "id" })
  if (error) throw error
}

export async function deleteProjectPhase(phaseId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("project_phases").delete().eq("id", phaseId).select("project_id").maybeSingle()
  if (error) throw error
  if (data?.project_id) {
    await recalculateProjectCompositeProgress(data.project_id)
  }
}

export interface AdminProjectDocumentInput {
  name: string
  category: string
  fileType: string
  sizeLabel?: string | null
  uploadedAt?: string | null
  storagePath?: string | null
  notifyClient?: boolean
  tags?: string[]
  status?: string
  notes?: string | null
  uploadedBy?: string | null
}

export async function createProjectDocument(projectId: string, payload: AdminProjectDocumentInput): Promise<string> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      name: payload.name.trim(),
      category: payload.category,
      file_type: payload.fileType,
      size_label: payload.sizeLabel ?? null,
      uploaded_at: payload.uploadedAt ?? new Date().toISOString(),
      storage_path: payload.storagePath ?? null,
      notify_client: payload.notifyClient ?? false,
      tags: payload.tags ?? [],
      status: payload.status ?? "vigente",
      notes: payload.notes ?? null,
      uploaded_by: payload.uploadedBy ?? null,
    })
    .select("id")
    .maybeSingle()

  if (error || !data) throw error ?? new Error("No se pudo crear el documento")
  return data.id
}

export async function updateProjectDocument(documentId: string, payload: Partial<AdminProjectDocumentInput>): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("project_documents")
    .update({
      name: payload.name?.trim(),
      category: payload.category ?? undefined,
      file_type: payload.fileType ?? undefined,
      size_label: payload.sizeLabel ?? undefined,
      uploaded_at: payload.uploadedAt ?? undefined,
      storage_path: payload.storagePath ?? undefined,
      notify_client: payload.notifyClient ?? undefined,
      tags: payload.tags ?? undefined,
      status: payload.status ?? undefined,
      notes: payload.notes ?? undefined,
      uploaded_by: payload.uploadedBy ?? undefined,
    })
    .eq("id", documentId)
  if (error) throw error
}

export async function deleteProjectDocument(documentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_documents").delete().eq("id", documentId)
  if (error) throw error
}

export interface AdminProjectPhotoInput {
  url: string
  caption?: string | null
  takenAt?: string | null
  storagePath?: string | null
  tags?: string[]
  isCover?: boolean
}

export async function createProjectPhoto(projectId: string, payload: AdminProjectPhotoInput): Promise<string> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_photos")
    .insert({
      project_id: projectId,
      url: payload.url,
      caption: payload.caption ?? null,
      taken_at: payload.takenAt ?? null,
      storage_path: payload.storagePath ?? null,
      tags: payload.tags ?? [],
      is_cover: payload.isCover ?? false,
    })
    .select("id")
    .maybeSingle()
  if (error || !data) throw error ?? new Error("No se pudo crear la foto")
  return data.id
}

export async function updateProjectPhoto(photoId: string, payload: Partial<AdminProjectPhotoInput>): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("project_photos")
    .update({
      url: payload.url ?? undefined,
      caption: payload.caption ?? undefined,
      taken_at: payload.takenAt ?? undefined,
      storage_path: payload.storagePath ?? undefined,
      tags: payload.tags ?? undefined,
      is_cover: payload.isCover ?? undefined,
    })
    .eq("id", photoId)
  if (error) throw error
}

export async function reorderProjectPhotos(projectId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
  const supabase = createServerSupabaseClient()
  if (items.length === 0) return
  const { error } = await supabase
    .from("project_photos")
    .upsert(items.map((item) => ({ id: item.id, project_id: projectId, sort_order: item.sortOrder })), { onConflict: "id" })
  if (error) throw error
}

export async function deleteProjectPhoto(photoId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_photos").delete().eq("id", photoId)
  if (error) throw error
}

export async function recordProjectTimelineEvent(projectId: string, event: { title: string; description?: string | null; status?: string; eventType?: string }): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_activity").insert({
    project_id: projectId,
    title: event.title,
    description: event.description ?? null,
    status: event.status ?? "info",
    event_type: event.eventType ?? "project",
  })
  if (error) throw error
}

async function recalculateProjectCompositeProgress(projectId: string): Promise<number> {
  const supabase = createServerSupabaseClient()
  const [{ data: tasks, error: tasksError }, { data: milestones, error: milestonesError }, { data: phases, error: phasesError }] = await Promise.all([
    supabase.from("project_tasks").select("status, weight").eq("project_id", projectId),
    supabase
      .from("project_milestones")
      .select("weight, status, progress_percent")
      .eq("project_id", projectId),
    supabase
      .from("project_phases")
      .select("weight, status, progress_percent")
      .eq("project_id", projectId),
  ])

  if (tasksError) throw tasksError
  if (milestonesError) throw milestonesError
  if (phasesError) throw phasesError

  const taskRows = tasks ?? []
  const milestoneRows = milestones ?? []
  const phaseRows = phases ?? []

  const taskTotalWeight = taskRows.reduce((acc, task) => acc + Number(task.weight ?? 0), 0)
  const taskCompletedWeight = taskRows.filter((task) => task.status === "done").reduce((acc, task) => acc + Number(task.weight ?? 0), 0)
  const taskProgress = taskTotalWeight > 0 ? Math.min((taskCompletedWeight / taskTotalWeight) * 100, 100) : 0

  const milestoneProgress = computeWeightProgress(milestoneRows.map((row) => ({ weight: Number(row.weight ?? 1), status: row.status, progress_percent: row.progress_percent })))
  const phaseProgress = computeWeightProgress(phaseRows.map((row) => ({ weight: Number(row.weight ?? 1), status: row.status, progress_percent: row.progress_percent })))

  const progressSources = [
    { value: taskProgress, active: taskRows.length > 0 },
    { value: milestoneProgress.ratio * 100, active: milestoneProgress.totalWeight > 0 },
    { value: phaseProgress.ratio * 100, active: phaseProgress.totalWeight > 0 },
  ].filter((entry) => entry.active)

  const combinedProgress =
    progressSources.length > 0 ? progressSources.reduce((acc, entry) => acc + entry.value, 0) / progressSources.length : 0

  const { error: updateError } = await supabase
    .from("projects")
    .update({ progress_percent: combinedProgress, updated_at: new Date().toISOString() })
    .eq("id", projectId)
  if (updateError) throw updateError
  return combinedProgress
}
