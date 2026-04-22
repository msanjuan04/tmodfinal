import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { env } from "../../../config/env"
import { sendEventReminderEmail } from "../../email"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Recordatorio de evento: cada hora miramos los eventos visibles al cliente
// cuyo starts_at cae entre ahora+24h y ahora+25h. Enviamos una vez por evento.

const NOTIFICATION_TYPE = "event_reminder_24h"

export async function runEventRemindersJob(): Promise<void> {
  const supabase = createServerSupabaseClient()
  const now = Date.now()
  const windowStart = new Date(now + 24 * 60 * 60_000).toISOString()
  const windowEnd = new Date(now + 25 * 60 * 60_000).toISOString()

  const { data: events, error } = await supabase
    .from("project_events")
    .select(`
      id, title, starts_at, event_type, visibility,
      projects:projects!inner(
        id, slug, name, client_id,
        clients:clients(id, full_name, email)
      )
    `)
    .eq("visibility", "client_visible")
    .gte("starts_at", windowStart)
    .lt("starts_at", windowEnd)
    .limit(100)

  if (error) {
    console.error("[scheduler:events] error buscando eventos", error)
    return
  }

  const candidates = events ?? []
  if (candidates.length === 0) {
    console.log("[scheduler:events] 0 eventos en ventana")
    return
  }

  const portalBase = env.clientAppUrl.replace(/\/$/, "")
  let sent = 0

  for (const event of candidates) {
    const project = Array.isArray(event.projects) ? event.projects[0] : event.projects
    const clientRow = project ? (Array.isArray(project.clients) ? project.clients[0] : project.clients) : null
    if (!clientRow?.email) continue

    const alreadySent = await hasRecentNotification({
      supabase,
      type: NOTIFICATION_TYPE,
      relatedId: event.id,
    })
    if (alreadySent) continue

    const ctaUrl = project?.slug
      ? `${portalBase}/client/calendar?project=${encodeURIComponent(project.slug)}`
      : `${portalBase}/client/calendar`

    try {
      await sendEventReminderEmail({
        to: clientRow.email,
        name: clientRow.full_name ?? "Cliente Terrazea",
        eventTitle: event.title,
        startsAt: event.starts_at,
        projectName: project?.name ?? null,
        location: null,
        ctaUrl,
      })

      await recordNotification({
        supabase,
        type: NOTIFICATION_TYPE,
        relatedId: event.id,
        audience: "client",
        clientId: clientRow.id ?? null,
        projectId: project?.id ?? null,
        title: `Recordatorio enviado: ${event.title}`,
        description: "Correo de recordatorio 24 h antes del evento.",
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:events] fallo enviando recordatorio evento ${event.id}`, error)
    }
  }

  console.log(`[scheduler:events] enviados ${sent}/${candidates.length}`)
}
