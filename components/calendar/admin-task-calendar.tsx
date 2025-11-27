"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"

import type { ProjectCalendarSummary, ProjectEvent, ProjectEventWriteInput } from "@app/types/events"
import { cn } from "@/lib/utils"
import { EventFormModal } from "./event-form-modal"
import { PersonalEventFormModal } from "./personal-event-form-modal"
import { Button } from "@/components/ui/button"
import { GlobalEventFormModal } from "./global-event-form-modal"
import {
  deletePersonalEvent,
  deleteProjectEvent,
  updatePersonalEvent,
  updateProjectEvent,
} from "@app/lib/api/events"

interface AdminTaskCalendarProps {
  events: ProjectEvent[]
  projectName?: string
  projectId?: string
  showAdminControls?: boolean
  mode?: "projects" | "personal"
  projects?: ProjectCalendarSummary[]
  isGlobal?: boolean
  onEventsChanged?: () => void
}

function safeParseISO(value: string) {
  const date = parseISO(value)
  return isNaN(date.getTime()) ? null : date
}

function getDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function AdminTaskCalendar({
  events,
  projectName,
  projectId,
  showAdminControls,
  mode = "projects",
  projects,
  isGlobal = false,
  onEventsChanged,
}: AdminTaskCalendarProps) {
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

  const today = useMemo(() => new Date(), [])

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState<Date>(() => today)
  const selectedKey = getDateKey(selectedDate)
  const selectedDayEvents = eventsByDate.get(selectedKey) ?? []
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "client" | "internal">("all")

  const filteredDayEvents = useMemo(() => {
    if (visibilityFilter === "all") return selectedDayEvents
    if (visibilityFilter === "client") return selectedDayEvents.filter((event) => event.visibility === "client_visible")
    return selectedDayEvents.filter((event) => event.visibility === "internal")
  }, [selectedDayEvents, visibilityFilter])

  const selectedEvent =
    filteredDayEvents.find((event) => event.id === selectedEventId) ?? filteredDayEvents[0] ?? null

  const newProjectEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const newPersonalEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const newGlobalEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [pendingAction, startTransition] = useTransition()

  const monthMetrics = useMemo(() => {
    const startMonth = startOfMonth(visibleMonth)
    const endMonth = endOfMonth(visibleMonth)

    let totalInMonth = 0
    let clientVisible = 0
    let internal = 0

    events.forEach((event) => {
      const start = safeParseISO(event.startsAt)
      if (!start) return
      if (start >= startMonth && start <= endMonth) {
        totalInMonth += 1
        if (event.visibility === "client_visible") clientVisible += 1
        if (event.visibility === "internal") internal += 1
      }
    })

    const clientRatio = totalInMonth === 0 ? 0 : Math.round((clientVisible / totalInMonth) * 100)

    return {
      totalInMonth,
      clientVisible,
      internal,
      clientRatio,
    }
  }, [events, visibleMonth])

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })

    const allWeeks: Date[][] = []
    let current = start

    while (current <= end) {
      const week: Date[] = []
      for (let i = 0; i < 7; i += 1) {
        week.push(current)
        current = addDays(current, 1)
      }
      allWeeks.push(week)
    }

    return allWeeks
  }, [visibleMonth])

  const handleDayDoubleClick = (day: Date) => {
    handleSelectDate(day)
    if (mode === "projects") {
      if (showAdminControls && projectId && newProjectEventTriggerRef.current) {
        newProjectEventTriggerRef.current.click()
        return
      }
      if (isGlobal && newGlobalEventTriggerRef.current) {
        newGlobalEventTriggerRef.current.click()
        return
      }
    }
    // En modo personal (o si no hay proyecto/global definido) creamos una tarea personal
    if (newPersonalEventTriggerRef.current) {
      newPersonalEventTriggerRef.current.click()
    }
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    const key = getDateKey(date)
    const dayEvents = eventsByDate.get(key) ?? []
    setSelectedEventId(dayEvents[0]?.id ?? null)
  }

  return (
    <section className="space-y-6 rounded-[1.75rem] border border-[#E8E6E0] bg-white/90 p-6 shadow-apple-xl lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[#E8E6E0] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Vista mensual</p>
          <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">
            {projectName ? `Calendario de tareas · ${projectName}` : "Calendario de tareas"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-sm transition hover:border-[#0D9488] hover:text-[#0D9488]"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <div className="rounded-full bg-[#F8F7F4] px-4 py-1 text-xs font-medium text-[#2F4F4F]">
            {format(visibleMonth, "MMMM yyyy", { locale: es })}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-sm transition hover:border-[#0D9488] hover:text-[#0D9488]"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            aria-label="Mes siguiente"
          >
            ›
          </button>
          <button
            type="button"
            className="ml-2 hidden rounded-full border border-[#E8E6E0] bg-white px-3 py-1 text-[11px] font-medium text-[#4B5563] shadow-apple-sm transition hover:border-[#0D9488] hover:text-[#0D9488] sm:inline-flex"
            onClick={() => {
              const base = new Date()
              setVisibleMonth(new Date(base.getFullYear(), base.getMonth(), 1))
              setSelectedDate(base)
              const todayEvents = eventsByDate.get(getDateKey(base)) ?? []
              setSelectedEventId(todayEvents[0]?.id ?? null)
            }}
          >
            Hoy
          </button>
          {mode === "projects" && showAdminControls && projectId ? (
            <EventFormModal
              projectId={projectId}
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={
                <button
                  type="button"
                  ref={newProjectEventTriggerRef}
                  className="rounded-full bg-[#0D9488] px-4 py-1.5 text-xs font-semibold text-white shadow-apple-md hover:bg-[#0B766C]"
                >
                  Añadir tarea
                </button>
              }
            />
          ) : null}
          {mode === "projects" && isGlobal && projects && projects.length > 0 ? (
            <GlobalEventFormModal
              projects={projects}
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={
                <button
                  type="button"
                  ref={newGlobalEventTriggerRef}
                  className="rounded-full bg-[#0D9488] px-4 py-1.5 text-xs font-semibold text-white shadow-apple-md hover:bg-[#0B766C]"
                >
                  Añadir tarea
                </button>
              }
            />
          ) : null}
          {mode === "personal" ? (
            <PersonalEventFormModal
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={
                <button
                  type="button"
                  ref={newPersonalEventTriggerRef}
                  className="rounded-full bg-[#0D9488] px-4 py-1.5 text-xs font-semibold text-white shadow-apple-md hover:bg-[#0B766C]"
                >
                  Añadir tarea
                </button>
              }
            />
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E8E6E0] bg-[#F8F7F4] p-4 shadow-apple-md">
          <p className="text-xs font-medium text-[#6B7280]">
            {mode === "personal" ? "Tareas personales este mes" : "Eventos este mes"}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{monthMetrics.totalInMonth}</p>
          <div className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-[#0D9488]/10 via-[#0D9488]/40 to-[#0D9488]/5" />
        </div>
        <div className="rounded-2xl border border-[#E8E6E0] bg-[#F8F7F4] p-4 shadow-apple-md">
          <p className="text-xs font-medium text-[#6B7280]">
            {mode === "personal" ? "Bloques planificados" : "Visibles para cliente"}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{monthMetrics.clientVisible}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{monthMetrics.clientRatio}% de las citas</p>
          <div className="mt-2 h-9 w-full rounded-xl bg-gradient-to-r from-[#E0F2F1] via-[#0D9488]/20 to-[#F8F7F4]" />
        </div>
        {mode === "projects" ? (
          <div className="rounded-2xl border border-[#E8E6E0] bg-[#F8F7F4] p-4 shadow-apple-md">
            <p className="text-xs font-medium text-[#6B7280]">Eventos internos</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{monthMetrics.internal}</p>
            <div className="mt-3 h-9 w-full rounded-xl bg-gradient-to-r from-[#FFE4E6] via-[#FDBA74]/50 to-[#F8F7F4]" />
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.6fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 shadow-apple-lg">
            <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#9CA3AF]">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
                <div key={label} className="px-1 text-center">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {weeks.map((week, weekIndex) =>
                week.map((day) => {
                  const key = getDateKey(day)
                  const dayEvents = eventsByDate.get(key) ?? []
                  const isSelected = isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, today)
                  const isCurrentMonth = isSameMonth(day, visibleMonth)

                  const dayContent = (
                    <div
                      className={cn(
                        "flex h-28 flex-col rounded-2xl border px-2 py-1.5 text-left text-xs transition shadow-apple-sm",
                        isSelected
                          ? "border-[#0D9488] bg-white"
                          : "border-transparent bg-[#111827]/0 hover:border-[#E8E6E0] hover:bg-white",
                        !isSelected && isToday ? "border-[#0D9488]/70 bg-white/80" : null,
                      )}
                      onClick={() => handleSelectDate(day)}
                      onDoubleClick={() => handleDayDoubleClick(day)}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-[0.15em]",
                            isCurrentMonth ? "text-[#9CA3AF]" : "text-[#D1D5DB]",
                          )}
                        >
                          {format(day, "EEE", { locale: es })}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold",
                            isCurrentMonth ? "text-[#4B5563]" : "text-[#D1D5DB]",
                          )}
                        >
                          {format(day, "d")}
                          {isToday ? (
                            <span className="rounded-full bg-[#0D9488]/10 px-2 py-0.5 text-[9px] font-medium text-[#0D9488]">
                              Hoy
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event) => {
                          const isInternalNote =
                            event.visibility === "internal" && event.eventType === "nota_interna"
                          const pill = (
                            <button
                              key={event.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectDate(day)
                                setSelectedEventId(event.id)
                              }}
                              className={cn(
                                "flex w-full items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-[10px] font-medium text-[#374151] shadow-apple-md transition hover:border-[#0D9488]/60",
                                isInternalNote
                                  ? "border border-transparent bg-gradient-to-r from-[#FFE4E6] via-[#FED7AA] to-[#FEF3C7]"
                                  : event.visibility === "internal"
                                    ? "border border-[#F97373]/30 bg-white"
                                    : "border border-[#0D9488]/30 bg-white",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  isInternalNote
                                    ? "bg-[#FB7185]"
                                    : event.visibility === "internal"
                                      ? "bg-[#F97373]"
                                      : "bg-[#0D9488]",
                                )}
                              />
                              <span className="truncate">{event.title}</span>
                            </button>
                          )

                          if (mode === "projects" && showAdminControls && projectId) {
                            return (
                              <EventFormModal
                                key={event.id}
                                projectId={projectId}
                                event={event}
                                trigger={pill}
                              />
                            )
                          }

                          if (mode === "personal") {
                            return (
                              <PersonalEventFormModal
                                key={event.id}
                                event={{
                                  id: event.id,
                                  userId: "me",
                                  title: event.title,
                                  description: event.description,
                                  eventType: event.eventType,
                                  startsAt: event.startsAt,
                                  endsAt: event.endsAt,
                                  isAllDay: event.isAllDay,
                                  createdAt: event.createdAt,
                                  updatedAt: event.updatedAt,
                                }}
                                defaultDate={safeParseISO(event.startsAt) ?? undefined}
                                trigger={pill}
                              />
                            )
                          }

                          return pill
                        })}
                        {dayEvents.length > 3 ? (
                          <div className="text-[10px] font-medium text-[#6B7280]">+{dayEvents.length - 3} más</div>
                        ) : null}
                      </div>
                    </div>
                  )

                  if (mode === "projects" && showAdminControls && projectId && dayEvents.length === 0) {
                    return (
                      <EventFormModal
                        key={key + weekIndex}
                        projectId={projectId}
                        trigger={
                          <button type="button" className="w-full text-left">
                            {dayContent}
                          </button>
                        }
                      />
                    )
                  }

                  if (mode === "personal" && dayEvents.length === 0) {
                    return (
                      <PersonalEventFormModal
                        key={key + weekIndex}
                        defaultDate={day}
                        trigger={
                          <button type="button" className="w-full text-left">
                            {dayContent}
                          </button>
                        }
                      />
                    )
                  }

                  if (mode === "personal") {
                    return (
                      <div key={key + weekIndex}>
                        {dayContent}
                      </div>
                    )
                  }

                  return (
                    <div key={key + weekIndex}>
                      {dayContent}
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 shadow-apple-md">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-[#2F4F4F]">Tareas del día</h3>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#6B7280]">
                {format(selectedDate, "d MMM", { locale: es })}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  visibilityFilter === "all"
                    ? "border-[#0D9488] bg-white text-[#0D9488]"
                    : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60",
                )}
                onClick={() => setVisibilityFilter("all")}
              >
                Todas
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  visibilityFilter === "client"
                    ? "border-[#0D9488] bg-white text-[#0D9488]"
                    : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60",
                )}
                onClick={() => setVisibilityFilter("client")}
              >
                Cliente
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                  visibilityFilter === "internal"
                    ? "border-[#0D9488] bg-white text-[#0D9488]"
                    : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60",
                )}
                onClick={() => setVisibilityFilter("internal")}
              >
                Internas
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {filteredDayEvents.length === 0 ? (
                <p className="text-xs text-[#6B7280]">
                  No hay tareas programadas para este día. Selecciona otra fecha del calendario.
                </p>
              ) : (
                filteredDayEvents.map((event) => {
                  const isInternalNote =
                    event.visibility === "internal" && event.eventType === "nota_interna"

                  const chip = (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
                        selectedEvent && selectedEvent.id === event.id
                          ? "border-[#0D9488] bg-white text-[#0D9488]"
                          : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60",
                        isInternalNote
                          ? "border-transparent bg-gradient-to-r from-[#FFE4E6] via-[#FED7AA] to-[#FEF3C7] text-[#374151]"
                          : event.visibility === "internal"
                            ? "border-[#F97373]/40"
                            : "",
                      )}
                    >
                      {event.title}
                    </button>
                  )

                  if (mode === "projects" && showAdminControls && projectId) {
                    return (
                      <EventFormModal key={event.id} projectId={projectId} event={event} trigger={chip} />
                    )
                  }

                  if (mode === "personal") {
                    return (
                      <PersonalEventFormModal
                        key={event.id}
                        event={{
                          id: event.id,
                          userId: "me",
                          title: event.title,
                          description: event.description,
                          eventType: event.eventType,
                          startsAt: event.startsAt,
                          endsAt: event.endsAt,
                          isAllDay: event.isAllDay,
                          createdAt: event.createdAt,
                          updatedAt: event.updatedAt,
                        }}
                        defaultDate={safeParseISO(event.startsAt) ?? undefined}
                        trigger={chip}
                      />
                    )
                  }

                  return chip
                })
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-5 shadow-apple-lg">
            {filteredDayEvents.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Sin tareas en este día</p>
                <p className="text-sm text-[#6B7280]">
                  Selecciona otra fecha o crea una nueva tarea desde el calendario o el botón “Añadir tarea”.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Detalle de tareas</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="mt-4 space-y-3">
                  {filteredDayEvents.map((event) => {
                    const isInternalNote = event.visibility === "internal" && event.eventType === "nota_interna"
                    const isCompleted = event.eventType === "completada"

                    const handleComplete = () => {
                      if (isCompleted) return
                      startTransition(() => {
                        void (async () => {
                          try {
                            if (mode === "projects") {
                              const payload: ProjectEventWriteInput = {
                                projectId: event.projectId,
                                title: event.title,
                                description: event.description,
                                eventType: "completada",
                                startsAt: event.startsAt,
                                endsAt: event.endsAt,
                                isAllDay: event.isAllDay,
                                visibility: event.visibility,
                              }
                              await updateProjectEvent(event.id, payload)
                            } else {
                              await updatePersonalEvent(event.id, {
                                title: event.title,
                                description: event.description,
                                eventType: "completada",
                                startsAt: event.startsAt,
                                endsAt: event.endsAt,
                                isAllDay: event.isAllDay,
                              })
                            }
                            onEventsChanged?.()
                          } catch (error) {
                            console.error("Error marcando tarea como completada:", error)
                          }
                        })()
                      })
                    }

                    const handleDeleteClick = () => {
                      if (!confirm("¿Seguro que quieres eliminar esta tarea del calendario?")) return
                      startTransition(() => {
                        void (async () => {
                          try {
                            if (mode === "projects") {
                              await deleteProjectEvent(event.id)
                            } else {
                              await deletePersonalEvent(event.id)
                            }
                            onEventsChanged?.()
                          } catch (error) {
                            console.error("Error eliminando tarea:", error)
                          }
                        })()
                      })
                    }

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-[1.25rem] border px-4 py-3 text-sm shadow-apple-md",
                          isInternalNote
                            ? "border-transparent bg-gradient-to-r from-[#FFE4E6] via-[#FED7AA] to-[#FEF3C7]"
                            : event.visibility === "internal"
                              ? "border-[#F97373]/40 bg-[#FFF7F7]"
                              : "border-[#E8E6E0] bg-[#F8F7F4]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-heading text-sm font-semibold text-[#2F4F4F]">{event.title}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              {event.description || "Sin descripción añadida."}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#6B7280]">
                              <span className="rounded-full bg-white/70 px-3 py-1">
                                {event.isAllDay ? "Todo el día" : "Horario específico"}
                              </span>
                              <span className="rounded-full bg-white/70 px-3 py-1 capitalize">
                                {event.eventType}
                              </span>
                              <span className="rounded-full bg-white/70 px-3 py-1">
                                {event.visibility === "internal" ? "Solo equipo Terrazea" : "Visible para cliente"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingAction || isCompleted}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-apple-md",
                                isCompleted
                                  ? "bg-[#E5E7EB] text-[#4B5563] cursor-default"
                                  : "bg-[#0D9488] text-white hover:bg-[#0B766C]",
                              )}
                              onClick={handleComplete}
                            >
                              {isCompleted ? "Completada" : "Completar"}
                            </Button>
                            {mode === "projects" && projectId ? (
                              <EventFormModal
                                projectId={projectId}
                                event={event}
                                onSuccess={onEventsChanged}
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full border-[#E8E6E0] px-3 py-1.5 text-[11px] font-semibold text-[#374151]"
                                  >
                                    Editar
                                  </Button>
                                }
                              />
                            ) : null}
                            {mode === "personal" ? (
                              <PersonalEventFormModal
                                event={{
                                  id: event.id,
                                  userId: "me",
                                  title: event.title,
                                  description: event.description,
                                  eventType: event.eventType,
                                  startsAt: event.startsAt,
                                  endsAt: event.endsAt,
                                  isAllDay: event.isAllDay,
                                  createdAt: event.createdAt,
                                  updatedAt: event.updatedAt,
                                }}
                                defaultDate={safeParseISO(event.startsAt) ?? undefined}
                                onSuccess={onEventsChanged}
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full border-[#E8E6E0] px-3 py-1.5 text-[11px] font-semibold text-[#374151]"
                                  >
                                    Editar
                                  </Button>
                                }
                              />
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pendingAction}
                              className="rounded-full border-[#FCA5A5] px-3 py-1.5 text-[11px] font-semibold text-[#B91C1C] hover:border-[#DC2626] hover:text-[#DC2626]"
                              onClick={handleDeleteClick}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}


