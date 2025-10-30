import type { AxiosError } from "axios"

import type { ClientProjectSummary } from "@app/types/client"
import type { DashboardData } from "@app/types/dashboard"

import { api } from "@app/lib/api"

export async function fetchClientProjects(): Promise<ClientProjectSummary[]> {
  try {
    const response = await api.get<{ projects: ClientProjectSummary[] }>("/client/projects")
    return response.data.projects
  } catch (error) {
    const err = error as AxiosError<{ message?: string }>
    if (err.response?.status === 403) {
      return []
    }
    throw error
  }
}

interface ClientDashboardResponse {
  projects: ClientProjectSummary[]
  dashboard: DashboardData | null
  activeProjectSlug: string | null
}

export async function fetchClientDashboard(projectSlug?: string): Promise<ClientDashboardResponse> {
  const response = await api.get<ClientDashboardResponse>("/client/dashboard", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}
