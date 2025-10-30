// @ts-nocheck
import type { SupabaseClient } from "@supabase/supabase-js"

import { createServerSupabaseClient, resolveDefaultProjectSlug } from "./server"

type UpdateType = "success" | "info" | "warning" | "message"
type StatusState = "completed" | "in_progress" | "pending"
type ActivityStatus = "completed" | "info" | "warning"
type DocumentStatus = "aprobado" | "vigente" | "actualizado"
type MessageSender = "client" | "team_member"

export interface DashboardData {
  project: {
    id: string
    name: string
    code: string | null
    clientName: string | null
    status: string
    progressPercent: number
    startDate: string | null
    estimatedDelivery: string | null
    totalDays: number | null
    remainingDays: number | null
  }
  metrics: Array<{
    code: string
    label: string
    value: number
    sublabel: string | null
  }>
  updates: Array<{
    id: string
    title: string
    description: string | null
    type: UpdateType
    occurredAt: string
  }>
  team: Array<{
    id: string
    name: string
    role: string
    avatarUrl: string | null
    status: string
  }>
  milestones: Array<{
    id: string
    title: string
    scheduledStart: string | null
    scheduledEnd: string | null
    progressPercent: number
    status: StatusState
  }>
}

export interface ProjectDetailsData {
  project: {
    id: string
    name: string
    code: string | null
    status: string
    progressPercent: number
    locationCity: string | null
    locationNotes: string | null
    startDate: string | null
    estimatedDelivery: string | null
    totalDays: number | null
    remainingDays: number | null
  }
  phases: Array<{
    id: string
    name: string
    progressPercent: number
    status: StatusState
    sortOrder: number
  }>
  activity: Array<{
    id: string
    occurredAt: string
    title: string
    description: string | null
    status: ActivityStatus
  }>
  photos: Array<{
    id: string
    url: string
    caption: string | null
    takenAt: string | null
    sortOrder: number
  }>
  milestones: DashboardData["milestones"]
  teamSummary: {
    totalMembers: number
    activeMembers: number
  }
  teamMembers: Array<{
    id: string
    name: string
    role: string
    status: string
  }>
  photoSummary: {
    totalPhotos: number | null
    lastUpdate: string | null
  }
}

export interface DocumentRow {
  id: string
  name: string
  category: string
  fileType: string
  sizeLabel: string | null
  uploadedAt: string | null
  status: DocumentStatus
}

export interface DocumentsData {
  documents: DocumentRow[]
  stats: {
    total: number
    newThisWeek: number
    plans: number
    certificates: number
    warranties: number
  }
}

export interface ConversationSummary {
  id: string
  teamMemberId: string
  name: string
  role: string
  avatarUrl: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  status: string
}

export interface MessageRow {
  id: string
  conversationId: string
  senderType: MessageSender
  teamMemberId: string | null
  content: string
  sentAt: string
}

export interface MessagesData {
  conversations: ConversationSummary[]
  messagesByConversation: Record<string, MessageRow[]>
}

async function resolveProjectId(slug: string | undefined, supabase: SupabaseClient): Promise<{ projectId: string }> {
  const targetSlug = slug ?? resolveDefaultProjectSlug()

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", targetSlug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.id) {
    throw new Error(`No project found with slug "${targetSlug}"`)
  }

  return { projectId: data.id }
}

export async function getDashboardData(projectSlug?: string): Promise<DashboardData> {
  const supabase = createServerSupabaseClient()
  const targetSlug = projectSlug ?? resolveDefaultProjectSlug()

  const { data, error } = await supabase
    .from("projects")
    .select(
      [
        "id",
        "name",
        "code",
        "status",
        "progress_percent",
        "start_date",
        "estimated_delivery",
        "total_days",
        "remaining_days",
        "client:clients(full_name)",
      ].join(","),
    )
    .eq("slug", targetSlug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(`No project found with slug "${targetSlug}"`)
  }

  const [{ data: metrics, error: metricsError }, { data: updates, error: updatesError }, { data: team, error: teamError }, { data: milestones, error: milestonesError }] =
    await Promise.all([
      supabase
        .from("project_metrics")
        .select("id, metric_code, label, value, sublabel")
        .eq("project_id", data.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_updates")
        .select("id, title, description, update_type, occurred_at")
        .eq("project_id", data.id)
        .order("occurred_at", { ascending: false })
        .limit(6),
      supabase
        .from("project_team_members")
        .select("team_member_id, status, team_member:team_members(id, full_name, role, avatar_url)")
        .eq("project_id", data.id),
      supabase
        .from("project_milestones")
        .select("id, title, scheduled_start, scheduled_end, progress_percent, status")
        .eq("project_id", data.id)
        .order("sort_order", { ascending: true })
        .order("scheduled_start", { ascending: true }),
    ])

  if (metricsError) throw metricsError
  if (updatesError) throw updatesError
  if (teamError) throw teamError
  if (milestonesError) throw milestonesError

  return {
    project: {
      id: data.id,
      name: data.name,
      code: data.code ?? null,
      clientName: (data as { client?: { full_name?: string } })?.client?.full_name ?? null,
      status: data.status ?? "en_progreso",
      progressPercent: Number(data.progress_percent ?? 0),
      startDate: data.start_date ?? null,
      estimatedDelivery: data.estimated_delivery ?? null,
      totalDays: data.total_days ?? null,
      remainingDays: data.remaining_days ?? null,
    },
    metrics:
      metrics?.map((metric) => ({
        code: metric.metric_code,
        label: metric.label,
        value: Number(metric.value ?? 0),
        sublabel: metric.sublabel,
      })) ?? [],
    updates:
      updates?.map((update) => ({
        id: update.id,
        title: update.title,
        description: update.description,
        type: update.update_type as UpdateType,
        occurredAt: update.occurred_at,
      })) ?? [],
    team:
      team?.map((member) => ({
        id: member.team_member?.id ?? member.team_member_id ?? "",
        name: member.team_member?.full_name ?? "Equipo",
        role: member.team_member?.role ?? "",
        avatarUrl: member.team_member?.avatar_url ?? null,
        status: member.status ?? "offline",
      })) ?? [],
    milestones:
      milestones?.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        scheduledStart: milestone.scheduled_start,
        scheduledEnd: milestone.scheduled_end,
        progressPercent: Number(milestone.progress_percent ?? 0),
        status: milestone.status as StatusState,
      })) ?? [],
  }
}

export async function getProjectDetails(projectSlug?: string): Promise<ProjectDetailsData> {
  const supabase = createServerSupabaseClient()
  const targetSlug = projectSlug ?? resolveDefaultProjectSlug()

  const { data, error } = await supabase
    .from("projects")
    .select(
      [
        "id",
        "name",
        "code",
        "status",
        "progress_percent",
        "location_city",
        "location_notes",
        "start_date",
        "estimated_delivery",
        "total_days",
        "remaining_days",
      ].join(","),
    )
    .eq("slug", targetSlug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(`No project found with slug "${targetSlug}"`)
  }

  const [
    { data: phases, error: phasesError },
    { data: activity, error: activityError },
    { data: photos, error: photosError },
    { data: milestones, error: milestonesError },
    { data: teamMembers, error: teamMembersError },
    { data: photoSummary, error: photoSummaryError },
  ] = await Promise.all([
    supabase
      .from("project_phases")
      .select("id, name, progress_percent, status, sort_order")
      .eq("project_id", data.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_activity")
      .select("id, occurred_at, title, description, status")
      .eq("project_id", data.id)
      .order("occurred_at", { ascending: false })
      .limit(10),
    supabase
      .from("project_photos")
      .select("id, url, caption, taken_at, sort_order")
      .eq("project_id", data.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("id, title, scheduled_start, scheduled_end, progress_percent, status, sort_order")
      .eq("project_id", data.id)
      .order("sort_order", { ascending: true }),
    supabase.from("project_team_members").select("status").eq("project_id", data.id),
    supabase.from("project_photos_summary").select("total_photos, last_update").eq("project_id", data.id).maybeSingle(),
  ])

  if (phasesError) throw phasesError
  if (activityError) throw activityError
  if (photosError) throw photosError
  if (milestonesError) throw milestonesError
  if (teamMembersError) throw teamMembersError
  if (photoSummaryError) throw photoSummaryError

  return {
    project: {
      id: data.id,
      name: data.name,
      code: data.code ?? null,
      status: data.status ?? "en_progreso",
      progressPercent: Number(data.progress_percent ?? 0),
      locationCity: data.location_city ?? null,
      locationNotes: data.location_notes ?? null,
      startDate: data.start_date ?? null,
      estimatedDelivery: data.estimated_delivery ?? null,
      totalDays: data.total_days ?? null,
      remainingDays: data.remaining_days ?? null,
    },
    phases:
      phases?.map((phase) => ({
        id: phase.id,
        name: phase.name,
        progressPercent: Number(phase.progress_percent ?? 0),
        status: phase.status as StatusState,
        sortOrder: phase.sort_order ?? 0,
      })) ?? [],
    activity:
      activity?.map((item) => ({
        id: item.id,
        occurredAt: item.occurred_at,
        title: item.title,
        description: item.description,
        status: item.status as ActivityStatus,
      })) ?? [],
    photos:
      photos?.map((photo) => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        takenAt: photo.taken_at,
        sortOrder: photo.sort_order ?? 0,
      })) ?? [],
    milestones:
      milestones?.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        scheduledStart: milestone.scheduled_start,
        scheduledEnd: milestone.scheduled_end,
        progressPercent: Number(milestone.progress_percent ?? 0),
        status: milestone.status as StatusState,
      })) ?? [],
    teamSummary: {
      totalMembers: teamMembers?.length ?? 0,
      activeMembers: teamMembers?.filter((member) => member.status === "online").length ?? 0,
    },
    teamMembers:
      teamMembers?.map((member) => ({
        id: member.team_member?.id ?? member.team_member_id,
        name: member.team_member?.full_name ?? "Miembro Terrazea",
        role: member.team_member?.role ?? "",
        status: member.status ?? "offline",
      })) ?? [],
    photoSummary: {
      totalPhotos: photoSummary?.total_photos ?? null,
      lastUpdate: photoSummary?.last_update ?? null,
    },
  }
}

export async function getDocuments(projectSlug?: string): Promise<DocumentsData> {
  const supabase = createServerSupabaseClient()
  const { projectId } = await resolveProjectId(projectSlug, supabase)

  const [{ data: documents, error: documentsError }, { data: summaryRows, error: summaryError }] = await Promise.all([
    supabase
      .from("project_documents")
      .select("id, name, category, file_type, size_label, uploaded_at, status")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("project_documents_summary")
      .select("category, count")
      .eq("project_id", projectId),
  ])

  if (documentsError) throw documentsError
  if (summaryError) throw summaryError

  const total = summaryRows?.find((row) => row.category === "total")?.count ?? documents?.length ?? 0
  const plans = summaryRows?.find((row) => row.category === "planos")?.count ?? documents?.filter((doc) => doc.category === "Planos").length ?? 0
  const certificates =
    summaryRows?.find((row) => row.category === "certificados")?.count ??
    documents?.filter((doc) => doc.category === "Certificados").length ??
    0
  const warranties =
    summaryRows?.find((row) => row.category === "garantias")?.count ??
    documents?.filter((doc) => doc.category === "Garantías").length ??
    0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newThisWeek =
    documents?.filter((doc) => {
      if (!doc.uploaded_at) return false
      const uploaded = new Date(doc.uploaded_at)
      return uploaded >= sevenDaysAgo
    }).length ?? 0

  return {
    documents:
      documents?.map((doc) => ({
        id: doc.id,
        name: doc.name,
        category: doc.category,
        fileType: doc.file_type,
        sizeLabel: doc.size_label,
        uploadedAt: doc.uploaded_at,
        status: doc.status as DocumentStatus,
      })) ?? [],
    stats: {
      total,
      newThisWeek,
      plans,
      certificates,
      warranties,
    },
  }
}

export async function getMessages(projectSlug?: string): Promise<MessagesData> {
  const supabase = createServerSupabaseClient()
  const { projectId } = await resolveProjectId(projectSlug, supabase)

  const [{ data: conversations, error: conversationsError }, { data: teamMembers, error: teamMembersError }] = await Promise.all([
    supabase
      .from("project_conversations")
      .select("id, team_member_id, unread_count, last_message_preview, last_message_at")
      .eq("project_id", projectId)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("project_team_members")
      .select("team_member_id, status, team_member:team_members(id, full_name, role, avatar_url)")
      .eq("project_id", projectId),
  ])

  if (conversationsError) throw conversationsError
  if (teamMembersError) throw teamMembersError

  const conversationIds = conversations?.map((conversation) => conversation.id) ?? []

  let filteredMessages: Array<{
    id: string
    conversation_id: string
    sender_type: MessageSender
    team_member_id: string | null
    content: string
    sent_at: string
  }> = []

  if (conversationIds.length > 0) {
    const { data: messageRows, error: messagesError } = await supabase
      .from("project_messages")
      .select("id, conversation_id, sender_type, team_member_id, content, sent_at")
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: true })

    if (messagesError) throw messagesError
    filteredMessages = messageRows ?? []
  }

  const teamMemberMap = new Map(
    (teamMembers ?? []).map((member) => [
      member.team_member?.id ?? member.team_member_id,
      {
        id: member.team_member?.id ?? member.team_member_id,
        name: member.team_member?.full_name ?? "",
        role: member.team_member?.role ?? "",
        avatarUrl: member.team_member?.avatar_url ?? null,
        status: member.status ?? "offline",
      },
    ]),
  )

  const conversationSummaries: ConversationSummary[] =
    conversations?.map((conversation) => {
      const teamMember = teamMemberMap.get(conversation.team_member_id)
      return {
        id: conversation.id,
        teamMemberId: conversation.team_member_id,
        name: teamMember?.name ?? "Miembro del equipo",
        role: teamMember?.role ?? "",
        avatarUrl: teamMember?.avatarUrl ?? null,
        lastMessagePreview: conversation.last_message_preview,
        lastMessageAt: conversation.last_message_at,
        unreadCount: conversation.unread_count ?? 0,
        status: teamMember?.status ?? "offline",
      }
    }) ?? []

  const messagesByConversation: Record<string, MessageRow[]> = {}

  for (const message of filteredMessages) {
    if (!messagesByConversation[message.conversation_id]) {
      messagesByConversation[message.conversation_id] = []
    }

    messagesByConversation[message.conversation_id].push({
      id: message.id,
      conversationId: message.conversation_id,
      senderType: message.sender_type as MessageSender,
      teamMemberId: message.team_member_id,
      content: message.content,
      sentAt: message.sent_at,
    })
  }

  for (const key of Object.keys(messagesByConversation)) {
    messagesByConversation[key].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
  }

  return {
    conversations: conversationSummaries,
    messagesByConversation,
  }
}
