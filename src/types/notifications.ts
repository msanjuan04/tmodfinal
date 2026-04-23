export type NotificationAudience = "client" | "admin"

export interface ProjectNotification {
  id: string
  projectId: string | null
  clientId: string | null
  audience: NotificationAudience
  type: string
  title: string
  description: string | null
  linkUrl: string | null
  relatedId: string | null
  metadata: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface NotificationsFeed {
  notifications: ProjectNotification[]
  unreadCount: number
  // Total de notificaciones que cumplen el filtro aplicado (no afectado por
  // limit/offset). Opcional porque el endpoint sólo lo rellena cuando se pide
  // un listado paginado.
  totalCount?: number
}
