import { api } from "@app/lib/api"
import type {
  AdminClientOverview,
  AdminDashboardData,
  AdminProjectDetails,
  AdminProjectListFilters,
  AdminProjectListResponse,
  AdminProjectTask,
  AdminProjectTaskActivity,
  AdminProjectTaskListResponse,
  AdminProjectMilestone,
  AdminProjectPhase,
  AdminProjectDocument,
  AdminProjectPhoto,
  AdminProjectTeamMember,
  AdminPaymentRecord,
  AdminPaymentsResponse,
  AdminBudgetProduct,
  AdminBudgetRecord,
} from "@app/types/admin"
import type { DocumentsData } from "@app/types/documents"
import type { MessagesData } from "@/lib/supabase/queries"
import type { NotificationsFeed } from "@app/types/notifications"

export interface CreateAdminClientPayload {
  fullName: string
  email: string
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export interface CreateAdminProjectPayload {
  name: string
  slug?: string
  code?: string
  status?: string
  startDate?: string | null
  estimatedDelivery?: string | null
  locationCity?: string | null
  locationNotes?: string | null
  // URL de Google Maps (u otra) para pintar el pin del proyecto en el mapa del
  // overview. El backend lo guarda como map_url.
  locationMapUrl?: string | null
  clientId?: string
  createNewClient?: boolean
  newClientFullName?: string
  newClientEmail?: string
  managerId?: string
  teamAssignments?: Record<string, string | null>
}

export async function fetchAdminClients(): Promise<AdminClientOverview[]> {
  const response = await api.get<{ clients: AdminClientOverview[] }>("/admin/clients")
  return response.data.clients
}

export async function createAdminClient(payload: CreateAdminClientPayload) {
  const response = await api.post<{ client: { id: string; full_name: string; email: string } }>("/admin/clients", payload)
  return response.data.client
}

export async function fetchAdminProjects(filters?: AdminProjectListFilters): Promise<AdminProjectListResponse> {
  const response = await api.get<AdminProjectListResponse>("/admin/projects", {
    params: {
      ...filters,
      status: filters?.status?.join(","),
    },
  })

  return response.data
}

export async function createAdminProject(payload: CreateAdminProjectPayload) {
  const safePayload = {
    ...payload,
    locationNotes: payload.locationNotes ?? ""
  }
  await api.post("/admin/projects", safePayload)
}

export interface FetchAdminTeamMembersOptions {
  view?: "compact" | "directory"
  search?: string
  roles?: string[]
  status?: string[]
}

type AdminTeamMembersResponse = {
  teamMembers: AdminProjectTeamMember[]
  totals?: {
    total: number
    byRole: Record<string, number>
    byStatus: Record<string, number>
  }
}

function serializeTeamMemberFilters(options?: FetchAdminTeamMembersOptions) {
  if (!options) return undefined
  const params: Record<string, string> = {}
  if (options.view) params.view = options.view
  if (options.search) params.search = options.search
  if (options.roles && options.roles.length > 0) params.roles = options.roles.join(",")
  if (options.status && options.status.length > 0) params.status = options.status.join(",")
  return params
}

async function requestAdminTeamMembers(options?: FetchAdminTeamMembersOptions): Promise<AdminTeamMembersResponse> {
  const response = await api.get<AdminTeamMembersResponse>("/admin/team-members", {
    params: serializeTeamMemberFilters(options),
  })
  return response.data
}

export async function fetchAdminTeamMembers(options?: FetchAdminTeamMembersOptions): Promise<AdminProjectTeamMember[]> {
  const { teamMembers } = await requestAdminTeamMembers(options)
  return teamMembers
}

export async function fetchAdminTeamDirectory(options?: Omit<FetchAdminTeamMembersOptions, "view">): Promise<AdminTeamMembersResponse> {
  return requestAdminTeamMembers({ ...options, view: "directory" })
}

export interface CreateAdminTeamMemberPayload {
  fullName: string
  role: string
  email?: string
  phone?: string
  status?: string
}

export async function createAdminTeamMember(payload: CreateAdminTeamMemberPayload) {
  const response = await api.post<{ teamMember: AdminProjectTeamMember }>("/admin/team-members", payload)
  return response.data.teamMember
}

export async function fetchAdminProjectDetails(projectRef: string): Promise<AdminProjectDetails> {
  const response = await api.get<{ project: AdminProjectDetails }>(`/admin/projects/${projectRef}`)
  return response.data.project
}

export async function updateAdminProject(projectId: string, payload: Partial<CreateAdminProjectPayload>) {
  await api.patch(`/admin/projects/${projectId}`, payload)
}

export async function updateAdminProjectTeam(projectId: string, assignments: Record<string, string | null>) {
  await api.post(`/admin/projects/${projectId}/team`, { assignments })
}

export async function archiveAdminProject(projectId: string) {
  await api.post(`/admin/projects/${projectId}/archive`)
}

export async function restoreAdminProject(projectId: string) {
  await api.post(`/admin/projects/${projectId}/restore`)
}

export async function duplicateAdminProject(projectId: string) {
  const response = await api.post<{ project: { id: string; slug: string } }>(`/admin/projects/${projectId}/duplicate`)
  return response.data.project
}

export async function deleteAdminProject(projectId: string) {
  await api.delete(`/admin/projects/${projectId}`)
}

export async function createAdminProjectMilestone(projectId: string, payload: Partial<AdminProjectMilestone> & { title: string }) {
  const response = await api.post<{ id: string }>(`/admin/projects/${projectId}/milestones`, payload)
  return response.data.id
}

export async function updateAdminProjectMilestone(projectId: string, milestoneId: string, payload: Partial<AdminProjectMilestone>) {
  await api.patch(`/admin/projects/${projectId}/milestones/${milestoneId}`, payload)
}

export async function reorderAdminProjectMilestones(projectId: string, items: Array<{ id: string; sortOrder: number }>) {
  await api.post(`/admin/projects/${projectId}/milestones/reorder`, { items })
}

export async function deleteAdminProjectMilestone(projectId: string, milestoneId: string) {
  await api.delete(`/admin/projects/${projectId}/milestones/${milestoneId}`)
}

export interface CreateAdminPaymentPayload {
  projectId: string
  concept: string
  description?: string
  amount: number
  currency?: string
  dueDate?: string | null
  attachment?: {
    name: string
    fileType: string
    sizeLabel?: string
    content: string
  }
  budgetId?: string | null
}

export interface UpdateAdminPaymentPayload {
  concept?: string
  description?: string
  amount?: number
  currency?: string
  dueDate?: string | null
  attachment?: {
    name: string
    fileType: string
    sizeLabel?: string
    content: string
  }
}

export async function fetchAdminPayments(): Promise<AdminPaymentsResponse> {
  const response = await api.get<AdminPaymentsResponse>("/admin/payments")
  return response.data
}

export async function createAdminPayment(payload: CreateAdminPaymentPayload): Promise<AdminPaymentRecord> {
  const response = await api.post<{ payment: AdminPaymentRecord }>("/admin/payments", payload)
  return response.data.payment
}

export async function updateAdminPayment(paymentId: string, payload: UpdateAdminPaymentPayload): Promise<AdminPaymentRecord> {
  const response = await api.patch<{ payment: AdminPaymentRecord }>(`/admin/payments/${paymentId}`, payload)
  return response.data.payment
}

export async function deleteAdminPayment(paymentId: string) {
  await api.delete(`/admin/payments/${paymentId}`)
}

export async function createAdminProjectPhase(projectId: string, payload: Partial<AdminProjectPhase> & { name: string }) {
  const response = await api.post<{ id: string }>(`/admin/projects/${projectId}/phases`, payload)
  return response.data.id
}

export async function updateAdminProjectPhase(projectId: string, phaseId: string, payload: Partial<AdminProjectPhase>) {
  await api.patch(`/admin/projects/${projectId}/phases/${phaseId}`, payload)
}

export async function reorderAdminProjectPhases(projectId: string, items: Array<{ id: string; sortOrder: number }>) {
  await api.post(`/admin/projects/${projectId}/phases/reorder`, { items })
}

export async function deleteAdminProjectPhase(projectId: string, phaseId: string) {
  await api.delete(`/admin/projects/${projectId}/phases/${phaseId}`)
}

export interface UploadAdminProjectDocumentInput {
  file: File
  category: string
  notifyClient?: boolean
  tags?: string[]
  notes?: string
  uploadedBy?: string
  clientIds?: string[]
}

export async function uploadAdminProjectDocument(projectId: string, input: UploadAdminProjectDocumentInput) {
  const arrayBuffer = await input.file.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)
  const response = await api.post<{ id: string; url: string }>(`/admin/projects/${projectId}/documents`, {
    name: input.file.name,
    category: input.category,
    fileType: input.file.type || "application/octet-stream",
    sizeLabel: `${Math.round(input.file.size / 1024)} KB`,
    notifyClient: input.notifyClient ?? false,
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    uploadedBy: input.uploadedBy,
    clientIds: input.clientIds ?? [],
    fileContent: base64,
  })
  return response.data
}

export async function updateAdminProjectDocument(projectId: string, documentId: string, payload: Partial<AdminProjectDocument>) {
  await api.patch(`/admin/projects/${projectId}/documents/${documentId}`, payload)
}

export async function deleteAdminProjectDocument(projectId: string, documentId: string) {
  await api.delete(`/admin/projects/${projectId}/documents/${documentId}`)
}

export interface UploadAdminProjectPhotoInput {
  file: File
  caption?: string
  takenAt?: string
  tags?: string[]
  isCover?: boolean
}

export async function uploadAdminProjectPhoto(projectId: string, input: UploadAdminProjectPhotoInput) {
  const arrayBuffer = await input.file.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)
  const response = await api.post<{ id: string; url: string }>(`/admin/projects/${projectId}/photos`, {
    caption: input.caption,
    takenAt: input.takenAt,
    tags: input.tags ?? [],
    isCover: input.isCover ?? false,
    fileType: input.file.type || "image/jpeg",
    fileContent: base64,
  })
  return response.data
}

export async function updateAdminProjectPhoto(projectId: string, photoId: string, payload: Partial<AdminProjectPhoto>) {
  await api.patch(`/admin/projects/${projectId}/photos/${photoId}`, payload)
}

export async function reorderAdminProjectPhotos(projectId: string, items: Array<{ id: string; sortOrder: number }>) {
  await api.post(`/admin/projects/${projectId}/photos/reorder`, { items })
}

export async function deleteAdminProjectPhoto(projectId: string, photoId: string) {
  await api.delete(`/admin/projects/${projectId}/photos/${photoId}`)
}

export async function createAdminProjectTimelineEvent(projectId: string, payload: { title: string; description?: string; status?: string; eventType?: string }) {
  await api.post(`/admin/projects/${projectId}/timeline`, payload)
}

export async function fetchAdminDocuments(projectSlug?: string): Promise<DocumentsData> {
  const response = await api.get<DocumentsData>("/admin/documents", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })

  return response.data
}

export async function fetchAdminMessages(projectSlug?: string): Promise<MessagesData> {
  const response = await api.get<MessagesData>("/admin/messages", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

export async function createAdminConversation(projectSlug: string, teamMemberId: string): Promise<{ conversationId: string }> {
  const response = await api.post<{ conversationId: string }>("/admin/messages", {
    projectSlug,
    teamMemberId,
  })
  return response.data
}

export async function sendAdminMessage(conversationId: string, content: string) {
  await api.post(`/admin/messages/${conversationId}/messages`, {
    content,
  })
}

export interface AdminDashboardFilters {
  status?: string
  managerId?: string
}

export async function fetchAdminDashboard(filters?: AdminDashboardFilters): Promise<AdminDashboardData> {
  const response = await api.get<AdminDashboardData>("/admin/dashboard", {
    params: filters,
  })

  return response.data
}

export interface FetchProjectTasksParams {
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

export async function fetchAdminProjectTasks(
  projectId: string,
  params?: FetchProjectTasksParams,
): Promise<AdminProjectTaskListResponse> {
  const response = await api.get<AdminProjectTaskListResponse>(`/admin/projects/${projectId}/tasks`, {
    params: {
      ...params,
      status: params?.status?.join(","),
    },
  })
  return response.data
}

export interface SaveProjectTaskPayload {
  title: string
  description?: string
  status?: string
  weight: number
  assigneeId?: string | null
  startDate?: string | null
  dueDate?: string | null
  position?: number
  // Flags nuevos (opcionales hasta que los formularios los envíen todos).
  isMilestone?: boolean
  showInCalendar?: boolean
}

export async function createAdminProjectTask(projectId: string, payload: SaveProjectTaskPayload) {
  const response = await api.post<{ id: string }>(`/admin/projects/${projectId}/tasks`, payload)
  return response.data
}

export async function updateAdminProjectTask(projectId: string, taskId: string, payload: Partial<SaveProjectTaskPayload>) {
  await api.patch(`/admin/projects/${projectId}/tasks/${taskId}`, payload)
}

export async function deleteAdminProjectTask(projectId: string, taskId: string) {
  await api.delete(`/admin/projects/${projectId}/tasks/${taskId}`)
}

export interface ReorderTaskPayloadItem {
  id: string
  status: string
  position: number
}

export async function reorderAdminProjectTasks(projectId: string, items: ReorderTaskPayloadItem[]) {
  await api.post(`/admin/projects/${projectId}/tasks/reorder`, { items })
}

export async function recalculateAdminProjectProgress(projectId: string) {
  const response = await api.post<{ progress: number }>(`/admin/projects/${projectId}/tasks/recalculate`)
  return response.data.progress
}

export async function bulkUpdateAdminProjectTasks(
  projectId: string,
  payload: { ids: string[]; status?: string; assigneeId?: string | null },
) {
  await api.post(`/admin/projects/${projectId}/tasks/bulk`, payload)
}

export async function addProjectTaskToCalendar(projectId: string, taskId: string) {
  await api.post(`/admin/projects/${projectId}/tasks/${taskId}/calendar`)
}

export async function fetchAdminProjectTaskActivity(projectId: string, taskId: string): Promise<AdminProjectTaskActivity[]> {
  const response = await api.get<{ activity: AdminProjectTaskActivity[] }>(`/admin/projects/${projectId}/tasks/${taskId}/activity`)
  return response.data.activity
}

// Secciones protegidas por contraseña (deben coincidir con PROTECTED_SECTIONS
// del backend en server/services/section-access.ts).
export type ProtectedAdminSection = "budgets" | "payments"

export interface AdminSectionStatus {
  budgets: boolean
  payments: boolean
}

/** Consulta al backend qué secciones protegidas están desbloqueadas en esta sesión. */
export async function fetchAdminSectionStatus(): Promise<AdminSectionStatus> {
  const response = await api.get<{ sections: AdminSectionStatus }>("/admin/section-status")
  return response.data.sections
}

/** Valida la contraseña de una sección y, si es correcta, el backend emite la cookie firmada. */
export async function unlockAdminSection(section: ProtectedAdminSection, password: string) {
  const response = await api.post<{ success: boolean; section: ProtectedAdminSection }>(
    "/admin/section-unlock",
    { section, password },
  )
  return response.data
}

/** Revoca el acceso desbloqueado (si se quiere implementar "cerrar sección"). */
export async function lockAdminSection(section: ProtectedAdminSection) {
  await api.post("/admin/section-lock", { section })
}

export interface AdminNotificationsQuery {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  type?: string
}

export async function fetchAdminNotifications(options?: AdminNotificationsQuery): Promise<NotificationsFeed> {
  const params: Record<string, string | number | boolean> = {}
  if (options?.limit) params.limit = options.limit
  if (options?.offset) params.offset = options.offset
  if (options?.unreadOnly) params.unreadOnly = true
  if (options?.type) params.type = options.type
  const response = await api.get<NotificationsFeed>("/admin/notifications", {
    params: Object.keys(params).length > 0 ? params : undefined,
  })
  return response.data
}

export async function markAdminNotificationRead(notificationId: string) {
  await api.post(`/admin/notifications/${notificationId}/read`)
}

export async function markAllAdminNotificationsRead() {
  const response = await api.post<{ updated: number }>("/admin/notifications/mark-all-read")
  return response.data
}

// ---------------------------------------------------------------------------
// Colores por día en el calendario admin. Los endpoints existen en
// server/routes/admin.ts (/admin/calendar/day-colors*) y devuelven el shape
// que se replica aquí en el cliente.
// ---------------------------------------------------------------------------

export interface AdminDayColor {
  date: string
  color: string
  note: string | null
  updatedAt: string
}

export interface AdminDayColorPaletteEntry {
  value: string
  label: string
}

export async function fetchAdminDayColorPalette(): Promise<AdminDayColorPaletteEntry[]> {
  const response = await api.get<{ palette: AdminDayColorPaletteEntry[] }>(
    "/admin/calendar/day-colors/palette",
  )
  return response.data.palette ?? []
}

export async function fetchAdminDayColors(from: string, to: string): Promise<AdminDayColor[]> {
  const response = await api.get<{ colors: AdminDayColor[] }>("/admin/calendar/day-colors", {
    params: { from, to },
  })
  return response.data.colors ?? []
}

export async function upsertAdminDayColor(
  date: string,
  color: string,
  note: string | null,
): Promise<AdminDayColor> {
  const response = await api.put<{ dayColor: AdminDayColor }>(`/admin/calendar/day-colors/${date}`, {
    color,
    note,
  })
  return response.data.dayColor
}

export async function clearAdminDayColor(date: string): Promise<void> {
  await api.delete(`/admin/calendar/day-colors/${date}`)
}

// ---------------------------------------------------------------------------
// Tareas: detalle individual y resolución desde evento de calendario.
// ---------------------------------------------------------------------------

export async function fetchAdminProjectTask(
  projectId: string,
  taskId: string,
): Promise<import("@app/types/admin").AdminProjectTask> {
  const response = await api.get<{ task: import("@app/types/admin").AdminProjectTask }>(
    `/admin/projects/${projectId}/tasks/${taskId}`,
  )
  return response.data.task
}

export async function fetchAdminTaskFromCalendarEvent(
  eventId: string,
): Promise<import("@app/types/admin").AdminProjectTask | null> {
  try {
    const response = await api.get<{ task: import("@app/types/admin").AdminProjectTask | null }>(
      `/admin/calendar/events/${eventId}/task`,
    )
    return response.data.task ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Finalizar / reactivar proyecto (requieren confirmación por texto).
// ---------------------------------------------------------------------------

export async function finalizeAdminProject(projectId: string, confirmText: string): Promise<void> {
  await api.post(`/admin/projects/${projectId}/finalize`, { confirmText })
}

export async function reactivateAdminProject(
  projectId: string,
  confirmText: string,
  newStatus?: string,
): Promise<void> {
  await api.post(`/admin/projects/${projectId}/reactivate`, { confirmText, newStatus })
}

// ---------------------------------------------------------------------------
// Detalle de cliente (GET /admin/clients/:clientId) y asignación de proyectos
// a miembros del equipo (PUT /admin/team-members/:memberId/projects).
// ---------------------------------------------------------------------------

export async function fetchAdminClientDetail(
  clientId: string,
): Promise<import("@app/types/admin").AdminClientDetails> {
  // El backend devuelve el objeto AdminClientDetails completo
  // ({ client, stats, projects, activity, notes, ... }) sin wrapper extra.
  const response = await api.get<import("@app/types/admin").AdminClientDetails>(
    `/admin/clients/${clientId}`,
  )
  return response.data
}

export interface TeamMemberProjectAssignment {
  projectId: string
  role: string
  isPrimary?: boolean
}

export async function setTeamMemberProjects(
  memberId: string,
  assignments: TeamMemberProjectAssignment[],
): Promise<{ success: boolean; assigned: number }> {
  const response = await api.put<{ success: boolean; assigned: number }>(
    `/admin/team-members/${memberId}/projects`,
    { assignments },
  )
  return response.data
}

// Presupuestos: catálogo de productos ---------------------------------------

export interface CreateAdminBudgetProductPayload {
  name: string
  description?: string
  unitPrice: number
  tags?: string[]
  imageDataUrl?: string | null
}

export interface UpdateAdminBudgetProductPayload {
  name?: string
  description?: string | null
  unitPrice?: number
  tags?: string[]
  imageDataUrl?: string | null
}

export async function fetchAdminBudgetProducts(): Promise<AdminBudgetProduct[]> {
  const response = await api.get<{ products: AdminBudgetProduct[] }>("/admin/budget-products")
  return response.data.products
}

export async function createAdminBudgetProduct(payload: CreateAdminBudgetProductPayload): Promise<AdminBudgetProduct> {
  const response = await api.post<{ product: AdminBudgetProduct }>("/admin/budget-products", payload)
  return response.data.product
}

export async function updateAdminBudgetProduct(
  productId: string,
  payload: UpdateAdminBudgetProductPayload,
): Promise<AdminBudgetProduct> {
  const response = await api.patch<{ product: AdminBudgetProduct }>(`/admin/budget-products/${productId}`, payload)
  return response.data.product
}

export async function deleteAdminBudgetProduct(productId: string) {
  await api.delete(`/admin/budget-products/${productId}`)
}

// Presupuestos guardados ------------------------------------------------------

export async function fetchAdminBudgets(): Promise<AdminBudgetRecord[]> {
  const response = await api.get<{ budgets: AdminBudgetRecord[] }>("/admin/budgets")
  return response.data.budgets
}

export async function createAdminBudget(
  payload: Omit<AdminBudgetRecord, "id" | "createdAt" | "updatedAt" | "total" | "clientId"> & { total?: number; clientId?: string | null },
): Promise<AdminBudgetRecord> {
  const response = await api.post<{ budget: AdminBudgetRecord }>("/admin/budgets", payload)
  return response.data.budget
}

export async function updateAdminBudget(
  budgetId: string,
  payload: Partial<Omit<AdminBudgetRecord, "id" | "createdAt" | "updatedAt">>,
): Promise<AdminBudgetRecord> {
  const response = await api.put<{ budget: AdminBudgetRecord }>(`/admin/budgets/${budgetId}`, payload)
  return response.data.budget
}

export async function deleteAdminBudget(budgetId: string) {
  await api.delete(`/admin/budgets/${budgetId}`)
}
