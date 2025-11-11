import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessagesView } from "@/components/messages-view"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"

import { fetchClientMessages, fetchClientProjects, sendClientMessage } from "@app/lib/api/client"
import type { MessagesData } from "@/lib/supabase/queries"
import type { ClientProjectSummary } from "@app/types/client"
import { useAuth } from "@app/context/AuthContext"

export function ClientMessagesPage() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<ClientProjectSummary[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

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
        <Card className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 shadow-apple-xl">
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
      <Card className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 px-6 py-6 shadow-apple-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Tu proyecto</p>
              <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">Mensajes con Terrazea</h1>
              <p className="max-w-2xl text-sm text-[#6B7280]">
                Coordina visitas, resuelve dudas y sigue el avance de tu obra en tiempo real con el equipo Terrazea.
              </p>
            </div>
            {selectedProject ? (
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Proyecto activo</p>
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-[#2F4F4F]">{selectedProject.name}</p>
                  {selectedProject.code ? <p className="text-xs text-[#6B7280]">Código: {selectedProject.code}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="w-full min-w-[240px] rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-5 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
              value={selectedSlug ?? ""}
              onChange={(event) => setSelectedSlug(event.target.value || null)}
              disabled={projects.length === 0}
            >
              <option value="">{projects.length === 0 ? "Sin proyectos disponibles" : "Selecciona un proyecto"}</option>
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-[#E8E6E0] px-5 py-2 text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={() => {
                void handleManualRefresh()
              }}
              disabled={!selectedSlug || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {loading ? "Actualizando" : "Actualizar"}
            </Button>
          </div>
        </div>
      </Card>

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
