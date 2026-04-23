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
        created_at,
        project_team_members(
          assigned_role,
          status,
          is_primary,
          projects(
            id,
            name,
            code,
            status,
            progress_percent,
            estimated_delivery,
            clients(full_name)
          )
        )
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

  const initialResult = await query
  let rawData: any[] | null = initialResult.data as any[] | null
  let queryError = initialResult.error

  // Fallback defensivo: si el join complejo falla (p.ej. por configuración de RLS
  // o relación no inferida), hacemos la query sin join para no romper la pantalla.
  if (queryError) {
    console.warn(
      "[admin-team] El join con project_team_members falló, reintentando sin join:",
      queryError,
    )
    let fallbackQuery = supabase
      .from("team_members")
      .select("id, full_name, role, email, phone_number, default_status, created_at")
      .order("full_name", { ascending: true })
    if (filters.search && filters.search.trim().length > 0) {
      const value = filters.search.trim()
      fallbackQuery = fallbackQuery.or(
        [`full_name.ilike.%${value}%`, `email.ilike.%${value}%`].join(","),
      )
    }
    if (filters.roles && filters.roles.length > 0) {
      fallbackQuery = fallbackQuery.in("role", filters.roles)
    }
    if (filters.status && filters.status.length > 0) {
      fallbackQuery = fallbackQuery.in("default_status", filters.status)
    }
    const retry = await fallbackQuery
    if (retry.error) throw retry.error
    rawData = (retry.data as any[] | null) ?? []
    queryError = null
  }

  const rows: any[] = rawData ?? []

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
          status: project.status ?? "inicial",
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

export interface TeamMemberProjectAssignmentInput {
  projectId: string
  role: string
  isPrimary?: boolean
}

/**
 * Reemplaza por completo las asignaciones de proyectos de un miembro del equipo.
 * Es transaccional en el sentido de que primero borra todas las existentes y luego
 * inserta las nuevas; si algo falla en el insert, el delete ya se ha aplicado,
 * así que conviene llamarla con el set completo deseado.
 */
export async function setTeamMemberProjects(
  memberId: string,
  assignments: TeamMemberProjectAssignmentInput[],
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // 1) Borrar todas las asignaciones existentes del miembro.
  const { error: deleteError } = await supabase
    .from("project_team_members")
    .delete()
    .eq("team_member_id", memberId)
  if (deleteError) throw deleteError

  if (assignments.length === 0) return

  // 2) Deduplicar por projectId (un miembro no puede tener dos roles en el mismo proyecto).
  const deduped = new Map<string, TeamMemberProjectAssignmentInput>()
  assignments.forEach((a) => {
    if (!a.projectId) return
    deduped.set(a.projectId, a)
  })

  const rows = Array.from(deduped.values()).map((a) => ({
    project_id: a.projectId,
    team_member_id: memberId,
    assigned_role: a.role || "otro",
    status: "online",
    is_primary: a.isPrimary ?? a.role === "director",
  }))

  const { error: insertError } = await supabase.from("project_team_members").insert(rows)
  if (insertError) throw insertError
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
