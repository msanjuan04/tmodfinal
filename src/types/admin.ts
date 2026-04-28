
import type { ProjectTaskStatus } from "@/types/project-tasks"

// Flujo canónico de estados de un proyecto Terrazea (de izquierda a derecha).
// `archivado` y `cancelado` son estados administrativos fuera del flujo, solo
// los usa el admin para archivar/cancelar un proyecto; no forman parte de la
// progresión natural y la UI los puede ocultar o mostrar aparte.
export type AdminProjectStatus =
  | "inicial"
  | "diseno"
  | "presupuesto"
  | "planificacion"
  | "obra_ejecucion"
  | "cierre"
  | "archivado"
  | "cancelado"

export type AdminProjectTeamRole = "director" | "arquitecto" | "ingeniero" | "instalador" | "coordinador" | "logistica" | "otro"

export interface AdminProjectListFilters {
  search?: string
  status?: string[]
  managerId?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  sortBy?: "name" | "progress" | "start_date" | "estimated_delivery" | "status" | "updated_at"
  sortOrder?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface AdminProjectSummary {
  id: string
  name: string
  slug: string
  code: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
}

export interface AdminClientOverview {
  id: string
  fullName: string
  email: string
  createdAt: string
  projects: AdminProjectSummary[]
}

export interface AdminClientListFilters {
  search?: string
  status?: string[]
  clientType?: string
  startDateFrom?: string
  startDateTo?: string
  sortBy?: "name" | "created_at" | "projects" | "status"
  sortOrder?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface AdminClientListItem {
  id: string
  fullName: string
  email: string
  phone: string | null
  clientType: string | null
  company: string | null
  status: string
  createdAt: string
  lastActiveAt: string | null
  projectsCount: number
  lastProjectId: string | null
  lastProjectName: string | null
  lastProjectStatus: string | null
  tags: string[]
}

export interface AdminClientListMeta {
  statuses: Array<{ value: string; label: string; count: number }>
  types: Array<{ value: string; label: string }>
}

export interface AdminClientListResponse {
  clients: AdminClientListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  filters: AdminClientListMeta
}

export interface AdminProjectListItem {
  id: string
  name: string
  slug: string
  code: string | null
  clientName: string | null
  clientEmail: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
  managerId: string | null
  managerName: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminProjectListMeta {
  statuses: Array<{ value: string; label: string; count: number }>
  managers: Array<{ id: string; name: string }>
}

export interface AdminProjectListResponse {
  projects: AdminProjectListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  filters: AdminProjectListMeta
}

export interface AdminProjectDetails {
  project: {
    id: string
    name: string
    slug: string | null
    code: string | null
    status: string
    startDate: string | null
    estimatedDelivery: string | null
    locationCity: string | null
    locationNotes: string | null
    locationMapUrl: string | null
    clientId: string | null
    clientName: string | null
    managerId: string | null
    managerName: string | null
    progressPercent: number
    createdAt: string
    lastUpdatedAt: string
  }
  stats: {
    totalTasks: number
    completedTasks: number
    dueToday: number
    dueThisWeek: number
    completedWeight: number
    totalWeight: number
    milestonesCompleted: number
    milestonesTotal: number
    documentsTotal: number
    photosTotal: number
  }
  team: {
    assignments: AdminProjectTeamAssignment[]
    directory: AdminProjectTeamMember[]
  }
  phases: AdminProjectPhase[]
  milestones: AdminProjectMilestone[]
  documents: AdminProjectDocument[]
  photos: AdminProjectPhoto[]
  timeline: AdminProjectTimelineEvent[]
}

export interface AdminDashboardSummary {
  projects: {
    total: number
    active: number
    completed: number
    pending: number
  }
  averageProgress: number
  clients: {
    total: number
    newThisMonth: number
  }
  // Ticket medio: promedio del importe (`projects.ticket_amount`) de los
  // proyectos que tienen valor registrado. `null` si ninguno tiene importe
  // o si la columna aún no existe en esta instalación.
  averageTicket: number | null
  ticketCount: number
  billing: {
    total: number | null
    pending: number | null
    hasData: boolean
  }
}

export interface AdminDashboardMilestone {
  id: string
  projectId: string
  projectName: string
  title: string
  scheduledStart: string | null
  scheduledEnd: string | null
  status: string
}

export interface AdminDashboardAlert {
  id: string
  projectId: string
  projectName: string
  message: string
  severity: "warning" | "critical" | "info"
}

export interface AdminDashboardProjectProgress {
  id: string
  name: string
  progressPercent: number
  status: string
}

export interface AdminDashboardProjectLocation {
  id: string
  name: string
  city: string | null
  mapUrl: string | null
}

export interface AdminDashboardManager {
  id: string
  name: string
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary
  upcomingMilestones: AdminDashboardMilestone[]
  alerts: AdminDashboardAlert[]
  projectsProgress: AdminDashboardProjectProgress[]
  projectLocations?: AdminDashboardProjectLocation[]
  filters: {
    statuses: string[]
    managers: AdminDashboardManager[]
    activeStatus?: string
    activeManagerId?: string
  }
}

export interface AdminProjectTask {
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
  // Flags para marcar una tarea como hito del proyecto y decidir si aparece
  // en el calendario del cliente. Opcionales por compatibilidad con filas
  // antiguas sin la columna.
  isMilestone?: boolean
  showInCalendar?: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminProjectTaskActivity {
  id: string
  taskId: string
  actorId: string | null
  eventType: string
  message: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AdminProjectTaskListResponse {
  tasks: AdminProjectTask[]
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

export interface AdminClientStats {
  totalProjects: number
  activeProjects: number
  pausedProjects: number
  completedProjects: number
  lastProjectName: string | null
  lastProjectStatus: string | null
  lastInteractionAt: string | null
  documentsTotal: number
  unreadMessages: number
}

export interface AdminClientActivity {
  id: string
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  relatedProjectId: string | null
  occurredAt: string
}

export interface AdminClientNote {
  id: string
  title: string | null
  content: string
  tags: string[]
  isPinned: boolean
  authorId: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminClientDocument {
  id: string
  name: string
  category: string
  fileType: string
  sizeLabel: string | null
  storagePath: string | null
  url: string | null
  uploadedAt: string
  uploadedById: string | null
  projectId: string | null
  tags: string[]
  notes: string | null
}

export interface AdminClientMessage {
  id: string
  content: string
  sentAt: string
  senderType: string
  projectId: string | null
  projectName: string | null
}

export interface AdminClientTeamMember {
  id: string
  name: string
  role: string
  email?: string | null
  phone?: string | null
  status: string
}

export interface AdminClientDetails {
  client: {
    id: string
    fullName: string
    email: string
    phone: string | null
    clientType: string | null
    company: string | null
    status: string
    address: string | null
    city: string | null
    country: string | null
    tags: string[]
    lastActiveAt: string | null
    createdAt: string
    updatedAt: string
  }
  stats: AdminClientStats
  projects: Array<{
    id: string
    name: string
    status: string
    progressPercent: number
    startDate: string | null
    estimatedDelivery: string | null
    updatedAt: string | null
    managerName: string | null
  }>
  activity: AdminClientActivity[]
  notes: AdminClientNote[]
  documents: AdminClientDocument[]
  messages: AdminClientMessage[]
}

export interface AdminProjectTeamAssignment {
  role: AdminProjectTeamRole
  memberId: string | null
  memberName?: string | null
  memberEmail?: string | null
  memberRole?: string | null
  status?: string | null
}

export interface AdminProjectTeamMember {
  id: string
  name: string
  role: string
  email?: string | null
  phone?: string | null
  status: string
  createdAt?: string
  projects?: AdminTeamMemberProject[]
}

export interface AdminTeamMemberProject {
  id: string
  name: string
  code: string | null
  status: string
  progressPercent: number
  clientName: string | null
  estimatedDelivery: string | null
  assignedRole: string
  isPrimary: boolean
}

export interface AdminProjectMilestone {
  id: string
  title: string
  summary: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  actualDate: string | null
  weight: number
  progressPercent: number
  status: string
  sortOrder: number
}

export interface AdminProjectPhase {
  id: string
  name: string
  summary: string | null
  expectedStart: string | null
  expectedEnd: string | null
  actualEnd: string | null
  weight: number
  progressPercent: number
  status: string
  sortOrder: number
}

export interface AdminProjectDocument {
  id: string
  name: string
  category: string
  fileType: string
  sizeLabel: string | null
  uploadedAt: string | null
  status: string
  storagePath: string | null
  url: string | null
  uploadedById: string | null
  uploadedByName: string | null
  notifyClient: boolean
  tags: string[]
  notes: string | null
}

export interface AdminProjectPhoto {
  id: string
  url: string
  caption: string | null
  takenAt: string | null
  sortOrder: number
  storagePath: string | null
  tags: string[]
  isCover: boolean
}

export interface AdminProjectTimelineEvent {
  id: string
  occurredAt: string
  title: string
  description: string | null
  status: string
  eventType: string
  actorName?: string | null
}

export type PaymentStatus = "draft" | "pending" | "paid" | "failed" | "canceled"

export interface AdminPaymentRecord {
  id: string
  projectId: string
  // projectName puede llegar null cuando el proyecto aún no se resolvió al
  // construir la respuesta; los renderers ya usan ?? "…" al pintarlo.
  projectName: string | null
  projectSlug: string | null
  clientId: string
  clientName: string | null
  clientEmail: string | null
  concept: string
  description: string | null
  amountCents: number
  currency: string
  status: PaymentStatus
  dueDate: string | null
  paymentLink: string | null
  stripePaymentIntentId: string | null
  stripeCheckoutSessionId: string | null
  stripeCustomerId: string | null
  clientStripeCustomerId: string | null
  stripeInvoiceId: string | null
  createdBy: string | null
  sentAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown>
  proposalDocumentId: string | null
  proposalDocumentName: string | null
  proposalDocumentUrl: string | null
  budgetId?: string | null
}

export interface AdminPaymentsSummary {
  totalCount: number
  overdueCount: number
  upcomingDueDate: string | null
  totalDraftCents: number
  totalPendingCents: number
  totalPaidCents: number
  totalsByStatus: Record<PaymentStatus, number>
  currency: string
}

export interface AdminPaymentsResponse {
  payments: AdminPaymentRecord[]
  summary: AdminPaymentsSummary
}

export interface AdminBudgetProduct {
  id: string
  name: string
  description: string | null
  unitPrice: number
  imagePath: string | null
  imageUrl: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface AdminBudgetLine {
  id: string
  parentId?: string | null
  productId?: string | null
  name: string
  price: string
  quantity: number
  imageDataUrl?: string | null
  notes?: string | null
}

export interface AdminBudgetRecord {
  id: string
  title: string
  clientType: "existing" | "new"
  clientId?: string | null
  clientName: string
  clientEmail?: string | null
  items: AdminBudgetLine[]
  notes?: string | null
  total: number
  taxRate: number
  createdAt: string
  updatedAt: string
}
