import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { sendProjectFeedbackEmail } from "../../email"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Petición de reseña/feedback al cliente 3 días después del cierre. Buscamos
// proyectos en completado/finalizado cuyo cambio de estado se registró hace
// >=3 días y no tienen todavía un feedback_request enviado.

const NOTIFICATION_TYPE = "project_feedback_request"
const DAYS_AFTER_CLOSURE = 3
const ONE_DAY_MS = 24 * 60 * 60_000
// En el flujo canónico hay un único estado de cierre. Los administrativos
// (archivado/cancelado) no generan petición de feedback.
const CLOSURE_STATUSES = ["cierre"]

export async function runProjectFeedbackJob(): Promise<void> {
  const supabase = createServerSupabaseClient()
  const cutoff = new Date(Date.now() - DAYS_AFTER_CLOSURE * ONE_DAY_MS).toISOString()

  // project_status_change se registra en project_notifications al cerrar. Así
  // sabemos cuándo pasó a "cerrado" sin añadir columnas nuevas.
  const { data: closures, error } = await supabase
    .from("project_notifications")
    .select("id, project_id, related_id, created_at")
    .eq("type", "project_status_change")
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[scheduler:feedback] error buscando cierres", error)
    return
  }

  // Filtramos a las transiciones hacia estados de cierre (el related_id tiene
  // formato "{projectId}:{status}").
  const candidates = (closures ?? []).filter((row) => {
    const related = String(row.related_id ?? "")
    const [, status] = related.split(":")
    return CLOSURE_STATUSES.includes(status)
  })

  if (candidates.length === 0) {
    console.log("[scheduler:feedback] sin cierres maduros")
    return
  }

  // Nos quedamos con el cierre MÁS RECIENTE por proyecto (por si un proyecto
  // se reabrió y volvió a cerrar).
  const latestByProject = new Map<string, (typeof candidates)[number]>()
  for (const row of candidates) {
    if (!row.project_id) continue
    if (!latestByProject.has(row.project_id)) latestByProject.set(row.project_id, row)
  }

  let sent = 0
  for (const [projectId, closure] of latestByProject.entries()) {
    const alreadySent = await hasRecentNotification({
      supabase,
      type: NOTIFICATION_TYPE,
      relatedId: projectId,
    })
    if (alreadySent) continue

    const { data: project } = await supabase
      .from("projects")
      .select(`
        id, name, client_id, status,
        clients:clients(id, full_name, email)
      `)
      .eq("id", projectId)
      .maybeSingle()

    if (!project) continue
    // Comprobación defensiva: solo si el proyecto SIGUE cerrado (si volvió a
    // abrirse antes de los 3 días, no pedimos feedback todavía).
    if (!CLOSURE_STATUSES.includes(project.status ?? "")) continue

    const client = Array.isArray(project.clients) ? project.clients[0] : project.clients
    if (!client?.email) continue

    try {
      await sendProjectFeedbackEmail({
        to: client.email,
        name: client.full_name ?? "Cliente Terrazea",
        projectName: project.name,
      })

      await recordNotification({
        supabase,
        type: NOTIFICATION_TYPE,
        relatedId: projectId,
        audience: "client",
        clientId: client.id ?? project.client_id ?? null,
        projectId,
        title: `Petición de feedback enviada · ${project.name}`,
        description: `Tras el cierre del proyecto el ${new Date(closure.created_at).toLocaleDateString("es-ES")}.`,
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:feedback] fallo enviando a ${client.email}`, error)
    }
  }

  console.log(`[scheduler:feedback] enviados ${sent}/${latestByProject.size}`)
}
