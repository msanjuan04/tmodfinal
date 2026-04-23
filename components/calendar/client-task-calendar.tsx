"use client"

import { useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"

import type { ProjectEvent } from "@app/types/events"
import { cn } from "@/lib/utils"
import { getEventStyle } from "@/lib/constants/calendar-events"

interface ClientTaskCalendarProps {
  events: ProjectEvent[]
  projectName?: string
}

function safeParseISO(value: string) {
  const date = parseISO(value)
  return isNaN(date.getTime()) ? null : date
}

function getDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]

export function ClientTaskCalendar({ events, projectName }: ClientTaskCalendarProps) {
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
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState<Date>(() => today)
  const selectedKey = getDateKey(selectedDate)
  const selectedDayEvents = eventsByDate.get(selectedKey) ?? []

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

  const goToToday = () => {
    const base = new Date()
    setVisibleMonth(new Date(base.getFullYear(), base.getMonth(), 1))
    setSelectedDate(base)
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ---------- Calendario mensual ---------- */}
      <div className="overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white shadow-apple-md">
        {/* Navegación */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E6E0] bg-[#F8F7F4] px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-sm transition hover:border-[#2F4F4F] hover:text-[#1F3535]"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[160px] text-center font-heading text-lg font-semibold capitalize text-[#2F4F4F]">
              {format(visibleMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E6E0] bg-white text-[#2F4F4F] shadow-apple-sm transition hover:border-[#2F4F4F] hover:text-[#1F3535]"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-1 rounded-full border border-[#E8E6E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5563] shadow-apple-sm transition hover:border-[#2F4F4F] hover:text-[#2F4F4F]"
            >
              Hoy
            </button>
          </div>

          {/* Nota informativa de solo-lectura */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E6E0] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6B7280]">
            <Info className="h-3 w-3 text-[#C6B89E]" />
            Solo consulta
          </div>
        </header>

        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-[#E8E6E0] bg-white">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9CA3AF]"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 border-l border-t border-[#F0EEE9]">
          {weeks.flat().map((day) => {
            const key = getDateKey(day)
            const dayEvents = eventsByDate.get(key) ?? []
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, visibleMonth)

            return (
              <ReadOnlyDayCell
                key={key}
                day={day}
                isSelected={isSelected}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
                events={dayEvents}
                onClick={() => setSelectedDate(day)}
              />
            )
          })}
        </div>

        {/* Leyenda de colores */}
        <footer className="flex flex-wrap gap-3 border-t border-[#E8E6E0] bg-[#F8F7F4] px-5 py-3 text-[11px] text-[#6B7280]">
          <LegendDot colorClass="bg-[#B45309]" label="Hito" />
          <LegendDot colorClass="bg-[#2F4F4F]" label="Tarea" />
          <LegendDot colorClass="bg-[#0D9488]" label="Entrega" />
          <LegendDot colorClass="bg-[#5B21B6]" label="Reunión" />
          <LegendDot colorClass="bg-[#758C84]" label="Visita" />
          <LegendDot colorClass="bg-[#047857]" label="Completada" />
        </footer>
      </div>

      {/* ---------- Sidebar del día ---------- */}
      <aside className="space-y-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white shadow-apple-md">
          <div className="bg-gradient-to-br from-[#2F4F4F] via-[#243B3B] to-[#1F3535] px-5 py-5 text-white">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
              {format(selectedDate, "EEEE", { locale: es })}
            </p>
            <h3 className="font-heading text-2xl font-semibold capitalize">
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            <p className="mt-1 text-xs text-white/70">
              {selectedDayEvents.length === 0
                ? "Sin eventos programados"
                : `${selectedDayEvents.length} evento${selectedDayEvents.length === 1 ? "" : "s"} en este día`}
            </p>
          </div>

          <div className="max-h-[480px] space-y-3 overflow-y-auto px-4 py-4">
            {selectedDayEvents.length === 0 ? (
              <EmptyState />
            ) : (
              selectedDayEvents.map((event) => <ReadOnlyEventCard key={event.id} event={event} />)
            )}
          </div>
        </div>

        {projectName ? (
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-xs text-[#6B7280]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Proyecto</p>
            <p className="mt-1 font-medium text-[#2F4F4F]">{projectName}</p>
          </div>
        ) : null}
      </aside>
    </section>
  )
}

// --------- Subcomponentes (read-only) ---------------------------------------

function ReadOnlyDayCell({
  day,
  isSelected,
  isToday,
  isCurrentMonth,
  events,
  onClick,
}: {
  day: Date
  isSelected: boolean
  isToday: boolean
  isCurrentMonth: boolean
  events: ProjectEvent[]
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[110px] cursor-pointer flex-col gap-1.5 border-b border-r border-[#F0EEE9] px-2 py-2 text-left transition",
        !isCurrentMonth && "bg-[#FAFAF8]",
        isCurrentMonth && "bg-white hover:bg-[#F8F7F4]",
        isSelected && "bg-[#F4F1EA] hover:bg-[#F4F1EA] ring-1 ring-inset ring-[#2F4F4F]/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center text-xs font-semibold",
            !isCurrentMonth && "text-[#D1D5DB]",
            isCurrentMonth && !isToday && "text-[#4B5563]",
            isToday && "rounded-full bg-[#2F4F4F] text-white shadow-apple-sm",
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 3).map((event) => (
          <ReadOnlyEventPill key={event.id} event={event} />
        ))}
        {events.length > 3 ? (
          <span className="block text-[10px] font-medium text-[#6B7280]">
            +{events.length - 3} más
          </span>
        ) : null}
      </div>
    </div>
  )
}

function ReadOnlyEventPill({ event }: { event: ProjectEvent }) {
  const style = getEventStyle(event.eventType)
  const isCompleted = event.eventType === "completada"

  return (
    <span
      className={cn(
        "block w-full truncate rounded-md px-2 py-1 text-left text-[10px] font-medium",
        style.pillClass,
      )}
    >
      <span className="flex items-center gap-1.5 overflow-hidden">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dotClass)} />
        <span className={cn("truncate", isCompleted && "line-through opacity-60")}>{event.title}</span>
      </span>
    </span>
  )
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", colorClass)} />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#FAFAF8] px-4 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <Info className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#2F4F4F]">Sin eventos</p>
        <p className="text-xs text-[#6B7280]">
          Este día está libre. Selecciona otra fecha para ver tus visitas, entregas y reuniones.
        </p>
      </div>
    </div>
  )
}

function ReadOnlyEventCard({ event }: { event: ProjectEvent }) {
  const style = getEventStyle(event.eventType)
  const Icon = style.icon
  const isCompleted = event.eventType === "completada"
  const startParsed = safeParseISO(event.startsAt)

  return (
    <div
      className={cn(
        "rounded-[1.25rem] p-3.5 shadow-apple-sm",
        style.cardClass,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/60">
          <Icon className="h-3.5 w-3.5 text-[#2F4F4F]" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "font-heading text-sm font-semibold text-[#2F4F4F]",
              isCompleted && "line-through opacity-70",
            )}
          >
            {event.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-[#6B7280]">
            <span className="rounded-full bg-white/70 px-2 py-0.5">{style.label}</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5">
              {event.isAllDay
                ? "Todo el día"
                : startParsed
                  ? format(startParsed, "HH:mm")
                  : "—"}
            </span>
          </div>
          {event.description ? (
            <p className="pt-1 text-xs leading-relaxed text-[#6B7280]">{event.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
