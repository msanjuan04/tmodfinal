import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessagesView } from "@/components/messages-view"
import { Loader2, MessageSquare, MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"

import { fetchAdminMessages, fetchAdminTeamMembers, createAdminConversation, sendAdminMessage } from "@app/lib/api/admin"
import { listProjectCalendarSummaries } from "@app/lib/api/events"
import type { MessagesData } from "@/lib/supabase/queries"
import type { AdminProjectTeamMember } from "@app/types/admin"

export function AdminMessagesPage() {
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectCalendarSummaries>>>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<AdminProjectTeamMember[]>([])
  const [newConversationMemberId, setNewConversationMemberId] = useState<string>("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

  useEffect(() => {
    void (async () => {
      try {
        const items = await listProjectCalendarSummaries()
        setProjects(items)
        if (items.length > 0) {
          setSelectedSlug((current) => current ?? items[0].slug)
        }
      } catch (requestError) {
        console.error("Error fetching project summaries", requestError)
      }
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const members = await fetchAdminTeamMembers()
        setTeamMembers(members)
      } catch (requestError) {
        console.error("Error fetching team members", requestError)
        toast.error("No se pudieron cargar los miembros del equipo.")
      }
    })()
  }, [])

  const loadMessages = useCallback(
    async (slug: string | null) => {
      if (!slug) {
        setMessages(null)
        setLoading(false)
        setActiveConversationId(null)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await fetchAdminMessages(slug)
        setMessages(data)
        setActiveConversationId((current) => {
          if (current && data.conversations.some((conversation) => conversation.id === current)) {
            return current
          }
          return data.conversations[0]?.id ?? null
        })
      } catch (requestError) {
        console.error("Error fetching admin messages", requestError)
        setError("No se pudo cargar los mensajes del proyecto seleccionado.")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setActiveConversationId(null)
    void loadMessages(selectedSlug ?? null)
  }, [loadMessages, selectedSlug])

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project.slug,
        label: `${project.name}${project.clientName ? ` · ${project.clientName}` : ""}`,
      })),
    [projects],
  )

  const availableTeamMembers = useMemo(() => {
    if (!messages) {
      return teamMembers
    }
    const usedIds = new Set(messages.conversations.map((conversation) => conversation.teamMemberId))
    return teamMembers.filter((member) => !usedIds.has(member.id))
  }, [teamMembers, messages])

  useEffect(() => {
    if (availableTeamMembers.length === 0) {
      setNewConversationMemberId("")
      return
    }
    setNewConversationMemberId((current) =>
      current && availableTeamMembers.some((member) => member.id === current)
        ? current
        : availableTeamMembers[0].id,
    )
  }, [availableTeamMembers])

  const handleManualRefresh = async () => {
    await loadMessages(selectedSlug ?? null)
  }

  const handleCreateConversation = async () => {
    if (!selectedSlug) {
      toast.error("Selecciona un proyecto para iniciar una conversación.")
      return
    }

    if (!newConversationMemberId) {
      toast.error("Selecciona un miembro del equipo.")
      return
    }

    try {
      setCreatingConversation(true)
      const response = await createAdminConversation(selectedSlug, newConversationMemberId)
      setActiveConversationId(response.conversationId)
      await loadMessages(selectedSlug)
      toast.success("Conversación creada correctamente.")
    } catch (error) {
      console.error("Error creating conversation", error)
      toast.error("No se pudo crear la conversación.")
    } finally {
      setCreatingConversation(false)
    }
  }

  const handleSendMessage = async (conversationId: string, content: string) => {
    if (!selectedSlug) {
      throw new Error("Debes seleccionar un proyecto.")
    }
    await sendAdminMessage(conversationId, content)
    setActiveConversationId(conversationId)
    await loadMessages(selectedSlug)
  }

  const handleConversationChange = (conversationId: string | null) => {
    setActiveConversationId(conversationId)
  }

  const conversationsCount = messages?.conversations.length ?? 0
  const unreadTotal = messages?.conversations.reduce((sum, conversation) => sum + (conversation.unreadCount ?? 0), 0) ?? 0
  const lastActivity = useMemo(() => {
    const last = messages?.conversations
      .map((conversation) => conversation.lastMessageAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)
    if (!last) return "Sin actividad reciente"
    return formatRelativeTime(last)
  }, [messages])

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
                <MessageSquare className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                Comunicación
              </p>
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
              Mensajes con el equipo
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#6B7280]">
              Gestiona conversaciones con clientes y colaboradores. Filtra por proyecto para revisar el historial y dar seguimiento a cada hilo.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <StatPill label="Conversaciones" value={conversationsCount.toString()} helper="Activas" />
              <StatPill label="Sin leer" value={unreadTotal.toString()} helper="Pendientes" />
              <StatPill label="Última actividad" value={lastActivity} helper="" />
            </div>
            {selectedProject ? (
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-1.5 text-xs text-[#4B5563]">
                <span className="font-semibold text-[#2F4F4F]">{selectedProject.name}</span>
                {selectedProject.clientName ? (
                  <span className="text-[#9CA3AF]">· {selectedProject.clientName}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[260px]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="h-10 w-full min-w-[220px] rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                value={selectedSlug ?? ""}
                onChange={(event) => setSelectedSlug(event.target.value || null)}
              >
                <option value="">{projectOptions.length === 0 ? "Sin proyectos disponibles" : "Selecciona un proyecto"}</option>
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[#E8E6E0] bg-white px-4 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
                onClick={() => void handleManualRefresh()}
                disabled={!selectedSlug || loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                {loading ? "Actualizando" : "Actualizar"}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="h-10 w-full min-w-[220px] rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20 disabled:cursor-not-allowed disabled:opacity-60"
                value={newConversationMemberId}
                onChange={(event) => setNewConversationMemberId(event.target.value)}
                disabled={!selectedSlug || availableTeamMembers.length === 0}
              >
                <option value="">
                  {!selectedSlug
                    ? "Selecciona un proyecto"
                    : availableTeamMembers.length === 0
                      ? "Todos ya tienen conversación"
                      : "Nueva conversación…"}
                </option>
                {availableTeamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.role}
                  </option>
                ))}
              </select>
              <Button
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#2F4F4F] px-4 text-xs font-semibold text-white hover:bg-[#1F3535]"
                onClick={() => void handleCreateConversation()}
                disabled={
                  !selectedSlug || !newConversationMemberId || creatingConversation || availableTeamMembers.length === 0
                }
              >
                {creatingConversation ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                )}
                {creatingConversation ? "Creando…" : "Nueva"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando mensajes…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[1.25rem] border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-8 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : messages ? (
        <MessagesView
          data={messages}
          showHeader={false}
          viewerType="team_member"
          clientName={selectedProject?.clientName ?? null}
          initialConversationId={activeConversationId}
          onConversationChange={handleConversationChange}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="space-y-3 py-12 text-center text-sm text-[#6B7280]">
            <p>Selecciona un proyecto para revisar sus conversaciones.</p>
            {projects.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">Aún no hay proyectos disponibles.</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatPill({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#C6B89E]">{label}</p>
        <p className="text-lg font-semibold text-[#2F4F4F]">{value}</p>
      </div>
      {helper ? <p className="text-[11px] text-[#9CA3AF]">{helper}</p> : null}
    </div>
  )
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / (1000 * 60))
  if (minutes < 1) return "Hace un momento"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return "Ayer"
  if (days < 7) return `Hace ${days} días`
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}
