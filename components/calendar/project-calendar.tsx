"use client"

import type React from "react"
import { useMemo, useState } from "react"
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
  showAdminControls?: boolean
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

export function ProjectCalendar({
  events,
  projectName,
  headerContent,
  showVisibility = false,
  getEventSecondaryLine,
  getUpcomingSecondaryLine,
  projectId,
  showAdminControls = false,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white p-6 shadow-apple-lg">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#2F4F4F]">
              {projectName ? `Calendario · ${projectName}` : "Calendario de proyecto"}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Selecciona una fecha para ver visitas, hitos y entregas relacionadas con tu proyecto Terrazea.
            </p>
          </div>
          {headerContent}
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
                backgroundColor: "#34d399",
                color: "#1f2937",
                borderRadius: "9999px",
                fontWeight: 600,
                border: "1px solid rgba(15, 118, 110, 0.35)",
              },
              selected: {
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                borderRadius: "9999px",
              },
            }}
            className="terrazea-day-picker"
            showOutsideDays
          />
        </div>
      </div>

      <div className="space-y-4">
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                    {getEventSecondaryLine ? <div className="mt-3 text-xs text-[#6B7280]">{getEventSecondaryLine(event)}</div> : null}
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
