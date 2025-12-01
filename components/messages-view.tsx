"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  ChevronRight,
  Loader2,
  Paperclip,
  Search,
  Send,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  FileText,
  File,
  Download,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

import type { MessagesData } from "@/lib/supabase/queries"

interface MessagesViewProps {
  data: MessagesData
  showHeader?: boolean
  initialConversationId?: string | null
  onConversationChange?: (conversationId: string | null) => void
  onSendMessage?: (conversationId: string, content: string) => Promise<void>
  viewerType?: "client" | "team_member"
  clientName?: string | null
  hideConversationList?: boolean
}

export function MessagesView({
  data,
  showHeader = true,
  initialConversationId = null,
  onConversationChange,
  onSendMessage,
  viewerType = "client",
  clientName,
  hideConversationList = false,
}: MessagesViewProps) {
  const isAdminView = viewerType === "team_member"
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId ?? data.conversations[0]?.id ?? null,
  )
  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const showConversationSidebar = !hideConversationList

  useEffect(() => {
    if (initialConversationId && initialConversationId !== selectedConversationId) {
      setSelectedConversationId(initialConversationId)
      return
    }

    if (!initialConversationId) {
      if (selectedConversationId && data.conversations.some((conversation) => conversation.id === selectedConversationId)) {
        return
      }
      const fallbackConversationId = data.conversations[0]?.id ?? null
      if (fallbackConversationId !== selectedConversationId) {
        setSelectedConversationId(fallbackConversationId)
      }
    }
  }, [initialConversationId, data.conversations, selectedConversationId])

  useEffect(() => {
    onConversationChange?.(selectedConversationId ?? null)
  }, [selectedConversationId, onConversationChange])

  const selectedConversation = useMemo(
    () => data.conversations.find((conversation) => conversation.id === selectedConversationId) ?? data.conversations[0],
    [data.conversations, selectedConversationId],
  )

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return data.conversations
    return data.conversations.filter((conversation) => {
      const nameMatch = conversation.name.toLowerCase().includes(normalizedQuery)
      const roleMatch = conversation.role?.toLowerCase().includes(normalizedQuery)
      return nameMatch || roleMatch
    })
  }, [data.conversations, searchQuery])

  const messages = selectedConversation ? data.messagesByConversation[selectedConversation.id] ?? [] : []

  const otherPartyName =
    viewerType === "client"
      ? selectedConversation?.name ?? "tu equipo Terrazea"
      : clientName && clientName.trim().length > 0
        ? clientName
        : "cliente Terrazea"

  const handleSendMessage = async () => {
    if (!onSendMessage || !selectedConversation || sending) return
    const content = messageInput.trim()
    if (!content) return
    try {
      setSending(true)
      await onSendMessage(selectedConversation.id, content)
      setMessageInput("")
    } catch (error) {
      console.error("Error sending message", error)
      toast.error("No se pudo enviar el mensaje. Inténtalo de nuevo.")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!messagesEndRef.current) return
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages, selectedConversationId])

  return (
    <div className="space-y-8">
      {showHeader ? (
        <header>
          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-[#2f4f4f]">Mensajes</span>
          </div>
          <div className="mt-4">
            <h1 className="font-serif text-3xl font-bold text-[#2f4f4f] sm:text-4xl">Mensajes</h1>
            <p className="mt-2 text-lg text-[#6b7280]">
              {isAdminView ? "Responde a tus clientes como si fuera un chat de WhatsApp." : "Comunícate con tu equipo de construcción."}
            </p>
          </div>
        </header>
      ) : null}

      <section className={showConversationSidebar ? "grid gap-6 lg:grid-cols-[360px,1fr]" : "space-y-6"}>
        {showConversationSidebar ? (
          <Card className="border-[#e4dfd5] bg-white/90 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b border-[#f1eee7] pb-5">
              <div>
                <CardTitle className="text-lg text-[#1f2a2a]">Conversaciones</CardTitle>
                <CardDescription className="text-sm text-[#6b7280]">
                  Mantén todo organizado y encuentra chats al instante.
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                <Input
                  placeholder="Buscar nombre o rol"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-full border-[#e8e6e0] bg-[#f4f3ef] pl-11 text-sm text-[#2f4f4f] focus:border-[#1f3535] focus:ring-[#1f3535]/20"
                  aria-label="Buscar conversación"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[640px]">
                <div className="space-y-1 p-3">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        selectedConversation?.id === conversation.id
                          ? "bg-[#d9fdd3]"
                          : "bg-transparent hover:bg-[#f5f6f6]"
                      }`}
                    >
                      <div className="relative flex-shrink-0 self-start">
                        <Avatar className="h-10 w-10 border border-[#e3ddd2]">
                          <AvatarImage src={conversation.avatarUrl || "/placeholder.svg?height=40&width=40"} />
                          <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">
                            {conversation.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.status === "online" && (
                          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-[#25d366]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#111b21]">{conversation.name}</p>
                            <p className="truncate text-xs uppercase tracking-[0.3em] text-[#94a3b8]">
                              {conversation.role}
                            </p>
                          </div>
                          <span className="text-xs text-[#8696a0]">
                            {formatConversationTime(conversation.lastMessageAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-[#62757f]">
                            {conversation.lastMessagePreview ?? "Sin mensajes recientes"}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge className="h-6 min-w-[24px] rounded-full bg-[#2F4F4F] px-2.5 text-xs font-bold text-white shadow-apple">
                              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredConversations.length === 0 && (
                    <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-6 text-center text-sm text-[#6B7280]">
                      {searchQuery.trim().length > 0
                        ? "No encontramos coincidencias. Prueba con otro nombre o rol."
                        : "Aún no tienes conversaciones activas. Cuando crees una, aparecerá aquí."}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : selectedConversation ? (
          <Card className="border-[#e4dfd5] bg-white/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[#1f2a2a]">Tu contacto asignado</CardTitle>
              <CardDescription className="text-sm text-[#6b7280]">
                Siempre hablarás con la misma persona para que no tengas que repetir información.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border border-[#e3ddd2]">
                  <AvatarImage src={selectedConversation.avatarUrl || "/placeholder.svg?height=64&width=64"} />
                  <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f] text-xl">
                    {selectedConversation.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {selectedConversation.status === "online" && (
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-[#25d366]" />
                )}
              </div>
              <div className="space-y-1 text-sm text-[#4b5563]">
                <p className="text-base font-semibold text-[#1f2a2a]">{selectedConversation.name}</p>
                {selectedConversation.role ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-[#94a3b8]">{selectedConversation.role}</p>
                ) : null}
                <p className="text-xs text-[#6b7280]">
                  Último mensaje: {formatConversationTime(selectedConversation.lastMessageAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-[#e4dfd5] bg-white/95 shadow-sm">
          {selectedConversation ? (
            <>
              <CardHeader className="flex flex-col gap-2 border-b border-[#efe9df] bg-white/90">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {viewerType === "client" ? (
                          <>
                            <AvatarImage src={selectedConversation.avatarUrl || "/placeholder.svg?height=40&width=40"} />
                            <AvatarFallback className="bg-[#C6B89E] text-[#2F4F4F]">
                              {selectedConversation.name.charAt(0)}
                            </AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src="/placeholder.svg?height=40&width=40" />
                            <AvatarFallback className="bg-[#C6B89E] text-[#2F4F4F]">
                              {(clientName ?? "Cliente").charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                      {viewerType === "client" && selectedConversation.status === "online" ? (
                        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-[#25d366]" />
                      ) : null}
                    </div>
                    <div>
                      {viewerType === "client" ? (
                        <>
                          <CardTitle className="text-xl text-[#1f2a2a]">{selectedConversation.name}</CardTitle>
                          <CardDescription className="text-sm text-[#6b7280]">{selectedConversation.role}</CardDescription>
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-xl text-[#1f2a2a]">
                            {clientName && clientName.trim().length > 0 ? clientName : "Cliente Terrazea"}
                          </CardTitle>
                          <CardDescription className="text-sm text-[#6b7280]">
                            {`Atención liderada por ${selectedConversation.name}${
                              selectedConversation.role ? ` · ${selectedConversation.role}` : ""
                            }`}
                          </CardDescription>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                      selectedConversation.status === "online"
                        ? "bg-[#d9fdd3] text-[#1a7f37]"
                        : "bg-[#f2f4f5] text-[#6b7280]"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {selectedConversation.status === "online" ? "En línea" : "Desconectado"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-[#6b7280]">
                  <p className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#c6b89e]">Último</span>{" "}
                    {formatConversationTime(selectedConversation.lastMessageAt)}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#c6b89e]">Estado</span>{" "}
                    {selectedConversation.unreadCount > 0 ? "Pendiente" : "Al día"}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="flex h-[540px] flex-col">
                  <ScrollArea className="flex-1 bg-gradient-to-b from-[#ECE5DD] to-[#F5F0E8] px-4 py-6">
                    {messages.length > 0 ? (
                      <div className="space-y-6">
                        {messages.map((message) => {
                          const isOwn =
                            viewerType === "client"
                              ? message.senderType === "client"
                              : message.senderType === "team_member"

                          const senderName =
                            message.senderType === "team_member"
                              ? selectedConversation.name
                              : viewerType === "client"
                                ? "Tú"
                                : clientName && clientName.trim().length > 0
                                  ? clientName
                                  : "Cliente"

                          return (
                            <MessageBubble
                              key={message.id}
                              content={message.content}
                              time={formatMessageTime(message.sentAt)}
                              isOwn={isOwn}
                              senderName={senderName}
                            />
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] border border-dashed border-[#e8e6e0] bg-white/80 p-10 text-center text-sm text-[#6b7280]">
                        Aún no hay mensajes en esta conversación. Sé el primero en saludar.
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t border-[#e8e6e0] bg-white/95 px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs text-[#94a3b8]">
                        Presiona Enter para enviar o Shift + Enter para salto de línea.
                      </p>
                      {messageInput.trim().length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          <Clock className="h-3 w-3" />
                          <span>Escribiendo...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end gap-3">
                      <Textarea
                        placeholder={`Escribe un mensaje para ${otherPartyName}...`}
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault()
                            void handleSendMessage()
                          }
                        }}
                        disabled={!onSendMessage || !selectedConversation || sending}
                        className="max-h-32 min-h-[56px] w-full resize-none rounded-2xl border border-transparent bg-[#f0f2f5] px-4 py-3 text-sm text-[#1f2a2a] shadow-inner focus-visible:ring-[#1f3535] disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full text-[#94a3b8] hover:text-[#1f3535]"
                          disabled
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white hover:bg-[#1daa57]"
                          onClick={() => {
                            void handleSendMessage()
                          }}
                          disabled={
                            !onSendMessage ||
                            !selectedConversation ||
                            sending ||
                            messageInput.trim().length === 0
                          }
                          aria-label="Enviar mensaje"
                        >
                          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-full items-center justify-center">
              <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] px-10 py-12 text-center text-sm text-[#6B7280]">
                Selecciona una conversación para comenzar.
              </div>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  )
}

function MessageBubble({
  content,
  time,
  senderName,
  isOwn,
}: {
  content: string
  time: string
  senderName: string
  isOwn: boolean
}) {
  // Detectar si el mensaje contiene URLs de imágenes o archivos
  const imageUrlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i)
  const fileUrlMatch = content.match(/https?:\/\/[^\s]+\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)
  const hasAttachment = imageUrlMatch || fileUrlMatch

  // Estado del mensaje (simulado - en producción vendría del backend)
  const messageStatus: "sending" | "sent" | "delivered" | "read" = "read"

  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0 border border-[#E8E6E0]">
          <AvatarFallback className="bg-[#C6B89E] text-xs text-[#2F4F4F]">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex max-w-[75%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6B7280]">{senderName}</p>
        )}

        <div
          className={`group relative rounded-2xl px-4 py-3 text-sm shadow-apple-md transition-all duration-200 ${
            isOwn
              ? "rounded-br-md bg-gradient-to-br from-[#D9FDD3] to-[#C7F9CC] text-[#111b21]"
              : "rounded-bl-md bg-white text-[#111b21]"
          }`}
        >
          {/* Preview de imagen */}
          {imageUrlMatch && (
            <div className="mb-3 overflow-hidden rounded-[1rem] border border-[#E8E6E0]">
              <img
                src={imageUrlMatch[0]}
                alt="Imagen adjunta"
                className="max-h-64 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          )}

          {/* Preview de archivo */}
          {fileUrlMatch && !imageUrlMatch && (
            <div className="mb-3 flex items-center gap-3 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2F4F4F] text-white">
                <File className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-[#2F4F4F]">Archivo adjunto</p>
                <p className="text-[10px] text-[#6B7280]">{fileUrlMatch[0].split("/").pop()}</p>
              </div>
              <a
                href={fileUrlMatch[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-[#2F4F4F] transition hover:bg-[#E8E6E0]"
                title="Descargar archivo"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Contenido del mensaje */}
          <p className="whitespace-pre-line leading-relaxed">{content.replace(/https?:\/\/[^\s]+/g, "").trim() || content}</p>

          {/* Footer con hora y estado */}
          <div className={`mt-2 flex items-center gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className={`text-[11px] ${isOwn ? "text-[#667781]" : "text-[#94a3b8]"}`}>{time}</span>
            {isOwn && (
              <div className="flex items-center">
                {messageStatus === "sending" && <Clock className="h-3 w-3 text-[#94a3b8]" />}
                {messageStatus === "sent" && <Check className="h-3.5 w-3.5 text-[#94a3b8]" />}
                {messageStatus === "delivered" && <CheckCheck className="h-3.5 w-3.5 text-[#94a3b8]" />}
                {messageStatus === "read" && <CheckCheck className="h-3.5 w-3.5 text-[#25d366]" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwn && (
        <Avatar className="h-8 w-8 shrink-0 border border-[#E8E6E0]">
          <AvatarFallback className="bg-[#2F4F4F] text-xs text-white">Tú</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

function formatConversationTime(value: string | null): string {
  if (!value) return "Sin fecha"
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }

  if (diffHours < 48) {
    return "Ayer"
  }

  if (diffHours < 24 * 7) {
    return `${Math.floor(diffHours / 24)} día${Math.floor(diffHours / 24) === 1 ? "" : "s"}`
  }

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}
