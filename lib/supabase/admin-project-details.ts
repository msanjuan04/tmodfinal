import { addDays, isToday, isWithinInterval, startOfDay } from "date-fns"

import { createServerSupabaseClient } from "./server"

interface ProjectRow {
  id: string
  name: string
  code: string | null
  status: string
  progress_percent: number | null
  start_date: string | null
  estimated_delivery: string | null
  location_city: string | null
  location_notes: string | null
  clients?:
    | {
        full_name: string | null
      }
    | Array<{
        full_name: string | null
      }>
    | null
}

interface TeamMemberRow {
  team_member_id: string
  status: string
  team_members?:
    | {
        full_name: string | null
        role: string | null
      }
    | Array<{
        full_name: string | null
        role: string | null
      }>
    | null
}

interface MilestoneRow {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
}

export interface AdminProjectDetailsResult {
  project: {
    id: string
    name: string
    code: string | null
    status: string
    progressPercent: number
    startDate: string | null
    estimatedDelivery: string | null
    locationCity: string | null
    locationNotes: string | null
    clientName: string | null
  }
  stats: {
    totalTasks: number
    completedTasks: number
    dueToday: number
    dueThisWeek: number
    completedWeight: number
    totalWeight: number
  }
  teamMembers: Array<{
    id: string
    name: string
    role: string
    status: string
  }>
  milestones: Array<{
    id: string
    title: string
    scheduledStart: string | null
    scheduledEnd: string | null
    status: string
  }>
  alerts: Array<{
    id: string
    message: string
    severity: "info" | "warning" | "critical"
    createdAt: string
  }>
}

export async function getAdminProjectDetails(projectId: string): Promise<AdminProjectDetailsResult> {
  const supabase = createServerSupabaseClient()

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select(
      `
        id,
        name,
        code,
        status,
        progress_percent,
        start_date,
        estimated_delivery,
        location_city,
        location_notes,
        clients ( full_name )
      `,
    )
    .eq("id", projectId)
    .maybeSingle()

  if (projectError) throw projectError
  if (!projectRow) throw new Error("Proyecto no encontrado")

  const project = projectRow as ProjectRow

  const { data: taskRows, error: tasksError } = await supabase
    .from("project_tasks")
    .select("status, weight, due_date")
    .eq("project_id", projectId)

  if (tasksError) throw tasksError

  const today = startOfDay(new Date())
  const endOfWeek = addDays(today, 7)

  let totalTasks = 0
  let completedTasks = 0
  let totalWeight = 0
  let completedWeight = 0
  let dueToday = 0
  let dueThisWeek = 0

  taskRows?.forEach((task) => {
    totalTasks += 1
    const weight = Number(task.weight ?? 0)
    totalWeight += weight
    if (task.status === "done") {
      completedTasks += 1
      completedWeight += weight
    }
    if (task.due_date) {
      const due = new Date(task.due_date)
      if (isToday(due)) {
        dueToday += 1
      }
      if (isWithinInterval(due, { start: today, end: endOfWeek })) {
        dueThisWeek += 1
      }
    }
  })

  const { data: teamRows, error: teamError } = await supabase
    .from("project_team_members")
    .select("team_member_id, status, team_members(full_name, role)")
    .eq("project_id", projectId)

  if (teamError) throw teamError

  const teamMembers =
    teamRows?.map((member: TeamMemberRow) => {
      const info = Array.isArray(member.team_members) ? member.team_members[0] : member.team_members
      return {
        id: member.team_member_id,
        name: info?.full_name ?? "Sin nombre",
        role: info?.role ?? "Equipo",
        status: member.status ?? "offline",
      }
    }) ?? []

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from("project_milestones")
    .select("id, title, scheduled_start, scheduled_end, status")
    .eq("project_id", projectId)
    .order("scheduled_start", { ascending: true })
    .limit(6)

  if (milestoneError) throw milestoneError

  const milestones =
    milestoneRows?.map((milestone: MilestoneRow) => ({
      id: milestone.id,
      title: milestone.title,
      scheduledStart: milestone.scheduled_start,
      scheduledEnd: milestone.scheduled_end,
      status: milestone.status,
    })) ?? []

  const alerts: AdminProjectDetailsResult["alerts"] = []

  if (project.estimated_delivery) {
    const deliveryDate = new Date(project.estimated_delivery)
    if (deliveryDate < today && project.status !== "finalizado") {
      alerts.push({
        id: `${project.id}-delivery`,
        message: "La fecha de entrega estimada ha pasado. Revisa el cronograma con el cliente.",
        severity: "warning",
        createdAt: new Date().toISOString(),
      })
    }
  }

  if (dueToday > 0) {
    alerts.push({
      id: `${project.id}-due-today`,
      message: `Hay ${dueToday} tarea${dueToday === 1 ? "" : "s"} con vencimiento hoy.`,
      severity: "info",
      createdAt: new Date().toISOString(),
    })
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      code: project.code ?? null,
      status: project.status,
      progressPercent: Number(project.progress_percent ?? 0),
      startDate: project.start_date,
      estimatedDelivery: project.estimated_delivery,
      locationCity: project.location_city,
      locationNotes: project.location_notes,
      clientName: Array.isArray(project.clients)
        ? project.clients[0]?.full_name ?? null
        : project.clients?.full_name ?? null,
    },
    stats: {
      totalTasks,
      completedTasks,
      dueToday,
      dueThisWeek,
      completedWeight,
      totalWeight,
    },
    teamMembers,
    milestones,
    alerts,
  }
}
