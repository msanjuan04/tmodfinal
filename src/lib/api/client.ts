import type { AxiosError } from "axios"

import type { ClientProjectSummary } from "@app/types/client"
import type { DashboardData } from "@app/types/dashboard"
import type {
  GalleryData,
  MessagesData,
  ProjectDetailsData,
} from "@/lib/supabase/queries"
import type { DocumentsData } from "@app/types/documents"

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

interface ClientMessagesResponse {
  messages: MessagesData | null
  activeProjectSlug: string | null
}

export async function fetchClientMessages(projectSlug?: string): Promise<ClientMessagesResponse> {
  const response = await api.get<ClientMessagesResponse>("/client/messages", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

export async function sendClientMessage(conversationId: string, content: string) {
  await api.post(`/client/messages/${conversationId}/messages`, { content })
}

interface ClientDocumentsResponse {
  documents: DocumentsData | null
  activeProjectSlug: string | null
}

export async function fetchClientDocuments(projectSlug?: string): Promise<ClientDocumentsResponse> {
  const response = await api.get<ClientDocumentsResponse>("/client/documents", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

interface ClientGalleryResponse {
  gallery: GalleryData | null
  activeProjectSlug: string | null
}

export async function fetchClientGallery(projectSlug?: string): Promise<ClientGalleryResponse> {
  const response = await api.get<ClientGalleryResponse>("/client/gallery", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

interface ClientProjectDetailsResponse {
  project: ProjectDetailsData | null
  activeProjectSlug: string | null
}

export async function fetchClientProjectDetails(projectSlug?: string): Promise<ClientProjectDetailsResponse> {
  const response = await api.get<ClientProjectDetailsResponse>("/client/project-details", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}

export interface ClientPaymentRecord {
  id: string
  projectId: string
  projectName: string | null
  projectSlug: string | null
  concept: string
  description: string | null
  status: "draft" | "pending" | "paid" | "cancelled"
  amountCents: number
  currency: string
  dueDate: string | null
  paymentLink: string | null
  sentAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientPaymentsSummary {
  totalCount: number
  paidCount: number
  pendingCount: number
  draftCount: number
  totalPaidCents: number
  totalPendingCents: number
  currency: string
}

interface ClientPaymentsResponse {
  payments: ClientPaymentRecord[]
  summary: ClientPaymentsSummary
}

export async function fetchClientPayments(projectSlug?: string): Promise<ClientPaymentsResponse> {
  const response = await api.get<ClientPaymentsResponse>("/client/payments", {
    params: projectSlug ? { project: projectSlug } : undefined,
  })
  return response.data
}
