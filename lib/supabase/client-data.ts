import { createServerSupabaseClient } from "./server"

export interface ClientProjectSummary {
  id: string
  slug: string
  name: string
  code: string | null
  status: string
  progressPercent: number
  startDate: string | null
  estimatedDelivery: string | null
}

export async function getClientProjects(clientId: string): Promise<ClientProjectSummary[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, name, code, status, progress_percent, start_date, estimated_delivery")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching client projects", error)
    return []
  }

  return (
    data?.map((project) => ({
      id: project.id,
      slug: project.slug,
      name: project.name,
      code: project.code ?? null,
      status: project.status ?? "en_progreso",
      progressPercent: Number(project.progress_percent ?? 0),
      startDate: project.start_date ?? null,
      estimatedDelivery: project.estimated_delivery ?? null,
    })) ?? []
  )
}

export async function getClientProfile(clientId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, email, created_at")
    .eq("id", clientId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching client profile", error)
    return null
  }

  return data
}

export async function getClientProjectBySlug(clientId: string, slug: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, name, code, status, progress_percent, start_date, estimated_delivery")
    .eq("client_id", clientId)
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("Error fetching project by slug", error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    code: data.code ?? null,
    status: data.status ?? "en_progreso",
    progressPercent: Number(data.progress_percent ?? 0),
    startDate: data.start_date ?? null,
    estimatedDelivery: data.estimated_delivery ?? null,
  }
}
