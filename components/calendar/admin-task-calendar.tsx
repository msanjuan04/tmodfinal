"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
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
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  Eye,
  EyeOff,
  Palette,
} from "lucide-react"

import type { ProjectCalendarSummary, ProjectEvent, ProjectEventWriteInput } from "@app/types/events"
import { cn } from "@/lib/utils"
import { EventFormModal } from "./event-form-modal"
import { PersonalEventFormModal } from "./personal-event-form-modal"
import { Button } from "@/components/ui/button"
import { GlobalEventFormModal } from "./global-event-form-modal"
import { DayColorPicker } from "./day-color-picker"
import { TaskEditModal } from "./task-edit-modal"
import {
  deletePersonalEvent,
  deleteProjectEvent,
  updatePersonalEvent,
  updateProjectEvent,
} from "@app/lib/api/events"
import {
  fetchAdminDayColors,
  fetchAdminTaskFromCalendarEvent,
  type AdminDayColor,
} from "@app/lib/api/admin"
import type { AdminProjectTask } from "@app/types/admin"
import { getEventStyle, isMilestoneEventType } from "@/lib/constants/calendar-events"

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

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]

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
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState<Date>(() => today)
  const selectedKey = getDateKey(selectedDate)
  const selectedDayEvents = eventsByDate.get(selectedKey) ?? []
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "client" | "internal">("all")

  const filteredDayEvents = useMemo(() => {
    if (visibilityFilter === "all") return selectedDayEvents
    if (visibilityFilter === "client")
      return selectedDayEvents.filter((event) => event.visibility === "client_visible")
    return selectedDayEvents.filter((event) => event.visibility === "internal")
  }, [selectedDayEvents, visibilityFilter])

  const newProjectEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const newPersonalEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const newGlobalEventTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [pendingAction, startTransition] = useTransition()

  // ---- Colores por día ----
  const [dayColors, setDayColors] = useState<Map<string, AdminDayColor>>(new Map())
  const [colorPickerDate, setColorPickerDate] = useState<string | null>(null)
  const [colorPickerAnchor, setColorPickerAnchor] = useState<DOMRect | null>(null)

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

  // Carga de colores del rango visible (siempre que cambie el mes)
  useEffect(() => {
    if (weeks.length === 0) return
    const firstDay = weeks[0][0]
    const lastDay = weeks[weeks.length - 1][6]
    const from = format(firstDay, "yyyy-MM-dd")
    const to = format(lastDay, "yyyy-MM-dd")
    let cancelled = false
    fetchAdminDayColors(from, to)
      .then((colors) => {
        if (cancelled) return
        const map = new Map<string, AdminDayColor>()
        colors.forEach((c) => map.set(c.date, c))
        setDayColors(map)
      })
      .catch((error) => {
        console.warn("No se pudieron cargar los colores de día:", error)
        if (!cancelled) setDayColors(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [weeks])

  const handleDayColorChange = (date: string, next: AdminDayColor | null) => {
    setDayColors((prev) => {
      const copy = new Map(prev)
      if (next) {
        copy.set(date, next)
      } else {
        copy.delete(date)
      }
      return copy
    })
  }

  const openColorPicker = (date: string, anchor: HTMLElement | null) => {
    setColorPickerDate(date)
    setColorPickerAnchor(anchor?.getBoundingClientRect() ?? null)
  }

  const handleQuickCreate = () => {
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
    if (newPersonalEventTriggerRef.current) newPersonalEventTriggerRef.current.click()
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ---------- Calendario mensual ---------- */}
      <div className="overflow-hidden rounded-[1.75rem] border border-[#E8E6E0] bg-white shadow-apple-md">
        {/* Barra de navegación */}
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

          {/* Botón crear contextual */}
          {canCreateHere(mode, showAdminControls, projectId, isGlobal) ? (
            <button
              type="button"
              onClick={handleQuickCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2F4F4F] px-4 py-1.5 text-xs font-semibold text-white shadow-apple-md transition hover:bg-[#1F3535]"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir tarea
            </button>
          ) : null}
        </header>

        {/* Grid semanal */}
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
            const dayColor = dayColors.get(key) ?? null

            return (
              <DayCell
                key={key}
                day={day}
                isSelected={isSelected}
                isToday={isToday}
                isCurrentMonth={isCurrentMonth}
                events={dayEvents}
                dayColor={dayColor}
                onClick={() => setSelectedDate(day)}
                onEventClick={(event) => {
                  setSelectedDate(day)
                  void event
                }}
                onPaintClick={(anchor) => openColorPicker(key, anchor)}
                mode={mode}
                projectId={projectId}
                showAdminControls={showAdminControls}
                onEventsChanged={onEventsChanged}
              />
            )
          })}
        </div>

        {/* Picker flotante */}
        {colorPickerDate ? (
          <DayColorPicker
            date={colorPickerDate}
            currentColor={dayColors.get(colorPickerDate) ?? null}
            anchorRect={colorPickerAnchor}
            onChanged={(next) => handleDayColorChange(colorPickerDate, next)}
            onClose={() => {
              setColorPickerDate(null)
              setColorPickerAnchor(null)
            }}
          />
        ) : null}

        {/* Leyenda de colores */}
        <footer className="flex flex-wrap gap-3 border-t border-[#E8E6E0] bg-[#F8F7F4] px-5 py-3 text-[11px] text-[#6B7280]">
          <LegendDot colorClass="bg-[#B45309]" label="Hito" />
          <LegendDot colorClass="bg-[#2F4F4F]" label="Tarea" />
          <LegendDot colorClass="bg-[#0D9488]" label="Entrega" />
          <LegendDot colorClass="bg-[#5B21B6]" label="Reunión" />
          <LegendDot colorClass="bg-[#758C84]" label="Visita" />
          <LegendDot colorClass="bg-[#BE185D]" label="Nota interna" />
          <LegendDot colorClass="bg-[#047857]" label="Completada" />
        </footer>

        {/* Triggers ocultos para el botón "Añadir tarea" */}
        <div className="hidden">
          {mode === "projects" && showAdminControls && projectId ? (
            <EventFormModal
              projectId={projectId}
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={<button ref={newProjectEventTriggerRef} type="button" />}
            />
          ) : null}
          {mode === "projects" && isGlobal && projects && projects.length > 0 ? (
            <GlobalEventFormModal
              projects={projects}
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={<button ref={newGlobalEventTriggerRef} type="button" />}
            />
          ) : null}
          {mode === "personal" ? (
            <PersonalEventFormModal
              defaultDate={selectedDate}
              onSuccess={onEventsChanged}
              trigger={<button ref={newPersonalEventTriggerRef} type="button" />}
            />
          ) : null}
        </div>
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

          {/* Filtros de visibilidad */}
          {mode === "projects" && selectedDayEvents.length > 0 ? (
            <div className="flex gap-1 border-b border-[#E8E6E0] bg-[#F8F7F4] p-2">
              <FilterChip
                active={visibilityFilter === "all"}
                onClick={() => setVisibilityFilter("all")}
                label="Todos"
              />
              <FilterChip
                active={visibilityFilter === "client"}
                onClick={() => setVisibilityFilter("client")}
                icon={Eye}
                label="Cliente"
              />
              <FilterChip
                active={visibilityFilter === "internal"}
                onClick={() => setVisibilityFilter("internal")}
                icon={EyeOff}
                label="Internos"
              />
            </div>
          ) : null}

          <div className="max-h-[480px] space-y-3 overflow-y-auto px-4 py-4">
            {filteredDayEvents.length === 0 ? (
              <EmptyDayState
                onCreate={canCreateHere(mode, showAdminControls, projectId, isGlobal) ? handleQuickCreate : undefined}
              />
            ) : (
              filteredDayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  mode={mode}
                  projectId={projectId}
                  pendingAction={pendingAction}
                  startTransition={startTransition}
                  onEventsChanged={onEventsChanged}
                />
              ))
            )}
          </div>
        </div>

        {/* Pie con info contextual */}
        {projectName ? (
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-xs text-[#6B7280]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Proyecto actual</p>
            <p className="mt-1 font-medium text-[#2F4F4F]">{projectName}</p>
          </div>
        ) : null}
      </aside>
    </section>
  )
}

// ------------------- Subcomponentes ------------------------------------------

function canCreateHere(
  mode: "projects" | "personal",
  showAdminControls: boolean | undefined,
  projectId: string | undefined,
  isGlobal: boolean,
) {
  if (mode === "personal") return true
  if (showAdminControls && projectId) return true
  if (isGlobal) return true
  return false
}

function DayCell({
  day,
  isSelected,
  isToday,
  isCurrentMonth,
  events,
  dayColor,
  onClick,
  onEventClick,
  onPaintClick,
  mode,
  projectId,
  showAdminControls,
  onEventsChanged,
}: {
  day: Date
  isSelected: boolean
  isToday: boolean
  isCurrentMonth: boolean
  events: ProjectEvent[]
  dayColor?: AdminDayColor | null
  onClick: () => void
  onEventClick: (event: ProjectEvent) => void
  onPaintClick: (anchor: HTMLElement | null) => void
  mode: "projects" | "personal"
  projectId?: string
  showAdminControls?: boolean
  onEventsChanged?: () => void
}) {
  const dayNumber = format(day, "d")
  const paintButtonRef = useRef<HTMLButtonElement | null>(null)

  // Fondo tintado cuando hay color asignado (en torno a 12% de opacidad para no ser chillón)
  const tintedStyle = dayColor
    ? ({
        backgroundColor: `${dayColor.color}1A`, // hex + 1A (~10% alpha)
        borderLeftColor: dayColor.color,
        borderLeftWidth: "3px",
      } as React.CSSProperties)
    : undefined

  return (
    <div
      onClick={onClick}
      style={tintedStyle}
      title={dayColor?.note ?? undefined}
      className={cn(
        "group relative flex min-h-[110px] flex-col gap-1.5 border-b border-r border-[#F0EEE9] px-2 py-2 text-left transition cursor-pointer",
        !isCurrentMonth && !dayColor && "bg-[#FAFAF8]",
        isCurrentMonth && !dayColor && "bg-white hover:bg-[#F8F7F4]",
        isSelected && !dayColor && "bg-[#F4F1EA] hover:bg-[#F4F1EA] ring-1 ring-inset ring-[#2F4F4F]/30",
        isSelected && dayColor && "ring-1 ring-inset ring-[#2F4F4F]/30",
      )}
    >
      {/* Número del día + botón de color (aparece en hover) */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center text-xs font-semibold",
            !isCurrentMonth && "text-[#D1D5DB]",
            isCurrentMonth && !isToday && "text-[#4B5563]",
            isToday && "rounded-full bg-[#2F4F4F] text-white shadow-apple-sm",
          )}
        >
          {dayNumber}
        </span>
        <button
          ref={paintButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPaintClick(paintButtonRef.current)
          }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[#9CA3AF] transition",
            dayColor
              ? "bg-white/70 opacity-100 shadow-apple-sm"
              : "opacity-0 hover:bg-[#F4F1EA] hover:text-[#2F4F4F] group-hover:opacity-100",
          )}
          aria-label="Cambiar color del día"
        >
          {dayColor ? (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dayColor.color }}
            />
          ) : (
            <Palette className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Eventos del día (máx 3 visibles, resto en contador) */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, 3).map((event) => (
          <EventPill
            key={event.id}
            event={event}
            mode={mode}
            projectId={projectId}
            showAdminControls={showAdminControls}
            onEventsChanged={onEventsChanged}
            onSelect={() => onEventClick(event)}
          />
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

function EventPill({
  event,
  mode,
  projectId,
  showAdminControls,
  onEventsChanged,
  onSelect,
}: {
  event: ProjectEvent
  mode: "projects" | "personal"
  projectId?: string
  showAdminControls?: boolean
  onEventsChanged?: () => void
  onSelect: () => void
}) {
  const style = getEventStyle(event.eventType)
  const isCompleted = event.eventType === "completada"

  const pillInner = (
    <span className="flex items-center gap-1.5 overflow-hidden">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dotClass)} />
      <span className={cn("truncate", isCompleted && "line-through opacity-60")}>{event.title}</span>
    </span>
  )

  const pillClass = cn(
    "block w-full truncate rounded-md px-2 py-1 text-left text-[10px] font-medium transition hover:shadow-apple-sm",
    style.pillClass,
  )

  const triggerButton = (
    <button
      type="button"
      className={pillClass}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {pillInner}
    </button>
  )

  // Si el evento proviene de una tarea, abrimos el modal de tarea para editar todos los campos.
  const isTaskEvent = event.eventType.startsWith("task_")

  if (mode === "projects" && showAdminControls && projectId) {
    if (isTaskEvent) {
      return (
        <TaskEditModal
          projectId={event.projectId ?? projectId}
          eventId={event.id}
          trigger={triggerButton}
          onSaved={() => onEventsChanged?.()}
        />
      )
    }
    return (
      <EventFormModal projectId={projectId} event={event} onSuccess={onEventsChanged} trigger={triggerButton} />
    )
  }

  if (mode === "personal") {
    return (
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
        trigger={triggerButton}
      />
    )
  }

  // Modo global (todos los proyectos) sin showAdminControls: si es tarea abrimos el modal de tarea
  // (necesitamos event.projectId), si no, solo seleccionamos.
  if (isTaskEvent && event.projectId) {
    return (
      <TaskEditModal
        projectId={event.projectId}
        eventId={event.id}
        trigger={triggerButton}
        onSaved={() => onEventsChanged?.()}
      />
    )
  }

  return triggerButton
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", colorClass)} />
      {label}
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: typeof Eye
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
        active ? "bg-[#2F4F4F] text-white shadow-apple-sm" : "text-[#4B5563] hover:text-[#2F4F4F]",
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label}
    </button>
  )
}

function EmptyDayState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#FAFAF8] py-8 px-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <CalendarPlus className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#2F4F4F]">Sin eventos</p>
        <p className="text-xs text-[#6B7280]">Este día está libre. Puedes añadir una tarea o seleccionar otra fecha.</p>
      </div>
      {onCreate ? (
        <Button
          type="button"
          size="sm"
          onClick={onCreate}
          className="rounded-full bg-[#2F4F4F] px-4 text-xs font-semibold hover:bg-[#1F3535]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir tarea
        </Button>
      ) : null}
    </div>
  )
}

function EventCard({
  event,
  mode,
  projectId,
  pendingAction,
  startTransition,
  onEventsChanged,
}: {
  event: ProjectEvent
  mode: "projects" | "personal"
  projectId?: string
  pendingAction: boolean
  startTransition: (cb: () => void) => void
  onEventsChanged?: () => void
}) {
  const style = getEventStyle(event.eventType)
  const Icon = style.icon
  const isCompleted = event.eventType === "completada"
  const startParsed = safeParseISO(event.startsAt)

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
    if (!confirm("¿Seguro que quieres eliminar este evento del calendario?")) return
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
          console.error("Error eliminando evento:", error)
        }
      })()
    })
  }

  const isTaskEvent = event.eventType.startsWith("task_")

  const editEventButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 rounded-full border-[#E8E6E0] px-3 text-[10px] font-semibold text-[#4B5563] hover:border-[#2F4F4F] hover:text-[#2F4F4F]"
    >
      <Pencil className="mr-1 h-3 w-3" /> Editar
    </Button>
  )

  const editTaskButton = (
    <Button
      type="button"
      size="sm"
      className="h-7 rounded-full bg-[#2F4F4F] px-3 text-[10px] font-semibold text-white hover:bg-[#1F3535]"
    >
      <Pencil className="mr-1 h-3 w-3" /> Editar tarea
    </Button>
  )

  return (
    <div className={cn("rounded-[1.25rem] p-3.5 shadow-apple-sm transition hover:shadow-apple-md", style.cardClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-2.5">
          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/60")}>
            <Icon className="h-3.5 w-3.5 text-[#2F4F4F]" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className={cn("font-heading text-sm font-semibold text-[#2F4F4F]", isCompleted && "line-through opacity-70")}>
              {event.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-[#6B7280]">
              <span className="rounded-full bg-white/70 px-2 py-0.5">{style.label}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5">
                {event.isAllDay ? "Todo el día" : startParsed ? format(startParsed, "HH:mm") : "—"}
              </span>
              {mode === "projects" ? (
                <span className="rounded-full bg-white/70 px-2 py-0.5">
                  {event.visibility === "internal" ? "Interno" : "Visible cliente"}
                </span>
              ) : null}
            </div>
            {event.description ? (
              <p className="pt-1 text-xs leading-relaxed text-[#6B7280]">{event.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-black/5 pt-3">
        {!isCompleted ? (
          <Button
            type="button"
            size="sm"
            disabled={pendingAction}
            onClick={handleComplete}
            className="h-7 rounded-full bg-[#047857] px-3 text-[10px] font-semibold text-white hover:bg-[#065F46]"
          >
            <Check className="mr-1 h-3 w-3" /> Completar
          </Button>
        ) : null}
        {mode === "projects" && isTaskEvent ? (
          <TaskEditModal
            projectId={event.projectId ?? projectId ?? ""}
            eventId={event.id}
            trigger={editTaskButton}
            onSaved={() => onEventsChanged?.()}
          />
        ) : mode === "projects" && projectId ? (
          <EventFormModal projectId={projectId} event={event} onSuccess={onEventsChanged} trigger={editEventButton} />
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
            trigger={editEventButton}
          />
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pendingAction}
          onClick={handleDeleteClick}
          className="h-7 rounded-full border-[#FCA5A5] px-3 text-[10px] font-semibold text-[#B91C1C] hover:border-[#DC2626] hover:text-[#DC2626]"
        >
          <Trash2 className="mr-1 h-3 w-3" /> Eliminar
        </Button>
      </div>
    </div>
  )
}
