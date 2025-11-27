import { addDays, endOfMonth, formatISO, startOfMonth } from "date-fns"

import { createServerSupabaseClient } from "./server"

export interface AdminDashboardFilters {
  status?: string
  managerId?: string
}

export interface AdminDashboardSummary {
  projects: {
    total: number
    active: number
    completed: number
    pending: number
  }
  averageProgress: number
  clients: {
    total: number
    newThisMonth: number
  }
  billing: {
    total: number | null
    pending: number | null
    hasData: boolean
  }
}

export interface AdminDashboardMilestone {
  id: string
  projectId: string
  projectName: string
  title: string
  scheduledStart: string | null
  scheduledEnd: string | null
  status: string
}

export interface AdminDashboardAlert {
  id: string
  projectId: string
  projectName: string
  message: string
  severity: "warning" | "critical" | "info"
}

export interface AdminDashboardProjectProgress {
  id: string
  name: string
  progressPercent: number
  status: string
}

export interface AdminDashboardManager {
  id: string
  name: string
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary
  upcomingMilestones: AdminDashboardMilestone[]
  alerts: AdminDashboardAlert[]
  projectsProgress: AdminDashboardProjectProgress[]
  filters: {
    statuses: string[]
    managers: AdminDashboardManager[]
    activeStatus?: string
    activeManagerId?: string
  }
}

interface ProjectRecord {
  id: string
  name: string
  status: string
  progress_percent: number | null
  estimated_delivery: string | null
  created_at: string
  client_id: string
  location_city?: string | null
  map_url?: string | null
  project_team_members: Array<{
    team_member_id: string
    is_primary: boolean
    team_members?: { full_name: string | null } | { full_name: string | null }[] | null
  }> | null
}

export async function getAdminDashboardData(filters: AdminDashboardFilters): Promise<AdminDashboardData> {
  const supabase = createServerSupabaseClient()

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, name, status, progress_percent, estimated_delivery, created_at, client_id, location_city, map_url, project_team_members(team_member_id, is_primary, team_members(full_name))",
    )
    .order("created_at", { ascending: false })

  if (projectError) {
    throw projectError
  }

  const projects = ((projectRows ?? []) as unknown) as ProjectRecord[]

  const managerMap = new Map<string, string>()
  projects.forEach((project) => {
    project.project_team_members?.forEach((member) => {
      if (member.is_primary && member.team_member_id) {
        const tm = Array.isArray(member.team_members) ? member.team_members[0] : member.team_members
        managerMap.set(member.team_member_id, tm?.full_name ?? "Gestor sin nombre")
      }
    })
  })

  const uniqueStatuses = Array.from(new Set(projects.map((p) => p.status))).sort()

  const filteredProjects = projects.filter((project) => {
    const statusMatch = filters.status ? project.status === filters.status : true
    const managerMatch = filters.managerId
      ? project.project_team_members?.some((member) => member.is_primary && member.team_member_id === filters.managerId)
      : true
    return statusMatch && managerMatch
  })

  const totalProjects = filteredProjects.length
  const activeProjects = filteredProjects.filter((project) => project.status === "en_progreso").length
  const completedProjects = filteredProjects.filter((project) => project.status === "finalizado").length
  const pendingProjects = filteredProjects.filter((project) => project.status !== "en_progreso" && project.status !== "finalizado").length

  const averageProgress =
    filteredProjects.reduce((acc, project) => acc + Number(project.progress_percent ?? 0), 0) /
    (filteredProjects.length > 0 ? filteredProjects.length : 1)

  const { data: clientsRows, error: clientsError } = await supabase
    .from("clients")
    .select("id, created_at")

  if (clientsError) {
    throw clientsError
  }

  const clients = clientsRows ?? []
  const totalClients = clients.length
  const startMonth = startOfMonth(new Date())
  const endMonth = endOfMonth(new Date())
  const newThisMonth = clients.filter((client) => {
    const createdAt = new Date(client.created_at)
    return createdAt >= startMonth && createdAt <= endMonth
  }).length

  const today = new Date()
  const horizon = addDays(today, 30)
  const { data: milestonesRows, error: milestonesError } = await supabase
    .from("project_milestones")
    .select("id, project_id, title, scheduled_start, scheduled_end, status, projects(name)")
    .gte("scheduled_end", formatISO(today, { representation: "date" }))
    .lte("scheduled_end", formatISO(horizon, { representation: "date" }))
    .neq("status", "completed")
    .order("scheduled_end", { ascending: true })
    .limit(10)

  if (milestonesError) {
    throw milestonesError
  }

  const upcomingMilestones: AdminDashboardMilestone[] =
    milestonesRows?.map((row) => {
      const projectInfo = Array.isArray(row.projects) ? row.projects[0] : row.projects
      return {
        id: row.id,
        projectId: row.project_id,
        projectName: projectInfo?.name ?? "Proyecto sin nombre",
        title: row.title,
        scheduledStart: row.scheduled_start,
        scheduledEnd: row.scheduled_end,
        status: row.status ?? "pending",
      }
    }) ?? []

  const alerts: AdminDashboardAlert[] = filteredProjects
    .filter((project) => {
      if (!project.estimated_delivery) return false
      const deliveryDate = new Date(project.estimated_delivery)
      return deliveryDate < today && project.status !== "finalizado"
    })
    .map((project) => ({
      id: project.id,
      projectId: project.id,
      projectName: project.name,
      message: "Proyecto con fecha de entrega superada. Revisa el calendario.",
      severity: "critical",
    }))

  const projectsProgress: AdminDashboardProjectProgress[] = filteredProjects
    .map((project) => ({
      id: project.id,
      name: project.name,
      progressPercent: Number(project.progress_percent ?? 0),
      status: project.status,
    }))
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, 8)

  const projectLocations = filteredProjects
    .filter((project) => project.location_city || project.map_url)
    .map((project) => ({
      id: project.id,
      name: project.name,
      city: project.location_city ?? null,
      mapUrl: project.map_url ?? null,
    }))

  const data: AdminDashboardData = {
    summary: {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        pending: pendingProjects,
      },
      averageProgress: Number.isNaN(averageProgress) ? 0 : Number(averageProgress.toFixed(2)),
      clients: {
        total: totalClients,
        newThisMonth,
      },
      billing: {
        total: null,
        pending: null,
        hasData: false,
      },
    },
    upcomingMilestones,
    alerts,
    projectsProgress,
    projectLocations,
    filters: {
      statuses: uniqueStatuses,
      managers: Array.from(managerMap.entries()).map(([id, name]) => ({ id, name })),
      activeStatus: filters.status,
      activeManagerId: filters.managerId,
    },
  }

  return data
}
