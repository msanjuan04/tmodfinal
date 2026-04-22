"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  File as FileIcon,
  Loader2,
  MessageSquare,
  Search,
  Send,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { MessagesData } from "@/lib/supabase/queries"

type MessageEntry = MessagesData["messagesByConversation"][string][number]

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
  showHeader = false,
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
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const showSidebar = !hideConversationList

  useEffect(() => {
    if (initialConversationId && initialConversationId !== selectedConversationId) {
      setSelectedConversationId(initialConversationId)
      return
    }
    if (!initialConversationId) {
      if (selectedConversationId && data.conversations.some((c) => c.id === selectedConversationId)) return
      const fallback = data.conversations[0]?.id ?? null
      if (fallback !== selectedConversationId) setSelectedConversationId(fallback)
    }
  }, [initialConversationId, data.conversations, selectedConversationId])

  useEffect(() => {
    onConversationChange?.(selectedConversationId ?? null)
  }, [selectedConversationId, onConversationChange])

  const selectedConversation = useMemo(
    () => data.conversations.find((c) => c.id === selectedConversationId) ?? data.conversations[0],
    [data.conversations, selectedConversationId],
  )

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return data.conversations
    return data.conversations.filter((c) => {
      const name = c.name.toLowerCase().includes(q)
      const role = c.role?.toLowerCase().includes(q)
      return name || role
    })
  }, [data.conversations, searchQuery])

  const messages = selectedConversation ? data.messagesByConversation[selectedConversation.id] ?? [] : []

  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages])

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
      // Regresar foco al textarea
      setTimeout(() => textareaRef.current?.focus(), 0)
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
  }, [messages.length, selectedConversationId])

  // Cuando el usuario abre una conversación en mobile, mostramos el panel del thread
  useEffect(() => {
    if (selectedConversationId) setMobileShowThread(true)
  }, [selectedConversationId])

  const unreadTotal = data.conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)

  return (
    <div className="space-y-4">
      {showHeader ? (
        <header>
          <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F] sm:text-4xl">Mensajes</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {isAdminView ? "Responde a tus clientes en un solo lugar." : "Comunícate con tu equipo Terrazea."}
          </p>
        </header>
      ) : null}

      <section
        className={cn(
          "grid h-[calc(100vh-260px)] min-h-[560px] overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white shadow-apple-md",
          showSidebar ? "md:grid-cols-[340px_1fr]" : "grid-cols-1",
        )}
      >
        {/* ================== Sidebar de conversaciones ================== */}
        {showSidebar ? (
          <aside
            className={cn(
              "flex flex-col border-r border-[#E8E6E0] bg-[#FAFAF8]",
              // Mobile: se muestra si NO estamos viendo el thread
              "md:flex",
              mobileShowThread ? "hidden" : "flex",
            )}
          >
            <div className="border-b border-[#E8E6E0] bg-white px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-[#2F4F4F]">
                  <MessageSquare className="h-4 w-4" />
                  Conversaciones
                </h3>
                {unreadTotal > 0 ? (
                  <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#B91C1C] px-1.5 text-[10px] font-bold text-white">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                <Input
                  placeholder="Buscar"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-full border-[#E8E6E0] bg-[#F8F7F4] pl-8 pr-8 text-xs text-[#2F4F4F] focus:border-[#2F4F4F]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#9CA3AF] hover:bg-[#E8E6E0]"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-0.5 p-2">
                {filteredConversations.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-white px-4 py-10 text-center text-xs text-[#6B7280]">
                    {searchQuery.trim()
                      ? "No hay coincidencias."
                      : "Aún no tienes conversaciones."}
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isActive = selectedConversation?.id === conversation.id
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                          isActive
                            ? "bg-[#2F4F4F] text-white shadow-apple-sm"
                            : "text-[#4B5563] hover:bg-white hover:text-[#2F4F4F]",
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar
                            className={cn(
                              "h-10 w-10 border",
                              isActive ? "border-white/30" : "border-[#E8E6E0]",
                            )}
                          >
                            <AvatarImage src={conversation.avatarUrl || undefined} />
                            <AvatarFallback
                              className={cn(
                                "text-xs font-semibold",
                                isActive ? "bg-white/20 text-white" : "bg-[#F4F1EA] text-[#2F4F4F]",
                              )}
                            >
                              {getInitials(conversation.name)}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.status === "online" ? (
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2",
                                isActive ? "border-[#2F4F4F] bg-[#C7F9CC]" : "border-white bg-[#047857]",
                              )}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-sm font-semibold",
                                isActive ? "text-white" : "text-[#2F4F4F]",
                              )}
                            >
                              {conversation.name}
                            </p>
                            <span
                              className={cn(
                                "shrink-0 text-[10px]",
                                isActive ? "text-white/70" : "text-[#9CA3AF]",
                              )}
                            >
                              {formatConversationTime(conversation.lastMessageAt)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-xs",
                                isActive ? "text-white/80" : "text-[#6B7280]",
                              )}
                            >
                              {conversation.lastMessagePreview ?? "Sin mensajes aún"}
                            </p>
                            {conversation.unreadCount > 0 && !isActive ? (
                              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#2F4F4F] px-1.5 text-[10px] font-bold text-white">
                                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          {conversation.role ? (
                            <p
                              className={cn(
                                "mt-1 truncate text-[10px] uppercase tracking-[0.2em]",
                                isActive ? "text-white/60" : "text-[#C6B89E]",
                              )}
                            >
                              {conversation.role}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </aside>
        ) : null}

        {/* ================== Panel del hilo ================== */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            showSidebar && !mobileShowThread ? "hidden md:flex" : "flex",
          )}
        >
          {selectedConversation ? (
            <>
              {/* Header del hilo */}
              <header className="flex items-center gap-3 border-b border-[#E8E6E0] bg-white px-5 py-4">
                {showSidebar ? (
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] transition hover:bg-[#F4F1EA] md:hidden"
                    aria-label="Volver a conversaciones"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 border border-[#E8E6E0]">
                    {viewerType === "client" ? (
                      <>
                        <AvatarImage src={selectedConversation.avatarUrl || undefined} />
                        <AvatarFallback className="bg-[#F4F1EA] text-xs font-semibold text-[#2F4F4F]">
                          {getInitials(selectedConversation.name)}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-[#F4F1EA] text-xs font-semibold text-[#2F4F4F]">
                          {getInitials(clientName ?? "Cliente")}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {viewerType === "client" && selectedConversation.status === "online" ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#047857]" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  {viewerType === "client" ? (
                    <>
                      <p className="font-heading text-base font-semibold text-[#2F4F4F]">
                        {selectedConversation.name}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        {selectedConversation.role ?? "Tu equipo Terrazea"}
                        {selectedConversation.status === "online" ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[#047857]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#047857]" />
                            En línea
                          </span>
                        ) : null}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-heading text-base font-semibold text-[#2F4F4F]">
                        {clientName && clientName.trim().length > 0 ? clientName : "Cliente Terrazea"}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">
                        Atiende: {selectedConversation.name}
                        {selectedConversation.role ? ` · ${selectedConversation.role}` : ""}
                      </p>
                    </>
                  )}
                </div>
              </header>

              {/* Mensajes */}
              <ScrollArea className="flex-1 bg-[#F4F1EA]">
                <div className="space-y-5 px-5 py-6">
                  {messages.length === 0 ? (
                    <EmptyThreadState isAdminView={isAdminView} otherName={otherPartyName} />
                  ) : (
                    messageGroups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <DayDivider label={group.label} />
                        {group.items.map((message) => {
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
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t border-[#E8E6E0] bg-white px-4 py-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder={`Mensaje para ${otherPartyName}…`}
                    disabled={!onSendMessage || !selectedConversation || sending}
                    rows={1}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2.5 text-sm text-[#2F4F4F] focus-visible:ring-[#2F4F4F]/20 disabled:opacity-60"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={
                      !onSendMessage ||
                      !selectedConversation ||
                      sending ||
                      messageInput.trim().length === 0
                    }
                    aria-label="Enviar mensaje"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F4F4F] text-white transition hover:bg-[#1F3535] disabled:bg-[#E8E6E0] disabled:text-[#9CA3AF]"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-[#9CA3AF]">
                  <kbd className="rounded bg-[#F8F7F4] px-1.5 py-0.5 font-mono text-[9px] text-[#4B5563]">Enter</kbd>{" "}
                  enviar ·{" "}
                  <kbd className="rounded bg-[#F8F7F4] px-1.5 py-0.5 font-mono text-[9px] text-[#4B5563]">
                    Shift + Enter
                  </kbd>{" "}
                  nueva línea
                </p>
              </div>
            </>
          ) : (
            <EmptySelectedState />
          )}
        </div>
      </section>
    </div>
  )
}

// ============================= Subcomponentes =============================

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
  const imageMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i)
  const fileMatch = content.match(/https?:\/\/[^\s]+\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)
  const cleanText = content.replace(/https?:\/\/[^\s]+/g, "").trim() || (imageMatch || fileMatch ? "" : content)

  return (
    <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn ? (
        <Avatar className="h-7 w-7 shrink-0 border border-[#E8E6E0]">
          <AvatarFallback className="bg-white text-[10px] font-semibold text-[#2F4F4F]">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      ) : null}

      <div className={cn("flex max-w-[75%] flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-apple-sm",
            isOwn
              ? "rounded-br-md bg-[#2F4F4F] text-white"
              : "rounded-bl-md border border-[#E8E6E0] bg-white text-[#2F4F4F]",
          )}
        >
          {imageMatch ? (
            <div className="mb-2 overflow-hidden rounded-[0.85rem] border border-white/10">
              <img
                src={imageMatch[0]}
                alt="Imagen adjunta"
                className="max-h-64 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          ) : null}

          {fileMatch && !imageMatch ? (
            <a
              href={fileMatch[0]}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mb-2 flex items-center gap-2 rounded-[0.85rem] p-2.5 text-xs transition",
                isOwn
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "border border-[#E8E6E0] bg-[#F8F7F4] text-[#2F4F4F] hover:bg-[#F4F1EA]",
              )}
            >
              <FileIcon className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{fileMatch[0].split("/").pop()}</span>
              <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </a>
          ) : null}

          {cleanText ? (
            <p className="whitespace-pre-line break-words">{cleanText}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 px-1 text-[10px]",
            isOwn ? "text-[#9CA3AF]" : "text-[#9CA3AF]",
          )}
        >
          <span>{time}</span>
          {isOwn ? <CheckCheck className="h-3 w-3 text-[#047857]" /> : null}
        </div>
      </div>
    </div>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center">
      <span className="rounded-full border border-[#E8E6E0] bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280] shadow-apple-sm backdrop-blur">
        {label}
      </span>
    </div>
  )
}

function EmptyThreadState({ isAdminView, otherName }: { isAdminView: boolean; otherName: string }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-[#E8E6E0] bg-white/60 px-6 py-10 text-center backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <MessageSquare className="h-5 w-5" />
      </div>
      <div>
        <p className="font-heading text-sm font-semibold text-[#2F4F4F]">
          Sin mensajes en este hilo
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          {isAdminView
            ? `Envía un primer mensaje a ${otherName} para abrir la conversación.`
            : `Escribe un mensaje para ${otherName}. Te responderán cuando estén disponibles.`}
        </p>
      </div>
    </div>
  )
}

function EmptySelectedState() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#F8F7F4] p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#2F4F4F] shadow-apple-md">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="font-heading text-lg font-semibold text-[#2F4F4F]">
          Selecciona una conversación
        </p>
        <p className="text-sm text-[#6B7280]">
          Elige un contacto de la lista de la izquierda para ver los mensajes y responder.
        </p>
      </div>
    </div>
  )
}

// ============================= Utils =============================

function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatConversationTime(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }
  if (diffHours < 48) return "Ayer"
  if (diffHours < 24 * 7) return `Hace ${Math.floor(diffHours / 24)}d`
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

/** Agrupa mensajes por día natural con etiqueta legible ("Hoy", "Ayer", "22 abr 2026"). */
function groupMessagesByDay(
  messages: MessageEntry[],
): Array<{ key: string; label: string; items: MessageEntry[] }> {
  if (messages.length === 0) return []
  const groups: Record<string, { key: string; label: string; items: MessageEntry[] }> = {}
  const order: string[] = []
  const today = stripTime(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  messages.forEach((msg) => {
    const date = new Date(msg.sentAt)
    if (Number.isNaN(date.getTime())) return
    const key = date.toISOString().slice(0, 10)
    if (!groups[key]) {
      const stripped = stripTime(date)
      const label =
        stripped.getTime() === today.getTime()
          ? "Hoy"
          : stripped.getTime() === yesterday.getTime()
            ? "Ayer"
            : date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
      groups[key] = { key, label, items: [] }
      order.push(key)
    }
    groups[key].items.push(msg)
  })
  return order.map((key) => groups[key])
}

function stripTime(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
