import { z } from "zod"

import { createServerSupabaseClient } from "./server"

const notificationAudienceEnum = z.enum(["client", "admin"])

const notificationRowSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid().nullable(),
  client_id: z.string().uuid().nullable(),
  audience: notificationAudienceEnum,
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  link_url: z.string().nullable(),
  related_id: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

export type NotificationAudience = z.infer<typeof notificationAudienceEnum>

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

export interface NotificationFeed {
  notifications: ProjectNotification[]
  unreadCount: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function createProjectNotification(input: {
  projectId?: string | null
  clientId?: string | null
  audience: NotificationAudience
  type: string
  title: string
  description?: string | null
  linkUrl?: string | null
  relatedId?: string | null
  metadata?: Record<string, unknown>
  readAt?: string | null
}) {
  if (input.audience === "client" && !input.clientId) {
    throw new Error("clientId es obligatorio para notificaciones de clientes")
  }
  const supabase = createServerSupabaseClient()
  const payload = {
    project_id: input.projectId ?? null,
    client_id: input.clientId ?? null,
    audience: input.audience,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    link_url: input.linkUrl ?? null,
    related_id: input.relatedId ?? null,
    metadata: input.metadata ?? {},
    read_at: input.readAt ?? null,
  }

  const { error } = await supabase.from("project_notifications").insert(payload)
  if (error) {
    throw error
  }
}

export async function listClientNotifications(clientId: string, options?: { limit?: number }): Promise<NotificationFeed> {
  const limit = normalizeLimit(options?.limit)
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_notifications")
    .select("*")
    .eq("audience", "client")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  const { count: unreadCount, error: countError } = await supabase
    .from("project_notifications")
    .select("id", { head: true, count: "exact" })
    .eq("audience", "client")
    .eq("client_id", clientId)
    .is("read_at", null)

  if (countError) {
    throw countError
  }

  return {
    notifications: (data ?? []).map(mapNotificationRow),
    unreadCount: unreadCount ?? 0,
  }
}

export async function listAdminNotifications(options?: { limit?: number }): Promise<NotificationFeed> {
  const limit = normalizeLimit(options?.limit)
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_notifications")
    .select("*")
    .eq("audience", "admin")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  const { count: unreadCount, error: countError } = await supabase
    .from("project_notifications")
    .select("id", { head: true, count: "exact" })
    .eq("audience", "admin")
    .is("read_at", null)

  if (countError) {
    throw countError
  }

  return {
    notifications: (data ?? []).map(mapNotificationRow),
    unreadCount: unreadCount ?? 0,
  }
}

export async function markClientNotificationRead(notificationId: string, clientId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("project_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("audience", "client")
    .eq("client_id", clientId)

  if (error) {
    throw error
  }
}

export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("project_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("audience", "admin")

  if (error) {
    throw error
  }
}

function mapNotificationRow(row: z.infer<typeof notificationRowSchema>): ProjectNotification {
  const parsed = notificationRowSchema.parse(row)
  return {
    id: parsed.id,
    projectId: parsed.project_id,
    clientId: parsed.client_id,
    audience: parsed.audience,
    type: parsed.type,
    title: parsed.title,
    description: parsed.description,
    linkUrl: parsed.link_url,
    relatedId: parsed.related_id,
    metadata: (parsed.metadata as Record<string, unknown> | undefined) ?? {},
    readAt: parsed.read_at,
    createdAt: parsed.created_at,
  }
}

function normalizeLimit(value?: number) {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT
  return Math.min(Math.max(1, Math.floor(value)), MAX_LIMIT)
}
