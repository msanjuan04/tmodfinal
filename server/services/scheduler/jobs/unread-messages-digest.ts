import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { sendUnreadMessagesDigestEmail } from "../../email"
import type { UnreadConversationSummary } from "../../../emails"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Digest de mensajes no leídos: si el cliente tiene >=UNREAD_THRESHOLD mensajes
// sin leer, hay al menos una conversación con actividad en las últimas 24h, y
// el cliente lleva >=IDLE_HOURS sin entrar al portal, le mandamos un resumen.
// Se limita a un correo por cliente cada 20h.

const NOTIFICATION_TYPE = "unread_messages_digest"
const UNREAD_THRESHOLD = 3
const IDLE_HOURS = 24
const FRESHNESS_HOURS = 24
const DEDUPE_HOURS = 20
const ONE_HOUR_MS = 60 * 60_000

function describeRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return "hace unos instantes"
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? "hace 1 día" : `hace ${days} días`
}

export async function runUnreadMessagesDigestJob(): Promise<void> {
  const supabase = createServerSupabaseClient()
  const now = Date.now()
  const idleCutoff = new Date(now - IDLE_HOURS * ONE_HOUR_MS).toISOString()
  const freshCutoff = new Date(now - FRESHNESS_HOURS * ONE_HOUR_MS).toISOString()

  // Conversaciones con actividad reciente y al menos 1 mensaje sin leer.
  const { data: conversations, error } = await supabase
    .from("project_conversations")
    .select(`
      id, unread_count, last_message_preview, last_message_at,
      team_member:team_members(id, full_name),
      projects:projects!inner(
        id, name, slug, client_id,
        clients:clients(id, full_name, email, last_active_at)
      )
    `)
    .gt("unread_count", 0)
    .gte("last_message_at", freshCutoff)
    .limit(500)

  if (error) {
    console.error("[scheduler:unread] error buscando conversaciones", error)
    return
  }

  // Agrupamos por cliente.
  const byClient = new Map<
    string,
    {
      email: string
      fullName: string
      lastActiveAt: string | null
      rows: Array<{
        teamMemberName: string
        projectName: string | null
        unreadCount: number
        lastMessagePreview: string | null
        lastMessageAt: string | null
      }>
    }
  >()

  for (const conv of conversations ?? []) {
    const project: any = Array.isArray(conv.projects) ? conv.projects[0] : conv.projects
    const client: any = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null
    if (!client?.id || !client?.email) continue

    const teamMember: any = Array.isArray(conv.team_member) ? conv.team_member[0] : conv.team_member
    const entry =
      byClient.get(client.id) ??
      {
        email: client.email as string,
        fullName: (client.full_name as string) ?? "Cliente Terrazea",
        lastActiveAt: (client.last_active_at as string) ?? null,
        rows: [],
      }
    entry.rows.push({
      teamMemberName: teamMember?.full_name ?? "Equipo Terrazea",
      projectName: project?.name ?? null,
      unreadCount: Number(conv.unread_count ?? 0),
      lastMessagePreview: (conv.last_message_preview as string) ?? null,
      lastMessageAt: (conv.last_message_at as string) ?? null,
    })
    byClient.set(client.id, entry)
  }

  let sent = 0
  for (const [clientId, entry] of byClient.entries()) {
    const totalUnread = entry.rows.reduce((acc, r) => acc + r.unreadCount, 0)
    if (totalUnread < UNREAD_THRESHOLD) continue

    // Cliente considerado "idle": sin actividad en >=IDLE_HOURS (o nunca
    // conectado).
    if (entry.lastActiveAt && entry.lastActiveAt > idleCutoff) continue

    const alreadySent = await hasRecentNotification({
      supabase,
      type: NOTIFICATION_TYPE,
      relatedId: clientId,
      since: new Date(now - DEDUPE_HOURS * ONE_HOUR_MS),
    })
    if (alreadySent) continue

    // Orden: conversación más reciente primero, y como mucho 5 tarjetas.
    const summaries: UnreadConversationSummary[] = entry.rows
      .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
      .slice(0, 5)
      .map((row) => ({
        teamMemberName: row.teamMemberName,
        projectName: row.projectName,
        unreadCount: row.unreadCount,
        lastMessagePreview: row.lastMessagePreview,
        lastMessageLabel: row.lastMessageAt ? describeRelativeDate(row.lastMessageAt) : null,
      }))

    try {
      await sendUnreadMessagesDigestEmail({
        to: entry.email,
        name: entry.fullName,
        totalUnread,
        conversations: summaries,
      })

      await recordNotification({
        supabase,
        type: NOTIFICATION_TYPE,
        relatedId: clientId,
        audience: "client",
        clientId,
        projectId: null,
        title: `Digest de ${totalUnread} mensaje${totalUnread === 1 ? "" : "s"} sin leer`,
        description: `En ${summaries.length} conversación${summaries.length === 1 ? "" : "es"}.`,
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:unread] fallo enviando a ${entry.email}`, error)
    }
  }

  console.log(`[scheduler:unread] enviados ${sent}/${byClient.size}`)
}
