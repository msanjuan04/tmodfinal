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
}
