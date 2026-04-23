import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { MessagesView } from "@/components/messages-view"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import { fetchClientMessages, fetchClientProjects, sendClientMessage } from "@app/lib/api/client"
import type { MessagesData } from "@/lib/supabase/queries"
import type { ClientProjectSummary } from "@app/types/client"
import { useAuth } from "@app/context/AuthContext"
import { ClientPageHeader } from "@/components/client/client-page-header"

export function ClientMessagesPage() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<ClientProjectSummary[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const primaryContact = messages?.conversations[0] ?? null

  useEffect(() => {
    void (async () => {
      try {
        const projectList = await fetchClientProjects()
        setProjects(projectList)
        if (projectList.length > 0) {
          setSelectedSlug((current) => current ?? projectList[0].slug)
        } else {
          setLoading(false)
        }
      } catch (requestError) {
        console.error("Error fetching client projects", requestError)
        toast.error("No se pudieron cargar tus proyectos.")
        setLoading(false)
      }
    })()
  }, [])

  const loadMessages = useCallback(
    async (slug: string | null) => {
      if (!slug) {
        setMessages(null)
        setActiveConversationId(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await fetchClientMessages(slug)

        if (response.activeProjectSlug && response.activeProjectSlug !== slug) {
          setSelectedSlug(response.activeProjectSlug)
        }

        const data = response.messages
        setMessages(data)
        setActiveConversationId((current) => {
          if (!data) return null
          if (current && data.conversations.some((conversation) => conversation.id === current)) {
            return current
          }
          return data.conversations[0]?.id ?? null
        })
      } catch (requestError) {
        console.error("Error fetching client messages", requestError)
        setError("No se pudieron cargar tus mensajes.")
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

  const handleManualRefresh = async () => {
    await loadMessages(selectedSlug ?? null)
  }

  const handleSendMessage = async (conversationId: string, content: string) => {
    if (!selectedSlug) {
      throw new Error("Selecciona un proyecto para enviar mensajes.")
    }
    await sendClientMessage(conversationId, content)
    setActiveConversationId(conversationId)
    await loadMessages(selectedSlug)
  }

  const handleConversationChange = (conversationId: string | null) => {
    setActiveConversationId(conversationId)
  }

  if (!loading && projects.length === 0) {
    return (
      <div className="space-y-6 pb-16">
        <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/90 p-10 shadow-apple-md">
          <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Conversaciones con tu equipo</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Aún no hay proyectos Terrazea vinculados a tu cuenta. En cuanto tengas uno activo, podrás conversar con el equipo desde aquí.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <ClientPageHeader
        overline="Comunicación"
        title="Mensajes con Terrazea"
        description="Coordina visitas, resuelve dudas y sigue el avance de tu obra en tiempo real con tu persona de referencia."
        icon={MessageSquare}
        projects={projects}
        selectedSlug={selectedSlug}
        onSelectedSlugChange={setSelectedSlug}
        onRefresh={() => void handleManualRefresh()}
        refreshing={loading}
      >
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedProject ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1 text-xs text-[#4B5563]">
              <span className="font-semibold text-[#2F4F4F]">{selectedProject.name}</span>
              {selectedProject.code ? <span className="text-[#9CA3AF]">· {selectedProject.code}</span> : null}
            </span>
          ) : null}
          {primaryContact ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1 text-xs text-[#4B5563]">
              <span className="font-semibold text-[#2F4F4F]">PM:</span>
              <span>{primaryContact.name}</span>
              {primaryContact.role ? <span className="text-[#9CA3AF]">· {primaryContact.role}</span> : null}
            </span>
          ) : null}
        </div>
      </ClientPageHeader>

      {loading ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tus conversaciones…
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
          viewerType="client"
          clientName={session?.name ?? null}
          initialConversationId={activeConversationId}
          onConversationChange={handleConversationChange}
          onSendMessage={handleSendMessage}
          hideConversationList
        />
      ) : (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para comenzar a conversar con el equipo Terrazea.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
