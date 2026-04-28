import { createServerSupabaseClient } from "./server"
import type {
  AdminClientActivity,
  AdminClientDetails,
  AdminClientDocument,
  AdminClientListFilters,
  AdminClientListItem,
  AdminClientListResponse,
  AdminClientMessage,
  AdminClientNote,
  AdminClientStats,
  AdminClientTeamMember,
} from "@app/types/admin"
import { sendEmailChangeNoticeEmail } from "../../server/services/email"

const DEFAULT_PAGE_SIZE = 20

const CLIENT_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  nuevo: "Nuevo",
  con_incidencias: "Con incidencias",
}

function sanitizeSearch(value?: string): string | undefined {
  if (!value) return undefined
  const cleaned = value.trim().replace(/[%]/g, "")
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listAdminClients(filters: AdminClientListFilters = {}): Promise<AdminClientListResponse> {
  const supabase = createServerSupabaseClient()

  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 5), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const search = sanitizeSearch(filters.search)

  let query = supabase
    .from("clients")
    .select(
      [
        "id",
        "full_name",
        "email",
        "phone",
        "client_type",
        "company",
        "status",
        "created_at",
        "updated_at",
        "last_active_at",
        "tags",
        "projects(id, name, status, progress_percent, updated_at, project_team_members(team_member_id, team_members(full_name)))",
      ].join(","),
      { count: "exact" },
    )

  if (search) {
    query = query.or([`full_name.ilike.%${search}%`, `email.ilike.%${search}%`].join(","))
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status)
  }

  if (filters.clientType) {
    query = query.eq("client_type", filters.clientType)
  }

  if (filters.startDateFrom) {
    query = query.gte("created_at", filters.startDateFrom)
  }

  if (filters.startDateTo) {
    query = query.lte("created_at", filters.startDateTo)
  }

  const sortBy = filters.sortBy ?? "created_at"
  const sortOrder = filters.sortOrder ?? "desc"

  const sortColumn = (() => {
    switch (sortBy) {
      case "name":
        return "full_name"
      case "projects":
        return "projects"
      case "created_at":
        return "created_at"
      case "status":
        return "status"
      default:
        return "updated_at"
    }
  })()

  query = query.order(sortColumn === "projects" ? "created_at" : sortColumn, { ascending: sortOrder === "asc" });

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  const rows = (data ?? []) as Array<any>

  const clients: AdminClientListItem[] = rows.map((client) => {
    const projectList = Array.isArray(client.projects) ? client.projects : []
    const projectsCount = projectList.length
    const sortedProjects = [...projectList].sort((a, b) => new Date(b.updated_at ?? b.created_at ?? b.id).getTime() - new Date(a.updated_at ?? a.created_at ?? a.id).getTime())
    const lastProject = sortedProjects[0]
    const lastProjectStatus = lastProject?.status ?? null

    return {
      id: client.id,
      fullName: client.full_name,
      email: client.email,
      phone: client.phone ?? null,
      clientType: client.client_type ?? null,
      company: client.company ?? null,
      status: client.status ?? "activo",
      createdAt: client.created_at,
      lastActiveAt: client.last_active_at ?? client.updated_at ?? client.created_at,
      projectsCount,
      lastProjectId: lastProject?.id ?? null,
      lastProjectName: lastProject?.name ?? null,
      lastProjectStatus,
      tags: Array.isArray(client.tags) ? client.tags : [],
    }
  })

  const statusAggregation: Record<string, number> = {}
  clients.forEach((client) => {
    statusAggregation[client.status] = (statusAggregation[client.status] ?? 0) + 1
  })

  const { data: typeRows } = await supabase
    .from("clients")
    .select("client_type")
    .neq("client_type", null)

  return {
    clients,
    pagination: {
      page,
      pageSize,
      total: count ?? clients.length,
    },
    filters: {
      statuses: Object.entries(statusAggregation).map(([value, total]) => ({
        value,
        label: CLIENT_STATUS_LABELS[value] ?? value,
        count: total,
      })),
      types: (typeRows ?? []).map((row) => ({ value: row.client_type, label: row.client_type })),
    },
  }
}

export async function getAdminClientDetail(clientId: string): Promise<AdminClientDetails> {
  const supabase = createServerSupabaseClient()

  const clientPromise = supabase
    .from("clients")
    .select("id, full_name, email, phone, client_type, company, status, address, city, country, tags, last_active_at, created_at, updated_at")
    .eq("id", clientId)
    .maybeSingle()

  const projectsPromise = supabase
    .from("projects")
    .select("id, name, status, progress_percent, start_date, estimated_delivery, updated_at, project_team_members(team_member_id, team_members(full_name))")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })

  const notesPromise = supabase
    .from("client_notes")
    .select("id, title, content, tags, is_pinned, author_id, created_at, updated_at")
    .eq("client_id", clientId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  const activityPromise = supabase
    .from("client_activity")
    .select("id, event_type, title, description, metadata, related_project_id, occurred_at")
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false })
    .limit(100)

  const documentsPromise = supabase
    .from("client_documents")
    .select("id, name, category, file_type, size_label, storage_path, url, uploaded_at, uploaded_by, project_id, tags, notes")
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false })

  const [clientResult, projectsResult, notesResult, activityResult, documentsResult] = await Promise.all([
    clientPromise,
    projectsPromise,
    notesPromise,
    activityPromise,
    documentsPromise,
  ])

  if (clientResult.error) throw clientResult.error
  if (!clientResult.data) {
    const notFound = new Error("Cliente no encontrado")
    ;(notFound as Error & { status?: number }).status = 404
    throw notFound
  }

  // Core: el cliente y sus proyectos sí son obligatorios. Si falla uno, la
  // ficha no tiene sentido y lanzamos.
  if (projectsResult.error) throw projectsResult.error

  // Secciones accesorias (notas, actividad, documentos) son defensivas: si la
  // tabla no existe o la query falla, seguimos con array vacío en vez de
  // romper toda la ficha. Facilita el rollout incremental del schema.
  if (notesResult.error) {
    console.warn("[admin-clients] client_notes no disponible:", notesResult.error.message)
  }
  if (activityResult.error) {
    console.warn("[admin-clients] client_activity no disponible:", activityResult.error.message)
  }
  if (documentsResult.error) {
    console.warn("[admin-clients] client_documents no disponible:", documentsResult.error.message)
  }

  const clientRow = clientResult.data as any
  const projectRows = (projectsResult.data ?? []) as Array<any>
  const noteRows = (notesResult.error ? [] : notesResult.data ?? []) as Array<any>
  const activityRows = (activityResult.error ? [] : activityResult.data ?? []) as Array<any>
  const documentRows = (documentsResult.error ? [] : documentsResult.data ?? []) as Array<any>

  const projects = projectRows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    progressPercent: Number(row.progress_percent ?? 0),
    startDate: row.start_date ?? null,
    estimatedDelivery: row.estimated_delivery ?? null,
    updatedAt: row.updated_at ?? null,
    managerName: (Array.isArray(row.project_team_members) ? row.project_team_members[0]?.team_members?.full_name : null) ?? null,
  }))

  const totalProjects = projects.length
  // Flujo canónico: "activos" son las fases intermedias (diseño → ejecución),
  // "completados" el cierre. Ya no existe concepto de pausado en el enum;
  // devolvemos 0 hasta que decidamos añadirlo como metadato separado.
  const activeProjects = projects.filter(
    (project) =>
      project.status === "diseno" ||
      project.status === "presupuesto" ||
      project.status === "planificacion" ||
      project.status === "obra_ejecucion",
  ).length
  const pausedProjects = 0
  const completedProjects = projects.filter((project) => project.status === "cierre").length
  const lastProject = projects[0] ?? null

  const notes: AdminClientNote[] = noteRows.map((row) => ({
    id: row.id,
    title: row.title ?? null,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPinned: Boolean(row.is_pinned),
    authorId: row.author_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const activity: AdminClientActivity[] = activityRows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    description: row.description ?? null,
    metadata: row.metadata ?? null,
    relatedProjectId: row.related_project_id ?? null,
    occurredAt: row.occurred_at,
  }))

  const documents: AdminClientDocument[] = documentRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    fileType: row.file_type,
    sizeLabel: row.size_label ?? null,
    storagePath: row.storage_path ?? null,
    url: row.url ?? null,
    uploadedAt: row.uploaded_at,
    uploadedById: row.uploaded_by ?? null,
    projectId: row.project_id ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes ?? null,
  }))

  const projectIds = projects.map((project) => project.id)
  let messages: AdminClientMessage[] = []
  if (projectIds.length > 0) {
    const { data: messageRows, error: messagesError } = await supabase
      .from("project_messages")
      .select(
        "id, content, sent_at, sender_type, project_conversations!inner(project_id, projects!inner(id, name))",
      )
      .in("project_conversations.project_id", projectIds)
      .order("sent_at", { ascending: false })
      .limit(40)

    if (messagesError) {
      // Defensivo: si la query de mensajes falla, seguimos con [] en vez de
      // tumbar toda la ficha del cliente.
      console.warn("[admin-clients] project_messages no disponible:", messagesError.message)
    } else {
      messages = (messageRows ?? []).map((row: any) => ({
        id: row.id,
        content: row.content,
        sentAt: row.sent_at,
        senderType: row.sender_type,
        projectId: row.project_conversations?.project_id ?? null,
        projectName: row.project_conversations?.projects?.name ?? null,
      }))
    }
  }

  const stats: AdminClientStats = {
    totalProjects,
    activeProjects,
    pausedProjects,
    completedProjects,
    lastProjectName: lastProject?.name ?? null,
    lastProjectStatus: lastProject?.status ?? null,
    lastInteractionAt: activity[0]?.occurredAt ?? clientRow.last_active_at ?? clientRow.updated_at ?? clientRow.created_at,
    documentsTotal: documents.length,
    unreadMessages: messages.filter((message) => message.senderType === "client").length,
  }

  return {
    client: {
      id: clientRow.id,
      fullName: clientRow.full_name,
      email: clientRow.email,
      phone: clientRow.phone ?? null,
      clientType: clientRow.client_type ?? null,
      company: clientRow.company ?? null,
      status: clientRow.status ?? "activo",
      address: clientRow.address ?? null,
      city: clientRow.city ?? null,
      country: clientRow.country ?? null,
      tags: Array.isArray(clientRow.tags) ? clientRow.tags : [],
      lastActiveAt: clientRow.last_active_at ?? null,
      createdAt: clientRow.created_at,
      updatedAt: clientRow.updated_at,
    },
    stats,
    projects,
    activity,
    notes,
    documents,
    messages,
  }
}

export async function createAdminClientRecord(payload: { fullName: string; email: string; phone?: string | null; clientType?: string | null; company?: string | null; status?: string | null; city?: string | null; country?: string | null; tags?: string[] }) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ?? null,
      client_type: payload.clientType ?? null,
      company: payload.company ?? null,
      status: payload.status ?? "activo",
      city: payload.city ?? null,
      country: payload.country ?? null,
      tags: payload.tags ?? [],
    })
    .select("id")
    .maybeSingle()
  if (error || !data) throw error ?? new Error("No se pudo crear el cliente")
  return data
}

export async function updateAdminClientRecord(clientId: string, payload: Partial<{ fullName: string; email: string; phone: string | null; clientType: string | null; company: string | null; status: string | null; address: string | null; city: string | null; country: string | null; tags: string[]; lastActiveAt: string | null }>) {
  const supabase = createServerSupabaseClient()
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Capturamos email y nombre previos para detectar cambios y avisar al correo
  // antiguo (mitiga secuestros de cuenta). Solo consultamos si el payload
  // intenta tocar el email.
  let previousEmail: string | null = null
  let previousFullName: string | null = null
  if (payload.email !== undefined) {
    const { data: existing } = await supabase
      .from("clients")
      .select("email, full_name")
      .eq("id", clientId)
      .maybeSingle()
    previousEmail = existing?.email ?? null
    previousFullName = existing?.full_name ?? null
  }

  if (payload.fullName !== undefined) update.full_name = payload.fullName
  if (payload.email !== undefined) update.email = payload.email
  if (payload.phone !== undefined) update.phone = payload.phone
  if (payload.clientType !== undefined) update.client_type = payload.clientType
  if (payload.company !== undefined) update.company = payload.company
  if (payload.status !== undefined) update.status = payload.status
  if (payload.address !== undefined) update.address = payload.address
  if (payload.city !== undefined) update.city = payload.city
  if (payload.country !== undefined) update.country = payload.country
  if (payload.tags !== undefined) update.tags = payload.tags
  if (payload.lastActiveAt !== undefined) update.last_active_at = payload.lastActiveAt

  const { error } = await supabase.from("clients").update(update).eq("id", clientId)
  if (error) throw error

  // Propagamos el cambio de email a app_users para que el login siga
  // funcionando. Si no existe fila en app_users (cliente sin acceso) no pasa
  // nada: el update afecta a 0 filas.
  if (
    payload.email !== undefined &&
    previousEmail &&
    payload.email &&
    payload.email.toLowerCase() !== previousEmail.toLowerCase()
  ) {
    const newEmail = payload.email.toLowerCase()
    const { error: appUsersError } = await supabase
      .from("app_users")
      .update({ email: newEmail })
      .eq("email", previousEmail.toLowerCase())
    if (appUsersError) {
      console.error("[client-update] no se pudo propagar el email a app_users", appUsersError)
    }

    // Fire-and-forget: avisamos al correo antiguo para que pueda detectar un
    // cambio no autorizado. El nuevo correo ya verá el cambio al iniciar
    // sesión.
    void (async () => {
      try {
        await sendEmailChangeNoticeEmail({
          to: previousEmail!,
          name: previousFullName ?? "Cliente Terrazea",
          newEmail,
          changedAt: new Date().toISOString(),
        })
      } catch (emailError) {
        console.error("[client-update] fallo avisando del cambio de email", emailError)
      }
    })()
  }
}

export async function deleteAdminClientRecord(clientId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("clients").delete().eq("id", clientId)
  if (error) throw error
}

export async function createClientNote(clientId: string, payload: { title?: string | null; content: string; tags?: string[]; isPinned?: boolean; authorId?: string | null }) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      client_id: clientId,
      title: payload.title ?? null,
      content: payload.content,
      tags: payload.tags ?? [],
      is_pinned: payload.isPinned ?? false,
      author_id: payload.authorId ?? null,
    })
    .select("id")
    .maybeSingle()
  if (error || !data) throw error ?? new Error("No se pudo crear la nota")
  return data.id
}

export async function updateClientNote(noteId: string, payload: Partial<{ title: string | null; content: string; tags: string[]; isPinned: boolean }>) {
  const supabase = createServerSupabaseClient()
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.title !== undefined) update.title = payload.title
  if (payload.content !== undefined) update.content = payload.content
  if (payload.tags !== undefined) update.tags = payload.tags
  if (payload.isPinned !== undefined) update.is_pinned = payload.isPinned

  const { error } = await supabase.from("client_notes").update(update).eq("id", noteId)
  if (error) throw error
}

export async function deleteClientNote(noteId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId)
  if (error) throw error
}

export async function recordClientActivity(clientId: string, payload: { eventType: string; title: string; description?: string | null; relatedProjectId?: string | null; metadata?: Record<string, unknown> }) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("client_activity").insert({
    client_id: clientId,
    event_type: payload.eventType,
    title: payload.title,
    description: payload.description ?? null,
    related_project_id: payload.relatedProjectId ?? null,
    metadata: payload.metadata ?? null,
  })
  if (error) throw error
}

export async function createClientDocumentRecord(clientId: string, payload: { name: string; category: string; fileType: string; sizeLabel?: string | null; storagePath?: string | null; url?: string | null; projectId?: string | null; tags?: string[]; notes?: string | null; notifyClient?: boolean; uploadedBy?: string | null }) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: clientId,
      project_id: payload.projectId ?? null,
      name: payload.name,
      category: payload.category,
      file_type: payload.fileType,
      size_label: payload.sizeLabel ?? null,
      storage_path: payload.storagePath ?? null,
      url: payload.url ?? null,
      tags: payload.tags ?? [],
      notes: payload.notes ?? null,
      notify_client: payload.notifyClient ?? false,
      uploaded_by: payload.uploadedBy ?? null,
    })
    .select("id")
    .maybeSingle()
  if (error || !data) throw error ?? new Error("No se pudo registrar el documento")
  return data.id
}

export async function deleteClientDocument(documentId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("client_documents").delete().eq("id", documentId)
  if (error) throw error
}
