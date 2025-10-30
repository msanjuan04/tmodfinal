import { createServerSupabaseClient } from "./server"

export interface AdminProjectSummary {
  id: string
  name: string
  slug: string
  code: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
}

export interface AdminClientOverview {
  id: string
  fullName: string
  email: string
  createdAt: string
  projects: AdminProjectSummary[]
}

export async function getAdminClientsOverview(): Promise<AdminClientOverview[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("clients")
    .select(
      `
        id,
        full_name,
        email,
        created_at,
        projects (
          id,
          name,
          slug,
          code,
          status,
          progress_percent,
          start_date,
          estimated_delivery
        )
      `,
    )
    .order("created_at", { ascending: false })

  if (error || !data) {
    console.error("Error fetching clients for admin", error)
    return []
  }

  return data.map((client) => ({
    id: client.id,
    fullName: client.full_name,
    email: client.email,
    createdAt: client.created_at,
    projects:
      (client.projects as unknown as Array<{
        id: string
        name: string
        slug: string
        code: string | null
        status: string
        progress_percent: number | null
        start_date: string | null
        estimated_delivery: string | null
      }> | null)?.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        code: project.code,
        status: project.status ?? "en_progreso",
        progressPercent: Number(project.progress_percent ?? 0),
        startDate: project.start_date,
        estimatedDelivery: project.estimated_delivery,
      })) ?? [],
  }))
}
