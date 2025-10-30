"use client"

import { useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, MoreVertical, Paperclip, Search, Send } from "lucide-react"

import type { MessagesData } from "@/lib/supabase/queries"

export function MessagesView({ data }: { data: MessagesData }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(data.conversations[0]?.id ?? null)
  const [messageInput, setMessageInput] = useState("")

  const selectedConversation = useMemo(
    () => data.conversations.find((conversation) => conversation.id === selectedConversationId) ?? data.conversations[0],
    [data.conversations, selectedConversationId],
  )

  const messages = selectedConversation
    ? data.messagesByConversation[selectedConversation.id] ?? []
    : []

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <span>Dashboard</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#2f4f4f]">Mensajes</span>
        </div>
        <div className="mt-4">
          <h1 className="font-serif text-3xl font-bold text-[#2f4f4f] sm:text-4xl">Mensajes</h1>
          <p className="mt-2 text-lg text-[#6b7280]">Comunícate con tu equipo de construcción</p>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-[#e8e6e0] lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif text-xl text-[#2f4f4f]">Conversaciones</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              <Input placeholder="Buscar mensajes..." className="pl-10 border-[#e8e6e0] focus-visible:ring-[#2f4f4f]" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {data.conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      selectedConversation?.id === conversation.id ? "bg-[#f4f1ea]" : "hover:bg-[#faf8f3]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.avatarUrl || "/placeholder.svg?height=40&width=40"} />
                          <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">
                            {conversation.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.status === "online" && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#2f4f4f]">{conversation.name}</p>
                            <p className="truncate text-xs text-[#6b7280]">{conversation.role}</p>
                          </div>
                          <span className="whitespace-nowrap text-xs text-[#9ca3af]">
                            {formatConversationTime(conversation.lastMessageAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-[#6b7280]">
                            {conversation.lastMessagePreview ?? "Sin mensajes recientes"}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge className="h-5 min-w-[20px] bg-[#2f4f4f] px-1.5 text-xs text-white">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {data.conversations.length === 0 && (
                  <p className="p-4 text-sm text-[#6b7280]">Aún no tienes conversaciones activas.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-[#e8e6e0] lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-[#e8e6e0]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedConversation.avatarUrl || "/placeholder.svg?height=40&width=40"} />
                        <AvatarFallback className="bg-[#c6b89e] text-[#2f4f4f]">
                          {selectedConversation.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConversation.status === "online" && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-[#2f4f4f]">{selectedConversation.name}</CardTitle>
                      <CardDescription className="text-sm">{selectedConversation.role}</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-[#6b7280]">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="flex h-[460px] flex-col">
                  <ScrollArea className="flex-1 px-6 py-6">
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          content={message.content}
                          time={formatMessageTime(message.sentAt)}
                          isOwn={message.senderType === "client"}
                          senderName={
                            message.senderType === "team_member" ? selectedConversation.name : "Tú"
                          }
                        />
                      ))}
                      {messages.length === 0 && (
                        <p className="text-sm text-[#6b7280]">No hay mensajes en esta conversación todavía.</p>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-[#e8e6e0] bg-[#faf8f3] p-4">
                    <div className="space-y-3">
                      <Textarea
                        placeholder={`Escribe un mensaje para ${selectedConversation.name}...`}
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        className="min-h-[120px] resize-none border-[#e8e6e0] bg-white focus-visible:ring-[#2f4f4f]"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" className="text-[#6b7280]">
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button className="bg-[#2f4f4f] text-white hover:bg-[#1f3535]">
                          Enviar
                          <Send className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-full items-center justify-center">
              <p className="text-sm text-[#6b7280]">Selecciona una conversación para comenzar.</p>
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
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isOwn ? "rounded-br-sm bg-[#2f4f4f] text-white" : "rounded-bl-sm bg-white text-[#2f4f4f]"
        }`}
      >
        {!isOwn && <p className="mb-1 text-xs font-semibold text-[#2f4f4f]">{senderName}</p>}
        <p>{content}</p>
        <p className={`${isOwn ? "text-white/70" : "text-[#9ca3af]"} mt-1 text-xs`}>{time}</p>
      </div>
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
