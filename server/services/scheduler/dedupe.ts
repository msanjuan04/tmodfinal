import type { SupabaseClient } from "@supabase/supabase-js"

import { createServerSupabaseClient } from "../../../lib/supabase/server"

// Utilidad para evitar enviar el mismo recordatorio dos veces. Aprovechamos
// project_notifications (tabla ya existente) como log: si ya hay una fila con
// ese (type + related_id) después del `since`, se considera enviado.

export async function hasRecentNotification(params: {
  type: string
  relatedId: string
  since?: Date
  supabase?: SupabaseClient
}): Promise<boolean> {
  const supabase = params.supabase ?? createServerSupabaseClient()
  const query = supabase
    .from("project_notifications")
    .select("id, created_at")
    .eq("type", params.type)
    .eq("related_id", params.relatedId)
    .order("created_at", { ascending: false })
    .limit(1)

  const { data, error } = await query

  if (error) {
    console.error(`[scheduler] dedupe query falló (${params.type})`, error)
    return false
  }

  if (!data || data.length === 0) return false
  if (!params.since) return true

  const createdAt = new Date(data[0].created_at).getTime()
  return createdAt >= params.since.getTime()
}

export async function recordNotification(params: {
  supabase?: SupabaseClient
  type: string
  relatedId: string
  audience?: "client" | "admin"
  clientId?: string | null
  projectId?: string | null
  title: string
  description?: string | null
  linkUrl?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = params.supabase ?? createServerSupabaseClient()
  const { error } = await supabase.from("project_notifications").insert({
    audience: params.audience ?? "client",
    client_id: params.clientId ?? null,
    project_id: params.projectId ?? null,
    type: params.type,
    title: params.title,
    description: params.description ?? null,
    link_url: params.linkUrl ?? null,
    related_id: params.relatedId,
    metadata: params.metadata ?? {},
  })
  if (error) {
    console.error(`[scheduler] no se pudo registrar notificación (${params.type})`, error)
  }
}
