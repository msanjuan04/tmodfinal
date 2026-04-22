import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { sendWeeklyDigestEmail } from "../../email"
import { getProjectStatusMeta } from "../../email/project-status-meta"
import type { WeeklyDigestProjectSummary } from "../../../emails"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Digest lunes 08:00: un correo por cliente con resumen de la semana anterior
// y agenda próxima quincena. Sólo enviamos si hay contenido real (para no
// spamear con correos vacíos).

const NOTIFICATION_TYPE = "weekly_digest"
const ONE_DAY_MS = 24 * 60 * 60_000

// Estados que consideramos "activos" para incluir en el digest: todas las
// fases del flujo canónico excepto la inicial (aún no hay contenido que
// resumir) y el cierre (el proyecto ya terminó). Tampoco se incluyen los
// administrativos (archivado/cancelado).
const ACTIVE_STATUSES = new Set([
  "diseno",
  "presupuesto",
  "planificacion",
  "obra_ejecucion",
])

interface ClientProjectRow {
  id: string
  name: string
  slug: string
  status: string | null
}

function formatDateEs(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function weekLabel(now: Date): string {
  const start = new Date(now.getTime() - 7 * ONE_DAY_MS)
  const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
  return `semana del ${fmt(start)} al ${fmt(now)}`
}

export async function runWeeklyDigestJob(): Promise<void> {
  const supabase = createServerSupabaseClient()
  const now = new Date()
  const weekAgoIso = new Date(now.getTime() - 7 * ONE_DAY_MS).toISOString()
  const nowIso = now.toISOString()
  const in14DaysIso = new Date(now.getTime() + 14 * ONE_DAY_MS).toISOString()

  // 1) Clientes activos con al menos un proyecto "vivo".
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select(`
      id, full_name, email, password_initialized,
      projects:projects(id, name, slug, status)
    `)
    .eq("password_initialized", true)
    .limit(500)

  if (clientsError) {
    console.error("[scheduler:weekly-digest] error buscando clientes", clientsError)
    return
  }

  const candidates = clients ?? []
  const weekKey = weekLabel(now)
  let sent = 0

  for (const client of candidates) {
    if (!client.email) continue

    const projects = (client.projects ?? []) as ClientProjectRow[]
    const activeProjects = projects.filter((p) => ACTIVE_STATUSES.has(p.status ?? ""))
    if (activeProjects.length === 0) continue

    // Dedupe por semana: no más de un digest por cliente cada 6 días.
    const sinceCutoff = new Date(now.getTime() - 6 * ONE_DAY_MS)
    const alreadySent = await hasRecentNotification({
      supabase,
      type: NOTIFICATION_TYPE,
      relatedId: client.id,
      since: sinceCutoff,
    })
    if (alreadySent) continue

    const projectIds = activeProjects.map((p) => p.id)

    // 2) Documentos nuevos (uploaded_at o created_at en últimos 7 días).
    const { data: docs } = await supabase
      .from("project_documents")
      .select("id, project_id, uploaded_at, created_at")
      .in("project_id", projectIds)
      .gte("uploaded_at", weekAgoIso)

    // 3) Tareas cerradas (status = done) con updated_at en últimos 7 días.
    const { data: tasksDone } = await supabase
      .from("project_tasks")
      .select("id, project_id, status, updated_at")
      .in("project_id", projectIds)
      .eq("status", "done")
      .gte("updated_at", weekAgoIso)

    // 4) Próximos eventos visibles al cliente en las siguientes 2 semanas.
    const { data: events } = await supabase
      .from("project_events")
      .select("id, project_id, title, starts_at, visibility")
      .in("project_id", projectIds)
      .eq("visibility", "client_visible")
      .gte("starts_at", nowIso)
      .lt("starts_at", in14DaysIso)
      .order("starts_at", { ascending: true })
      .limit(50)

    const docsByProject = groupCountBy(docs ?? [], "project_id")
    const tasksByProject = groupCountBy(tasksDone ?? [], "project_id")
    const eventsByProject = groupBy(events ?? [], "project_id")

    const projectSummaries: WeeklyDigestProjectSummary[] = activeProjects
      .map((project) => {
        const upcoming = (eventsByProject.get(project.id) ?? []).map((ev: any) => ({
          title: ev.title,
          whenLabel: formatDateEs(ev.starts_at),
        }))
        return {
          projectName: project.name,
          statusLabel: getProjectStatusMeta(project.status ?? "")?.label ?? null,
          documentsAdded: docsByProject.get(project.id) ?? 0,
          tasksCompleted: tasksByProject.get(project.id) ?? 0,
          upcoming,
        }
      })
      // Evitamos enviar tarjetas totalmente vacías (sin movimientos ni agenda).
      .filter((p) => p.documentsAdded > 0 || p.tasksCompleted > 0 || p.upcoming.length > 0)

    if (projectSummaries.length === 0) continue

    try {
      await sendWeeklyDigestEmail({
        to: client.email,
        name: client.full_name ?? "Cliente Terrazea",
        weekLabel: weekKey,
        projects: projectSummaries,
      })

      await recordNotification({
        supabase,
        type: NOTIFICATION_TYPE,
        relatedId: client.id,
        audience: "client",
        clientId: client.id,
        projectId: null,
        title: `Resumen semanal enviado (${weekKey})`,
        description: `${projectSummaries.length} proyecto(s) con actividad`,
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:weekly-digest] fallo enviando a ${client.email}`, error)
    }
  }

  console.log(`[scheduler:weekly-digest] enviados ${sent}/${candidates.length}`)
}

function groupCountBy<T extends Record<string, any>>(items: T[], key: keyof T): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = String(item[key])
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return map
}

function groupBy<T extends Record<string, any>>(items: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = String(item[key])
    const arr = map.get(k) ?? []
    arr.push(item)
    map.set(k, arr)
  }
  return map
}
