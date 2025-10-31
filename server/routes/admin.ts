import { Buffer } from "node:buffer"
import { Router } from "express"
import { z } from "zod"

import { getAdminClientsOverview } from "../../lib/supabase/admin-data"
import { getAdminDashboardData } from "../../lib/supabase/admin-dashboard"
import {
  createProjectEvent,
  deleteProjectEvent,
  getAdminGlobalEvents,
  getAdminProjectEventsBySlug,
  listProjectCalendarSummaries,
  projectEventWriteSchema,
  updateProjectEvent,
} from "../../lib/supabase/project-events"
import {
  addTaskToCalendar,
  bulkUpdateProjectTasks,
  createProjectTask,
  deleteProjectTask,
  fetchTaskActivity,
  listProjectTasks,
  reorderProjectTasks,
  updateProjectTask,
  recalculateProjectProgress,
} from "../../lib/supabase/project-tasks"
import { createServerSupabaseClient } from "../../lib/supabase/server"
import { getDocuments } from "../../lib/supabase/queries"
import { createAdminTeamMember, listAdminTeamMembers } from "../../lib/supabase/admin-team"
import {
  PROJECT_TEAM_ROLES,
  assignProjectTeamRoles,
  archiveAdminProject,
  createAdminProjectRecord,
  createProjectDocument,
  createProjectMilestone,
  createProjectPhase,
  createProjectPhoto,
  deleteAdminProjectRecord,
  deleteProjectDocument,
  deleteProjectMilestone,
  deleteProjectPhase,
  deleteProjectPhoto,
  duplicateAdminProject,
  getAdminProjectDetail,
  listAdminProjects,
  recordProjectTimelineEvent,
  reorderProjectMilestones,
  reorderProjectPhases,
  reorderProjectPhotos,
  updateAdminProjectBasics,
  updateProjectDocument,
  updateProjectMilestone,
  updateProjectPhase,
  updateProjectPhoto,
} from "../../lib/supabase/admin-projects"
import { requireAdminSession } from "../services/session"
import { asyncHandler } from "../utils/async-handler"
import { isProjectTaskStatus } from "../../types/project-tasks"

type ProjectTeamRole = (typeof PROJECT_TEAM_ROLES)[number]

const createClientSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email(),
})

const createTeamMemberSchema = z.object({
  fullName: z.string().min(3).max(120),
  role: z.string().min(2).max(80),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  phone: z
    .string()
    .min(6)
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  status: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
})

const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z
    .string()
    .max(120)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  code: z
    .string()
    .max(120)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  status: z
    .string()
    .max(80)
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : "en_progreso")),
  startDate: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  estimatedDelivery: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  locationCity: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  locationNotes: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  clientId: z.string().uuid().optional(),
  createNewClient: z.boolean().optional(),
  newClientFullName: z.string().optional(),
  newClientEmail: z.string().optional(),
  managerId: z.string().uuid().optional(),
  teamAssignments: z.record(z.string(), z.string().uuid().nullable()).optional(),
})

const updateProjectSchema = createProjectSchema.partial()

const assignmentsSchema = z.object({
  assignments: z.record(z.string(), z.string().uuid().nullable()),
})

const optionalDate = z
  .string()
  .optional()
  .transform((value) => (typeof value === "string" && value.length > 0 ? value : null))

const STORAGE_BUCKET = "project-assets"

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

async function uploadProjectAsset(projectId: string, type: "documents" | "photos", fileName: string, base64Content: string, contentType: string) {
  const supabase = createServerSupabaseClient()
  const base64 = base64Content.includes(",") ? base64Content.split(",").pop() ?? base64Content : base64Content
  const buffer = Buffer.from(base64, "base64")
  const safeName = slugifyName(fileName || `${Date.now()}`)
  const path = `${type}/${projectId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, { contentType, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { storagePath: path, publicUrl: data.publicUrl }
}

function isMissingRelationError(error: unknown, relation?: string) {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? (error as Record<string, unknown>).code : undefined
  if (code !== "42P01") return false
  if (!relation) return true
  const message = JSON.stringify(error)
  return message.toLowerCase().includes(relation.toLowerCase())
}

const SCHEMA_HINT =
  "Faltan tablas o políticas en Supabase. Ejecuta las migraciones de supabase/schema.sql (supabase db push) y reinicia la API."

const milestoneSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  scheduledStart: optionalDate,
  scheduledEnd: optionalDate,
  actualDate: optionalDate,
  weight: z.number().min(0.25).max(20).optional(),
  status: z.string().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
})

const phaseSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
  expectedStart: optionalDate,
  expectedEnd: optionalDate,
  actualEnd: optionalDate,
  weight: z.number().min(0.25).max(20).optional(),
  status: z.string().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
})

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    }),
  ),
})

const documentUploadSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  fileType: z.string().min(1),
  sizeLabel: z.string().optional(),
  notifyClient: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  fileContent: z.string().min(10),
})

const documentUpdateSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  fileType: z.string().optional(),
  sizeLabel: z.string().optional(),
  notifyClient: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

const photoUploadSchema = z.object({
  caption: z.string().optional(),
  takenAt: optionalDate,
  tags: z.array(z.string()).optional(),
  isCover: z.boolean().optional(),
  fileType: z.string().min(1),
  fileContent: z.string().min(10),
})

const photoUpdateSchema = z.object({
  caption: z.string().optional(),
  takenAt: optionalDate,
  tags: z.array(z.string()).optional(),
  isCover: z.boolean().optional(),
})

const timelineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  eventType: z.string().optional(),
})

function normalizeDateTime(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.toISOString()
}

function parseEventPayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return { success: false as const, error: "invalid" }
  }

  const raw = body as Record<string, unknown>

  const normalized = {
    ...raw,
    startsAt: normalizeDateTime(raw.startsAt) ?? raw.startsAt,
    endsAt: raw.endsAt === null ? null : normalizeDateTime(raw.endsAt) ?? raw.endsAt,
  }

  const parsed = projectEventWriteSchema.safeParse(normalized)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors }
  }
  return { success: true as const, data: parsed.data }
}

const router = Router()

router.use(
  asyncHandler(async (request, _response, next) => {
    requireAdminSession(request)
    next()
  }),
)

router.get(
  "/dashboard",
  asyncHandler(async (request, response) => {
    const status = typeof request.query.status === "string" && request.query.status.length > 0 ? request.query.status : undefined
    const managerId =
      typeof request.query.managerId === "string" && request.query.managerId.length > 0 ? request.query.managerId : undefined

    const data = await getAdminDashboardData({ status, managerId })

    response.json(data)
  }),
)

router.get(
  "/projects/calendars",
  asyncHandler(async (_request, response) => {
    const projects = await listProjectCalendarSummaries()
    response.json({ projects })
  }),
)

router.get(
  "/events",
  asyncHandler(async (request, response) => {
    const slug = typeof request.query.project === "string" ? request.query.project : null
    if (!slug) {
      response.status(400).json({ message: "Parámetro 'project' es obligatorio" })
      return
    }

    const result = await getAdminProjectEventsBySlug(slug)
    if (!result) {
      response.status(404).json({ message: "Proyecto no encontrado" })
      return
    }

    response.json(result)
  }),
)

router.get(
  "/events/global",
  asyncHandler(async (_request, response) => {
    const events = await getAdminGlobalEvents()
    response.json({ events })
  }),
)

router.post(
  "/events",
  asyncHandler(async (request, response) => {
    const payload = parseEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: payload.error })
      return
    }

    const session = requireAdminSession(request)
    const event = await createProjectEvent(payload.data, session.userId)
    response.status(201).json(event)
  }),
)

router.put(
  "/events/:eventId",
  asyncHandler(async (request, response) => {
    const payload = parseEventPayload(request.body)
    if (!payload.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: payload.error })
      return
    }

    const eventId = request.params.eventId
    const event = await updateProjectEvent(eventId, payload.data)
    response.json(event)
  }),
)

router.delete(
  "/events/:eventId",
  asyncHandler(async (request, response) => {
    await deleteProjectEvent(request.params.eventId)
    response.status(204).end()
  }),
)

router.get(
  "/documents",
  asyncHandler(async (request, response) => {
    const slug = typeof request.query.project === "string" ? request.query.project : undefined
    const data = await getDocuments(slug)
    response.json(data)
  }),
)

router.get(
  "/clients",
  asyncHandler(async (_request, response) => {
    const clients = await getAdminClientsOverview()
    response.json({ clients })
  }),
)

router.get(
  "/team-members",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const view = typeof request.query.view === "string" ? request.query.view : "compact"
    const search = typeof request.query.search === "string" ? request.query.search : undefined
    const roles = typeof request.query.roles === "string" ? request.query.roles.split(",").map((value) => value.trim()).filter(Boolean) : undefined
    const status = typeof request.query.status === "string" ? request.query.status.split(",").map((value) => value.trim()).filter(Boolean) : undefined

    const result = await listAdminTeamMembers({
      search,
      roles,
      status,
    })

    response.json({
      teamMembers: result.members.map((member) => ({
        id: member.id,
        name: member.fullName,
        role: member.role,
        email: member.email,
        phone: member.phone,
        status: member.status,
        createdAt: member.createdAt,
        projects: view === "directory" ? member.projects : undefined,
      })),
      totals: result.totals,
    })
  }),
)

router.post(
  "/team-members",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const parsed = createTeamMemberSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({ message: "Datos del equipo inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    try {
      const member = await createAdminTeamMember(parsed.data)

      response.status(201).json({
        teamMember: {
          id: member.id,
          name: member.fullName,
          role: member.role,
          email: member.email,
          phone: member.phone,
          status: member.status,
          createdAt: member.createdAt,
          projects: [],
        },
      })
    } catch (error) {
      if (isMissingRelationError(error, "team_members")) {
        response.status(500).json({ message: SCHEMA_HINT })
        return
      }
      throw error
    }
  }),
)

router.post(
  "/clients",
  asyncHandler(async (request, response) => {
    const parsed = createClientSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de cliente inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: parsed.data.fullName.trim(),
        email: parsed.data.email.trim().toLowerCase(),
      })
      .select("id, full_name, email")
      .maybeSingle()

    if (error || !data) {
      const isUnique = error?.code === "23505"
      response.status(isUnique ? 409 : 500).json({
        message: isUnique ? "Ya existe un cliente con este correo." : "No se pudo crear el cliente.",
      })
      return
    }

    response.status(201).json({ client: data })
  }),
)

router.get(
  "/projects",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)

    const status = typeof request.query.status === "string" ? request.query.status.split(",").map((value) => value.trim()).filter(Boolean) : undefined
    const allowedSortFields = new Set(["name", "progress", "start_date", "estimated_delivery", "status", "updated_at"])
    const allowedSortOrders = new Set(["asc", "desc"])

    const pageParam = typeof request.query.page === "string" ? Number.parseInt(request.query.page, 10) : undefined
    const pageSizeParam = typeof request.query.pageSize === "string" ? Number.parseInt(request.query.pageSize, 10) : undefined

    const filters = {
      search: typeof request.query.search === "string" ? request.query.search : undefined,
      status,
      managerId: typeof request.query.managerId === "string" && request.query.managerId.length > 0 ? request.query.managerId : undefined,
      startDateFrom: typeof request.query.startDateFrom === "string" ? request.query.startDateFrom : undefined,
      startDateTo: typeof request.query.startDateTo === "string" ? request.query.startDateTo : undefined,
      endDateFrom: typeof request.query.endDateFrom === "string" ? request.query.endDateFrom : undefined,
      endDateTo: typeof request.query.endDateTo === "string" ? request.query.endDateTo : undefined,
      sortBy: typeof request.query.sortBy === "string" && allowedSortFields.has(request.query.sortBy) ? (request.query.sortBy as any) : undefined,
      sortOrder: typeof request.query.sortOrder === "string" && allowedSortOrders.has(request.query.sortOrder) ? (request.query.sortOrder as any) : undefined,
      page: Number.isFinite(pageParam) ? pageParam : undefined,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : undefined,
    }

    const result = await listAdminProjects(filters)
    response.json(result)
  }),
)

router.post(
  "/projects",
  asyncHandler(async (request, response) => {
    const parsed = createProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de proyecto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const supabase = createServerSupabaseClient()
    const data = parsed.data

    try {
      let clientId = data.clientId

      if (data.createNewClient) {
        const clientName = data.newClientFullName?.trim()
        const clientEmail = data.newClientEmail?.trim().toLowerCase()

        if (!clientName || !clientEmail) {
          response.status(400).json({
            message: "Introduce el nombre y correo del nuevo cliente.",
            errors: {
              newClientFullName: !clientName ? ["Introduce el nombre del cliente"] : undefined,
              newClientEmail: !clientEmail ? ["Introduce el correo del cliente"] : undefined,
            },
          })
          return
        }

        const { data: insertedClient, error: insertClientError } = await supabase
          .from("clients")
          .insert({ full_name: clientName, email: clientEmail })
          .select("id")
          .maybeSingle()

        if (insertClientError || !insertedClient) {
          const isUnique = insertClientError?.code === "23505"
          response.status(isUnique ? 409 : 500).json({
            message: isUnique
              ? "El correo indicado ya está asociado a un cliente existente."
              : "No se pudo crear el cliente asociado.",
          })
          return
        }

        clientId = insertedClient.id
      }

      if (!clientId) {
        response.status(400).json({
          message: "Selecciona un cliente o crea uno nuevo.",
          errors: { clientId: ["Selecciona un cliente"] },
        })
        return
      }

      const assignments: Partial<Record<ProjectTeamRole, string | null>> = {}

      if (data.teamAssignments) {
        for (const [role, memberId] of Object.entries(data.teamAssignments)) {
          if (PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole)) {
            assignments[role as ProjectTeamRole] = memberId && memberId.length > 0 ? memberId : null
          }
        }
      }

      if (data.managerId && assignments.director === undefined) {
        assignments.director = data.managerId
      }

      const project = await createAdminProjectRecord({
        name: data.name,
        slug: data.slug,
        clientId,
        code: data.code ?? null,
        status: data.status ?? "en_progreso",
        startDate: data.startDate ?? null,
        estimatedDelivery: data.estimatedDelivery ?? null,
        locationCity: data.locationCity ?? null,
        locationNotes: data.locationNotes ?? null,
        managerId: data.managerId ?? null,
        assignments,
      })

      response.status(201).json({ message: "Proyecto creado", project })
    } catch (error) {
      if (
        isMissingRelationError(error, "projects") ||
        isMissingRelationError(error, "project_team_members") ||
        isMissingRelationError(error, "team_members")
      ) {
        response.status(500).json({ message: SCHEMA_HINT })
        return
      }
      throw error
    }
  }),
)

router.patch(
  "/projects/:projectId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = updateProjectSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const payload = parsed.data

    const assignments: Partial<Record<ProjectTeamRole, string | null>> | undefined = payload.teamAssignments
      ? Object.fromEntries(
          Object.entries(payload.teamAssignments)
            .filter(([role]) => PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole))
            .map(([role, memberId]) => [role as ProjectTeamRole, memberId && memberId.length > 0 ? memberId : null]),
        )
      : undefined

    await updateAdminProjectBasics(projectId, {
      name: payload.name,
      slug: payload.slug,
      code: payload.code,
      status: payload.status,
      startDate: payload.startDate,
      estimatedDelivery: payload.estimatedDelivery,
      locationCity: payload.locationCity,
      locationNotes: payload.locationNotes,
      managerId: payload.managerId,
      assignments,
    })

    response.json({ message: "Proyecto actualizado" })
  }),
)

router.post(
  "/projects/:projectId/team",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = assignmentsSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de equipo inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const assignments = Object.fromEntries(
      Object.entries(parsed.data.assignments)
        .filter(([role]) => PROJECT_TEAM_ROLES.includes(role as ProjectTeamRole))
        .map(([role, memberId]) => [role as ProjectTeamRole, memberId ?? null]),
    ) as Partial<Record<ProjectTeamRole, string | null>>

    await assignProjectTeamRoles(projectId, assignments)
    response.json({ message: "Equipo actualizado" })
  }),
)

router.post(
  "/projects/:projectId/archive",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    await archiveAdminProject(projectId)
    response.json({ message: "Proyecto archivado" })
  }),
)

router.post(
  "/projects/:projectId/restore",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    await updateAdminProjectBasics(projectId, { status: "en_progreso" })
    response.json({ message: "Proyecto restaurado" })
  }),
)

router.post(
  "/projects/:projectId/duplicate",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const project = await duplicateAdminProject(projectId)
    response.status(201).json({ project })
  }),
)

router.delete(
  "/projects/:projectId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    await deleteAdminProjectRecord(projectId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/milestones",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = milestoneSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de hito inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    const id = await createProjectMilestone(projectId, parsed.data)
    await recordProjectTimelineEvent(projectId, {
      title: `Nuevo hito: ${parsed.data.title}`,
      description: parsed.data.summary ?? null,
      eventType: "milestone_created",
      status: "info",
    })
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/milestones/:milestoneId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { milestoneId } = request.params
    const parsed = milestoneSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de hito inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectMilestone(milestoneId, parsed.data)
    response.json({ message: "Hito actualizado" })
  }),
)

router.post(
  "/projects/:projectId/milestones/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectMilestones(projectId, parsed.data.items)
    response.json({ message: "Hitos reordenados" })
  }),
)

router.delete(
  "/projects/:projectId/milestones/:milestoneId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { milestoneId } = request.params
    await deleteProjectMilestone(milestoneId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/phases",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = phaseSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de fase inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    const id = await createProjectPhase(projectId, parsed.data)
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/phases/:phaseId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { phaseId } = request.params
    const parsed = phaseSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de fase inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectPhase(phaseId, parsed.data)
    response.json({ message: "Fase actualizada" })
  }),
)

router.post(
  "/projects/:projectId/phases/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectPhases(projectId, parsed.data.items)
    response.json({ message: "Fases reordenadas" })
  }),
)

router.delete(
  "/projects/:projectId/phases/:phaseId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { phaseId } = request.params
    await deleteProjectPhase(phaseId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/documents",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const parsed = documentUploadSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de documento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const upload = await uploadProjectAsset(projectId, "documents", parsed.data.name, parsed.data.fileContent, parsed.data.fileType)
    const id = await createProjectDocument(projectId, {
      name: parsed.data.name,
      category: parsed.data.category,
      fileType: parsed.data.fileType,
      sizeLabel: parsed.data.sizeLabel ?? null,
      storagePath: upload.storagePath,
      notifyClient: parsed.data.notifyClient ?? false,
      tags: parsed.data.tags ?? [],
      notes: parsed.data.notes ?? null,
      uploadedBy: parsed.data.uploadedBy ?? session.userId,
    })

    await recordProjectTimelineEvent(projectId, {
      title: `Nuevo documento: ${parsed.data.name}`,
      eventType: "document_uploaded",
      status: "info",
    })

    response.status(201).json({ id, url: upload.publicUrl })
  }),
)

router.patch(
  "/projects/:projectId/documents/:documentId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { documentId } = request.params
    const parsed = documentUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de documento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectDocument(documentId, parsed.data)
    response.json({ message: "Documento actualizado" })
  }),
)

router.delete(
  "/projects/:projectId/documents/:documentId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { documentId } = request.params
    await deleteProjectDocument(documentId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/photos",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = photoUploadSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de foto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }

    const filename = parsed.data.caption ? `${parsed.data.caption}.jpg` : `foto-${Date.now()}.jpg`
    const upload = await uploadProjectAsset(projectId, "photos", filename, parsed.data.fileContent, parsed.data.fileType)
    const id = await createProjectPhoto(projectId, {
      url: upload.publicUrl,
      caption: parsed.data.caption ?? null,
      takenAt: parsed.data.takenAt ?? null,
      storagePath: upload.storagePath,
      tags: parsed.data.tags ?? [],
      isCover: parsed.data.isCover ?? false,
    })

    if (parsed.data.isCover) {
      const supabase = createServerSupabaseClient()
      await supabase
        .from("project_photos")
        .update({ is_cover: false })
        .eq("project_id", projectId)
        .neq("id", id)
    }

    await recordProjectTimelineEvent(projectId, {
      title: "Nueva foto del proyecto",
      eventType: "photo_uploaded",
      status: "info",
    })

    response.status(201).json({ id, url: upload.publicUrl })
  }),
)

router.patch(
  "/projects/:projectId/photos/:photoId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { photoId, projectId } = request.params
    const parsed = photoUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de foto inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await updateProjectPhoto(photoId, parsed.data)
    if (parsed.data.isCover) {
      const supabase = createServerSupabaseClient()
      await supabase
        .from("project_photos")
        .update({ is_cover: false })
        .eq("project_id", projectId)
        .neq("id", photoId)
    }
    response.json({ message: "Foto actualizada" })
  }),
)

router.post(
  "/projects/:projectId/photos/reorder",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = reorderSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Orden inválido", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await reorderProjectPhotos(projectId, parsed.data.items)
    response.json({ message: "Fotos reordenadas" })
  }),
)

router.delete(
  "/projects/:projectId/photos/:photoId",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { photoId } = request.params
    await deleteProjectPhoto(photoId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/timeline",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const parsed = timelineSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: "Datos de evento inválidos", errors: parsed.error.flatten().fieldErrors })
      return
    }
    await recordProjectTimelineEvent(projectId, parsed.data)
    response.status(201).json({ message: "Evento registrado" })
  }),
)

router.get(
  "/projects/:projectRef",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectRef } = request.params
    const project = await getAdminProjectDetail(projectRef)
    response.json({ project })
  }),
)

router.get(
  "/projects/:projectId/tasks",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { projectId } = request.params
    const { search, status, assigneeId, startDateFrom, startDateTo, dueDateFrom, dueDateTo, page, pageSize } = request.query

    const statusList = typeof status === "string" && status.length > 0 ? status.split(",").map((item) => item.trim()) : undefined

    const data = await listProjectTasks(projectId, {
      search: typeof search === "string" ? search : undefined,
      status: statusList,
      assigneeId: typeof assigneeId === "string" ? assigneeId : undefined,
      startDateFrom: typeof startDateFrom === "string" ? startDateFrom : undefined,
      startDateTo: typeof startDateTo === "string" ? startDateTo : undefined,
      dueDateFrom: typeof dueDateFrom === "string" ? dueDateFrom : undefined,
      dueDateTo: typeof dueDateTo === "string" ? dueDateTo : undefined,
      page: typeof page === "string" ? Number(page) : undefined,
      pageSize: typeof pageSize === "string" ? Number(pageSize) : undefined,
    })

    response.json(data)
  }),
)

router.post(
  "/projects/:projectId/tasks",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const id = await createProjectTask(projectId, request.body ?? {}, session.userId)
    response.status(201).json({ id })
  }),
)

router.patch(
  "/projects/:projectId/tasks/:taskId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await updateProjectTask(taskId, request.body ?? {}, session.userId)
    response.status(204).end()
  }),
)

router.delete(
  "/projects/:projectId/tasks/:taskId",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await deleteProjectTask(taskId, session.userId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/reorder",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const items = Array.isArray(request.body?.items) ? request.body.items : []
    await reorderProjectTasks(projectId, items, session.userId)
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/recalculate",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const progress = await recalculateProjectProgress(projectId, session.userId)
    response.json({ progress })
  }),
)

router.post(
  "/projects/:projectId/tasks/bulk",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { projectId } = request.params
    const payload = (request.body ?? {}) as {
      ids?: unknown
      status?: string
      assigneeId?: string | null
    }
    const ids = Array.isArray(payload.ids) ? (payload.ids as string[]) : []
    const status = typeof payload.status === "string" && isProjectTaskStatus(payload.status) ? payload.status : undefined
    await bulkUpdateProjectTasks(
      projectId,
      {
        ids,
        status,
        assigneeId: typeof payload.assigneeId === "string" || payload.assigneeId === null ? payload.assigneeId : undefined,
      },
      session.userId,
    )
    response.status(204).end()
  }),
)

router.post(
  "/projects/:projectId/tasks/:taskId/calendar",
  asyncHandler(async (request, response) => {
    const session = requireAdminSession(request)
    const { taskId } = request.params
    await addTaskToCalendar(taskId, session.userId)
    response.status(204).end()
  }),
)

router.get(
  "/projects/:projectId/tasks/:taskId/activity",
  asyncHandler(async (request, response) => {
    requireAdminSession(request)
    const { taskId } = request.params
    const activity = await fetchTaskActivity(taskId)
    response.json({ activity })
  }),
)

export const adminRouter = router
