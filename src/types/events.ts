export type ProjectEventVisibility = "client_visible" | "internal"

export interface ProjectEvent {
  id: string
  projectId: string
  title: string
  description: string | null
  eventType: string
  startsAt: string
  endsAt: string | null
  isAllDay: boolean
  visibility: ProjectEventVisibility
  createdBy: string | null
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    name: string
    slug: string
  }
}

export interface ProjectEventWriteInput {
  projectId: string
  title: string
  description?: string | null
  eventType: string
  startsAt: string
  endsAt?: string | null
  isAllDay?: boolean
  visibility: ProjectEventVisibility
}

export interface ProjectCalendarSummary {
  id: string
  name: string
  slug: string
  clientName: string | null
}

export interface ClientProjectCalendarContext {
  projectId: string
  projectSlug: string
  projectName: string
}

export interface ClientProjectEventsResponse {
  project: ClientProjectCalendarContext | null
  events: ProjectEvent[]
}
