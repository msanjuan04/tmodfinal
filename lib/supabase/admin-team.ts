import { createServerSupabaseClient } from "./server"

export interface AdminTeamMemberProject {
  id: string
  name: string
  code: string | null
  status: string
  progressPercent: number
  clientName: string | null
  estimatedDelivery: string | null
  assignedRole: string
  isPrimary: boolean
}

export interface AdminTeamMemberRecord {
  id: string
  fullName: string
  role: string
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  projects: AdminTeamMemberProject[]
}

export interface AdminTeamListFilters {
  search?: string
  roles?: string[]
  status?: string[]
}

export interface AdminTeamListResult {
  members: AdminTeamMemberRecord[]
  totals: {
    total: number
    byRole: Record<string, number>
    byStatus: Record<string, number>
  }
}

export async function listAdminTeamMembers(filters: AdminTeamListFilters = {}): Promise<AdminTeamListResult> {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from("team_members")
    .select(
      `
        id,
        full_name,
        role,
        email,
        phone_number,
        default_status,
        created_at
      `,
    )
    .order("full_name", { ascending: true })

  if (filters.search && filters.search.trim().length > 0) {
    const value = filters.search.trim()
    query = query.or([`full_name.ilike.%${value}%`, `email.ilike.%${value}%`].join(","))
  }

  if (filters.roles && filters.roles.length > 0) {
    query = query.in("role", filters.roles)
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in("default_status", filters.status)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []

  const members: AdminTeamMemberRecord[] = rows.map((row: any) => {
    const assignments = Array.isArray(row.project_team_members) ? row.project_team_members : []
    const projects: AdminTeamMemberProject[] = assignments
      .map((assignment: any) => {
        const project = Array.isArray(assignment.projects) ? assignment.projects[0] : assignment.projects
        if (!project) return null
        const clientInfo = Array.isArray(project.clients) ? project.clients[0] : project.clients

        return {
          id: project.id,
          name: project.name,
          code: project.code ?? null,
          status: project.status ?? "en_progreso",
          progressPercent: Number(project.progress_percent ?? 0),
          clientName: clientInfo?.full_name ?? null,
          estimatedDelivery: project.estimated_delivery ?? null,
          assignedRole: assignment.assigned_role ?? "member",
          isPrimary: Boolean(assignment.is_primary),
        }
      })
      .filter(Boolean) as AdminTeamMemberProject[]

    return {
      id: row.id,
      fullName: row.full_name,
      role: row.role,
      email: row.email ?? null,
      phone: row.phone_number ?? null,
      status: row.default_status ?? "offline",
      createdAt: row.created_at,
      projects,
    }
  })

  const totals = members.reduce<AdminTeamListResult["totals"]>(
    (acc, member) => {
      acc.total += 1
      acc.byRole[member.role] = (acc.byRole[member.role] ?? 0) + 1
      acc.byStatus[member.status] = (acc.byStatus[member.status] ?? 0) + 1
      return acc
    },
    { total: 0, byRole: {}, byStatus: {} },
  )

  return {
    members,
    totals,
  }
}

export interface AdminTeamMemberInput {
  fullName: string
  role: string
  email?: string | null
  phone?: string | null
  status?: string | null
}

export async function createAdminTeamMember(payload: AdminTeamMemberInput) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      full_name: payload.fullName.trim(),
      role: payload.role.trim(),
      email: payload.email?.trim() ?? null,
      phone_number: payload.phone?.trim() ?? null,
      default_status: payload.status?.trim() ?? "offline",
    })
    .select("id, full_name, role, email, phone_number, default_status, created_at")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo crear el miembro del equipo")
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    email: data.email ?? null,
    phone: data.phone_number ?? null,
    status: data.default_status ?? "offline",
    createdAt: data.created_at,
  }
}
