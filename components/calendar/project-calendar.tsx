"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { es } from "date-fns/locale"
import { format, isSameDay, parseISO } from "date-fns"

import type { ProjectEvent } from "@app/types/events"
import { cn } from "@/lib/utils"
import { EventFormModal } from "./event-form-modal"

interface ProjectCalendarProps {
  events: ProjectEvent[]
  projectName?: string
  headerContent?: React.ReactNode
  showVisibility?: boolean
  getEventSecondaryLine?: (event: ProjectEvent) => React.ReactNode
  getUpcomingSecondaryLine?: (event: ProjectEvent) => React.ReactNode
  projectId?: string
  projectSlug?: string
  showAdminControls?: boolean
  assistantProjectUrl?: string
  onAssistantOpenProject?: (projectId?: string) => void
  onAssistantCreateTask?: (projectId?: string) => void
  showAssistant?: boolean
}

function safeParseISO(value: string) {
  const date = parseISO(value)
  return isNaN(date.getTime()) ? null : date
}

function getDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function visibilityBadge(visibility: ProjectEvent["visibility"]) {
  if (visibility === "internal") {
    return <span className="rounded-full bg-[#FFE4E6] px-2 py-0.5 text-xs font-medium text-[#DB2777]">Interno</span>
  }
  return <span className="rounded-full bg-[#E0F2F1] px-2 py-0.5 text-xs font-medium text-[#0D9488]">Cliente</span>
}

const ASSISTANT_HISTORY_PREFIX = "terrazea-assistant-history"
const ASSISTANT_STATS_KEY = "terrazea-assistant-stats"
const ASSISTANT_HISTORY_LIMIT = 60

type AssistantIntent = "upcoming" | "tasks" | "docs" | "status" | "documentation" | "fallback"

type AssistantReply = {
  message: string
  intent: AssistantIntent
}

type AssistantMessage = {
  id: string
  sender: "assistant" | "user"
  text: string
  timestamp: string
}

export function ProjectCalendar({
  events,
  projectName,
  headerContent,
  showVisibility = false,
  getEventSecondaryLine,
  getUpcomingSecondaryLine,
  projectId,
  projectSlug,
  showAdminControls = false,
  assistantProjectUrl,
  onAssistantOpenProject,
  onAssistantCreateTask,
  showAssistant = true,
}: ProjectCalendarProps) {
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ProjectEvent[]>()
    events.forEach((event) => {
      const parsed = safeParseISO(event.startsAt)
      if (!parsed) return
      const key = getDateKey(parsed)
      const existing = grouped.get(key) ?? []
      grouped.set(key, [...existing, event])
    })
    return grouped
  }, [events])

  const selectableDates = useMemo(() => {
    return Array.from(eventsByDate.keys())
      .map((key) => {
        const parsed = parseISO(key)
        return isNaN(parsed.getTime()) ? null : parsed
      })
      .filter((date): date is Date => Boolean(date))
  }, [eventsByDate])

  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (selectableDates.length > 0) {
      return selectableDates[0]
    }
    const today = new Date()
    return today
  })

  const selectedKey = selectedDate ? getDateKey(selectedDate) : null
  const selectedEvents = selectedKey ? eventsByDate.get(selectedKey) ?? [] : []
  const nextUpcomingEvent = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return events
      .map((event) => {
        const start = safeParseISO(event.startsAt)
        return start ? { event, start } : null
      })
      .filter((entry): entry is { event: ProjectEvent; start: Date } => Boolean(entry))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .find((entry) => entry.start.getTime() >= todayStart.getTime())
  }, [events])

  const assistantHistoryKey = useMemo(
    () => `${ASSISTANT_HISTORY_PREFIX}:${projectId ?? "global"}`,
    [projectId],
  )
  const defaultAssistantMessage = useMemo<AssistantMessage>(
    () => ({
      id: `assistant-initial-${assistantHistoryKey}`,
      sender: "assistant",
      text: "Hola, soy Terra. Pregúntame por el estado del proyecto, próximos hitos o documentación clave y te respondo al instante.",
      timestamp: format(new Date(), "HH:mm", { locale: es }),
    }),
    [assistantHistoryKey],
  )
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([defaultAssistantMessage])
  const [assistantInput, setAssistantInput] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") {
      setAssistantMessages([defaultAssistantMessage])
      return
    }
    try {
      const stored = window.localStorage.getItem(assistantHistoryKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssistantMessages(parsed)
          return
        }
      }
    } catch (error) {
      console.error("No pudimos recuperar el historial del asistente Terra:", error)
    }
    setAssistantMessages([defaultAssistantMessage])
  }, [assistantHistoryKey, defaultAssistantMessage])

  useEffect(() => {
    if (!assistantMessages.length || typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        assistantHistoryKey,
        JSON.stringify(assistantMessages.slice(-ASSISTANT_HISTORY_LIMIT)),
      )
    } catch (error) {
      console.error("No pudimos guardar el historial del asistente Terra:", error)
    }
  }, [assistantHistoryKey, assistantMessages])

  const getAssistantReply = useCallback(
    (question: string): AssistantReply => {
      const normalized = question.toLowerCase()
      if (normalized.includes("hito") || normalized.includes("próximo") || normalized.includes("agenda")) {
        if (nextUpcomingEvent) {
          return {
            message: `El próximo hito es “${nextUpcomingEvent.event.title}” el ${format(nextUpcomingEvent.start, "d 'de' MMMM", { locale: es })} a las ${format(nextUpcomingEvent.start, "HH:mm")} (${nextUpcomingEvent.event.eventType}).`,
            intent: "upcoming",
          }
        }
        return {
          message: "No tengo ningún hito futuro en el calendario. Podemos crear uno nuevo cuando lo necesites.",
          intent: "upcoming",
        }
      }
      if (normalized.includes("tarea") || normalized.includes("pendiente")) {
        if (selectedEvents.length > 0 && selectedDate) {
          return {
            message: `Para el ${format(selectedDate, "d 'de' MMMM", { locale: es })} veo ${selectedEvents.length} tareas u hitos activos. Puedes abrir cualquiera para editarlos o registrarlos como completados.`,
            intent: "tasks",
          }
        }
        return {
          message: "Hoy no hay tareas planificadas. Revisa la vista de próximos eventos o crea una nueva tarea para mantener el avance.",
          intent: "tasks",
        }
      }
      if (normalized.includes("documentación") || normalized.includes("documento") || normalized.includes("manual")) {
        return {
          message: "La documentación del proyecto está en la carpeta compartida de Terrazea. Si necesitas que vincule un archivo a un hito específico, indícame cuál.",
          intent: "documentation",
        }
      }
      if (normalized.includes("estado") || normalized.includes("resumen") || normalized.includes("avance")) {
        if (events.length === 0) {
          return {
            message: "Aún no hay eventos en este proyecto, así que el estado general es de preparación. Cuando registremos visitas o entregas aquí podrás ver el resumen instantáneo.",
            intent: "status",
          }
        }
        return {
          message: `Tenemos ${events.length} eventos registrados. El monitoreo luce estable y el siguiente paso es ${
            nextUpcomingEvent ? `preparar ${nextUpcomingEvent.event.title}` : "programar el siguiente hito"
          }.`,
          intent: "status",
        }
      }
      if (normalized.includes("document")) {
        return {
          message: "Puedo enlazarte a la documentación estándar de Terrazea o a las guías de cliente. Indícame qué entregable necesitas y te lo preparo.",
          intent: "docs",
        }
      }
      return {
        message:
          "Puedo ayudarte con estado del proyecto, próximos hitos, tareas pendientes o documentación. También puedo disparar acciones como abrir la ficha o crear una tarea rápida.",
        intent: "fallback",
      }
    },
    [events.length, nextUpcomingEvent, selectedDate, selectedEvents.length],
  )

  const assistantQuickPrompts = useMemo(
    () => [
      "¿Cuál es el próximo hito?",
      "¿Hay tareas pendientes hoy?",
      "¿Dónde está la documentación clave?",
    ],
    [],
  )

  const assistantCreateTaskTriggerRef = useRef<HTMLButtonElement | null>(null)
  const recordAssistantIntent = useCallback(
    (intent: AssistantIntent) => {
      if (typeof window === "undefined") return
      try {
        const raw = window.localStorage.getItem(ASSISTANT_STATS_KEY)
        const parsed: Record<string, Record<string, number>> = raw ? JSON.parse(raw) : {}
        const scope = parsed[assistantHistoryKey] ?? {}
        scope[intent] = (scope[intent] ?? 0) + 1
        parsed[assistantHistoryKey] = scope
        window.localStorage.setItem(ASSISTANT_STATS_KEY, JSON.stringify(parsed))
      } catch (error) {
        console.error("No pudimos registrar la métrica del asistente:", error)
      }
    },
    [assistantHistoryKey],
  )

  const appendAssistantSystemMessage = useCallback(
    (text: string) => {
      const timestamp = format(new Date(), "HH:mm", { locale: es })
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-system-${Date.now()}`,
          sender: "assistant",
          text,
          timestamp,
        },
      ])
    },
    [],
  )

  const appendAssistantMessages = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return
      const timestamp = format(new Date(), "HH:mm", { locale: es })
      const { message: reply, intent } = getAssistantReply(trimmed)
      const baseId = Date.now()
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `user-${baseId}`,
          sender: "user",
          text: trimmed,
          timestamp,
        },
        {
          id: `assistant-${baseId + 1}`,
          sender: "assistant",
          text: reply,
          timestamp,
        },
      ])
      recordAssistantIntent(intent)
    },
    [getAssistantReply, recordAssistantIntent],
  )

  const derivedProjectDetailUrl = useMemo(() => {
    if (assistantProjectUrl) return assistantProjectUrl
    if (projectSlug) return `/dashboard/projects/${projectSlug}`
    if (projectId) return `/dashboard/projects/${projectId}`
    return null
  }, [assistantProjectUrl, projectSlug, projectId])

  const handleAssistantOpenProject = useCallback(() => {
    if (onAssistantOpenProject) {
      onAssistantOpenProject(projectId)
      return
    }
    if (derivedProjectDetailUrl && typeof window !== "undefined") {
      window.location.href = derivedProjectDetailUrl
      return
    }
    appendAssistantSystemMessage("Necesitamos un proyecto activo para abrir su ficha. Selecciona uno en la parte superior.")
  }, [appendAssistantSystemMessage, derivedProjectDetailUrl, onAssistantOpenProject, projectId])

  const handleAssistantCreateTask = useCallback(() => {
    if (onAssistantCreateTask) {
      onAssistantCreateTask(projectId)
      return
    }
    if (showAdminControls && projectId && assistantCreateTaskTriggerRef.current) {
      assistantCreateTaskTriggerRef.current.click()
      appendAssistantSystemMessage("Abrí el formulario para registrar una nueva tarea o hito.")
      return
    }
    appendAssistantSystemMessage("Selecciona un proyecto editable para crear nuevas tareas desde aquí.")
  }, [appendAssistantSystemMessage, onAssistantCreateTask, projectId, showAdminControls])

  const handleAssistantSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      appendAssistantMessages(assistantInput)
      setAssistantInput("")
    },
    [appendAssistantMessages, assistantInput],
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-6 shadow-apple-lg">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#2F4F4F]">
              {projectName ? `Calendario · ${projectName}` : "Calendario de proyecto"}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Selecciona una fecha para ver visitas, hitos y entregas relacionadas con tu proyecto Terrazea.
            </p>
          </div>
          {headerContent}
          <div className="rounded-[1.5rem] bg-[#F8F7F4] p-4">
            <DayPicker
              mode="single"
              locale={es}
              selected={selectedDate ?? undefined}
              onSelect={(date) => setSelectedDate(date ?? null)}
              weekStartsOn={1}
              modifiers={{
                hasEvents: selectableDates,
              }}
              modifiersClassNames={{
                hasEvents: "terrazea-day-has-events",
              }}
              modifiersStyles={{
                today: {
                  backgroundColor: "#0D9488",
                  color: "#F8F7F4",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  border: "1px solid rgba(13, 148, 136, 0.4)",
                },
                selected: {
                  backgroundColor: "#0D9488",
                  color: "#F8F7F4",
                  borderRadius: "9999px",
                  border: "2px solid #0D9488",
                  boxShadow: "0 8px 18px rgba(13, 148, 136, 0.25)",
                  fontWeight: 700,
                  outline: "none",
                },
              }}
              className="terrazea-day-picker w-full"
              showOutsideDays
            />
          </div>
        </div>
      </div>

      {showAssistant ? (
        <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-6 shadow-apple-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-[#2F4F4F]">Asistente Terra</h3>
              <p className="text-sm text-[#6B7280]">Pregunta por hitos, documentación o lanza acciones sin salir del calendario.</p>
            </div>
            <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#0D9488]">
              Beta
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {assistantQuickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-[#E0F2F1] bg-[#F0FDF4] px-4 py-1.5 text-xs font-semibold text-[#0D9488] transition hover:border-[#0D9488]"
                onClick={() => appendAssistantMessages(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-1">
            {assistantMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-apple-md",
                  message.sender === "assistant"
                    ? "border-[#E8E6E0] bg-[#F8F7F4] text-[#2F4F4F]"
                    : "ml-auto border-transparent bg-[#0F172A] text-white",
                )}
              >
                <p>{message.text}</p>
                <span className="mt-2 block text-[11px] uppercase tracking-[0.3em] text-[#C6B89E]">{message.timestamp}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-[#E8E6E0] px-4 py-1.5 text-xs font-semibold text-[#2F4F4F] transition hover:border-[#0D9488] hover:text-[#0D9488]"
              onClick={handleAssistantOpenProject}
            >
              Abrir ficha
            </button>
            <button
              type="button"
              className="rounded-full border border-[#E8E6E0] px-4 py-1.5 text-xs font-semibold text-[#2F4F4F] transition hover:border-[#0D9488] hover:text-[#0D9488]"
              onClick={handleAssistantCreateTask}
            >
              Crear tarea
            </button>
          </div>
          <form className="mt-4 flex gap-2" onSubmit={handleAssistantSubmit}>
            <input
              type="text"
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              placeholder="Pregúntame lo que necesites..."
              className="flex-1 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-sm text-[#2F4F4F] placeholder:text-[#9CA3AF] focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#AAF2E3]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#0D9488] px-5 py-2 text-sm font-semibold text-white shadow-apple-md transition hover:bg-[#0B766C]"
            >
              Enviar
            </button>
          </form>
          {showAdminControls && projectId ? (
            <div className="absolute left-[-9999px] top-[-9999px] h-px w-px overflow-hidden">
              <EventFormModal
                projectId={projectId}
                trigger={
                  <button
                    type="button"
                    ref={assistantCreateTaskTriggerRef}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="h-px w-px overflow-hidden"
                  >
                    Crear tarea rápida
                  </button>
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-6 shadow-apple-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-[#2F4F4F]">
              {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
            </h3>
            <p className="text-sm text-[#6B7280]">
              {selectedEvents.length > 0
                ? "Detalles de la jornada programada."
                : "No hay eventos programados para esta fecha."}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {showAdminControls && projectId && (
            <div className="flex justify-end">
              <EventFormModal projectId={projectId} />
            </div>
          )}
          {selectedEvents.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-6 text-center text-sm text-[#6B7280]">
              Añadiremos aquí visitas, aprobaciones y entregas en cuanto las programemos.
            </div>
          ) : (
            selectedEvents
              .slice()
              .sort((a, b) => {
                const aDate = safeParseISO(a.startsAt)
                const bDate = safeParseISO(b.startsAt)
                if (!aDate || !bDate) return 0
                return aDate.getTime() - bDate.getTime()
              })
              .map((event) => {
                const start = safeParseISO(event.startsAt)
                const end = event.endsAt ? safeParseISO(event.endsAt) : null
                const timeLabel =
                  event.isAllDay || !start
                    ? "Todo el día"
                    : end && !isSameDay(start, end)
                      ? `${format(start, "HH:mm")} · ${format(end, "dd/MM HH:mm")}`
                      : `${format(start, "HH:mm")}${end ? ` - ${format(end, "HH:mm")}` : ""}`

                const card = (
                  <article className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-5 shadow-apple-md transition hover:border-[#2F4F4F] hover:shadow-apple-lg">
                    <div className="flex flex-wrap items-center justify_between gap-3">
                      <div>
                        <h4 className="font-heading text-base font-semibold text-[#2F4F4F]">{event.title}</h4>
                        <p className="text-xs uppercase tracking-[0.25em] text-[#C6B89E]">{event.eventType}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#2F4F4F]">
                        {timeLabel}
                      </span>
                    </div>
                    {event.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">{event.description}</p>
                    ) : null}
                    {getEventSecondaryLine ? (
                      <div className="mt-3 text-xs text-[#6B7280]">{getEventSecondaryLine(event)}</div>
                    ) : null}
                    {showVisibility ? (
                      <div className="mt-3 flex items-center gap-3 text-xs text-[#6B7280]">
                        {visibilityBadge(event.visibility)}
                      </div>
                    ) : null}
                  </article>
                )

                if (showAdminControls && projectId) {
                  return (
                    <EventFormModal
                      key={event.id}
                      projectId={projectId}
                      event={event}
                      trigger={
                        <button type="button" className="w-full text-left">
                          {card}
                        </button>
                      }
                    />
                  )
                }

                return (
                  <div key={event.id}>
                    {card}
                  </div>
                )
              })
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-6 shadow-apple-lg">
          <h3 className="font-heading text-lg font-semibold text-[#2F4F4F]">Próximos eventos</h3>
          <ul className="mt-4 space-y-3">
            {events.length === 0 ? (
              <li className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-5 text-sm text-[#6B7280]">
                Aún no hay eventos programados. El equipo Terrazea añadirá aquí las próximas visitas y entregas.
              </li>
            ) : (
              events
                .slice()
                .sort((a, b) => {
                  const aDate = safeParseISO(a.startsAt)
                  const bDate = safeParseISO(b.startsAt)
                  if (!aDate || !bDate) return 0
                  return aDate.getTime() - bDate.getTime()
                })
                .map((event) => {
                  const start = safeParseISO(event.startsAt)
                  if (!start) return null
                  return (
                    <li
                      key={`${event.id}-upcoming`}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-[1.25rem] border border-transparent bg-[#F8F7F4] px-4 py-3",
                        selectedDate && isSameDay(start, selectedDate) ? "border-[#2F4F4F]" : "",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#2F4F4F]">{event.title}</p>
                        <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{event.eventType}</p>
                        {event.description ? (
                          <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">{event.description}</p>
                        ) : null}
                        {getUpcomingSecondaryLine ? (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-[#C6B89E]">
                            {getUpcomingSecondaryLine(event)}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end text-xs text-[#6B7280]">
                        <span>{format(start, "d MMM", { locale: es })}</span>
                        <span>{event.isAllDay ? "Todo el día" : format(start, "HH:mm")}</span>
                      </div>
                    </li>
                  )
                })
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
