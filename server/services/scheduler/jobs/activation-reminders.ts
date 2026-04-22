import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { sendActivationReminderEmail } from "../../email"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Recordatorio de activación: pasadas 48 h desde que se creó el cliente, si
// sigue con password_initialized = false mandamos un recordatorio con el
// código. Dedupe por cliente, así no spameamos.

const NOTIFICATION_TYPE = "client_activation_reminder"
const HOURS_SINCE_INVITE = 48

export async function runActivationRemindersJob(): Promise<void> {
  const supabase = createServerSupabaseClient()
  const cutoff = new Date(Date.now() - HOURS_SINCE_INVITE * 60 * 60_000).toISOString()

  const { data: pending, error } = await supabase
    .from("clients")
    .select(`
      id, full_name, email, password_initialized, created_at,
      projects:projects(id, name, code, created_at)
    `)
    .eq("password_initialized", false)
    .lte("created_at", cutoff)
    .limit(100)

  if (error) {
    console.error("[scheduler:activation] error buscando clientes pendientes", error)
    return
  }

  const candidates = pending ?? []
  if (candidates.length === 0) {
    console.log("[scheduler:activation] 0 pendientes")
    return
  }

  let sent = 0
  for (const client of candidates) {
    if (!client.email) continue

    const alreadySent = await hasRecentNotification({
      supabase,
      type: NOTIFICATION_TYPE,
      relatedId: client.id,
    })
    if (alreadySent) continue

    // Usamos el proyecto más reciente para mostrar nombre y código.
    const projects = Array.isArray(client.projects) ? client.projects : []
    const latestProject = projects
      .slice()
      .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0]

    try {
      await sendActivationReminderEmail({
        to: client.email,
        name: client.full_name ?? "Cliente Terrazea",
        projectCode: latestProject?.code ?? null,
        projectName: latestProject?.name ?? null,
      })

      await recordNotification({
        supabase,
        type: NOTIFICATION_TYPE,
        relatedId: client.id,
        audience: "client",
        clientId: client.id,
        projectId: latestProject?.id ?? null,
        title: "Recordatorio de activación enviado",
        description: "Correo recordatorio para completar la activación de la cuenta.",
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:activation] fallo enviando a ${client.email}`, error)
    }
  }

  console.log(`[scheduler:activation] enviados ${sent}/${candidates.length}`)
}
