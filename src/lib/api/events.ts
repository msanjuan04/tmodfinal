import type {
  ClientProjectEventsResponse,
  ProjectCalendarSummary,
  ProjectEvent,
  ProjectEventWriteInput,
} from "@app/types/events"

import { api } from "@app/lib/api"

export async function listProjectEvents(projectSlug: string) {
  const response = await api.get<{ project: { id: string; name: string; slug: string } | null; events: ProjectEvent[] }>(
    "/admin/events",
    {
      params: { project: projectSlug },
    },
  )
  return response.data
}

export async function listGlobalEvents() {
  const response = await api.get<{ events: ProjectEvent[] }>("/admin/events/global")
  return response.data.events
}

export async function listProjectCalendarSummaries(): Promise<ProjectCalendarSummary[]> {
  const response = await api.get<{ projects: ProjectCalendarSummary[] }>(
    "/admin/projects/calendars",
  )
  return response.data.projects
}

export async function fetchClientProjectEvents(projectSlug?: string) {
  const response = await api.get<ClientProjectEventsResponse>("/client/calendar", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

export async function createProjectEvent(input: ProjectEventWriteInput) {
  const response = await api.post<ProjectEvent>("/admin/events", input)
  return response.data
}

export async function updateProjectEvent(eventId: string, input: ProjectEventWriteInput) {
  const response = await api.put<ProjectEvent>(`/admin/events/${eventId}`, input)
  return response.data
}

export async function deleteProjectEvent(eventId: string) {
  await api.delete(`/admin/events/${eventId}`)
}
