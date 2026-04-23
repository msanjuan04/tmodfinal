import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, Briefcase, User, Clock } from "lucide-react"

import { AdminProjectPicker } from "@/components/calendar/admin-project-picker"
import { AdminTaskCalendar } from "@/components/calendar/admin-task-calendar"
import type { ProjectEvent } from "@app/types/events"
import {
  listGlobalEvents,
  listMyPersonalEvents,
  listProjectCalendarSummaries,
  listProjectEvents,
} from "@app/lib/api/events"

export function AdminCalendarPage() {
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectCalendarSummaries>>>([])
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [mode, setMode] = useState<"projects" | "personal">("projects")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>(undefined)
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined)

  const requestedSlug = searchParams.get("project")
  const activeSlug = useMemo(() => (requestedSlug ? requestedSlug : null), [requestedSlug])

  useEffect(() => {
    listProjectCalendarSummaries()
      .then(setProjects)
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    if (mode === "personal") {
      listMyPersonalEvents()
        .then((personalEvents) => {
          setEvents(
            personalEvents.map((event) => ({
              id: event.id,
              projectId: "personal",
              title: event.title,
              description: event.description,
              eventType: event.eventType,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              isAllDay: event.isAllDay,
              visibility: "internal",
              createdBy: null,
              createdAt: event.createdAt,
              updatedAt: event.updatedAt,
            })),
          )
          setActiveProjectName("Mis tareas")
          setActiveProjectId(undefined)
        })
        .catch((err) => {
          console.error(err)
          setError("No pudimos cargar tus tareas personales.")
        })
        .finally(() => setLoading(false))
      return
    }

    if (!activeSlug) {
      listGlobalEvents()
        .then((globalEvents) => {
          setEvents(globalEvents)
          setActiveProjectName(undefined)
          setActiveProjectId(undefined)
        })
        .catch((err) => {
          console.error(err)
          setError("No pudimos cargar el calendario global.")
        })
        .finally(() => setLoading(false))
      return
    }

    listProjectEvents(activeSlug)
      .then((result) => {
        setEvents(result.events)
        setActiveProjectName(result.project?.name)
        setActiveProjectId(result.project?.id)
      })
      .catch((err) => {
        console.error(err)
        setError("No pudimos cargar el calendario del proyecto seleccionado.")
      })
      .finally(() => setLoading(false))
  }, [activeSlug, mode])

  const handleEventsChanged = useCallback(() => {
    ;(async () => {
      try {
        if (mode === "personal") {
          const personalEvents = await listMyPersonalEvents()
          setEvents(
            personalEvents.map((event) => ({
              id: event.id,
              projectId: "personal",
              title: event.title,
              description: event.description,
              eventType: event.eventType,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              isAllDay: event.isAllDay,
              visibility: "internal",
              createdBy: null,
              createdAt: event.createdAt,
              updatedAt: event.updatedAt,
            })),
          )
          setActiveProjectName("Mis tareas")
          setActiveProjectId(undefined)
          return
        }

        if (!activeSlug) {
          const globalEvents = await listGlobalEvents()
          setEvents(globalEvents)
          setActiveProjectName(undefined)
          setActiveProjectId(undefined)
          return
        }

        const result = await listProjectEvents(activeSlug)
        setEvents(result.events)
        setActiveProjectName(result.project?.name)
        setActiveProjectId(result.project?.id)
      } catch (err) {
        console.error("Error refrescando calendario tras guardar:", err)
      }
    })()
  }, [activeSlug, mode])

  const now = new Date()
  const parsedEvents = events
    .map((event) => {
      const start = parseISO(event.startsAt)
      return Number.isNaN(start.getTime()) ? null : { event, start }
    })
    .filter((item): item is { event: ProjectEvent; start: Date } => item !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const upcomingEvents = parsedEvents.filter(({ start }) => start.getTime() >= now.getTime())
  const upcomingInSevenDays = upcomingEvents.filter(({ start }) => {
    const diff = differenceInCalendarDays(start, now)
    return diff >= 0 && diff <= 7
  })
  const nextEventEntry = upcomingEvents[0] ?? null
  const nextEvent = nextEventEntry?.event
  const nextEventStart = nextEventEntry?.start ?? null

  const nextEventLabel = nextEvent && nextEventStart
    ? nextEvent.isAllDay
      ? `${format(nextEventStart, "EEEE d 'de' MMMM", { locale: es })} · Todo el día`
      : format(nextEventStart, "EEEE d 'de' MMMM · HH:mm", { locale: es })
    : null

  const subtitle = mode === "personal"
    ? "Tus bloques personales y recordatorios."
    : activeSlug
      ? "Hitos, entregas y eventos del proyecto seleccionado."
      : "Visión global de todos los proyectos en Terrazea."

  const title = mode === "personal"
    ? "Mi calendario"
    : activeSlug
      ? activeProjectName ?? "Calendario del proyecto"
      : "Calendario Terrazea"

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <CalendarDays className="h-4 w-4 animate-pulse text-[#2F4F4F]" />
          Cargando calendario…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-[#FCA5A5] bg-[#FEF2F2] p-10 text-center shadow-apple-md">
        <h2 className="font-heading text-xl font-semibold text-[#B91C1C]">No pudimos cargar el calendario</h2>
        <p className="mt-2 text-sm text-[#B91C1C]">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header principal compacto y consistente con la estética de la app */}
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 px-6 py-6 shadow-apple-md lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Planificación</p>
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F] lg:text-4xl">{title}</h1>
              <p className="max-w-2xl text-sm text-[#6B7280]">{subtitle}</p>
            </div>
            {/* Mini resumen inline */}
            <div className="flex flex-wrap gap-2 pt-1">
              <InlineStat
                icon={CalendarDays}
                label="Próximos 7 días"
                value={upcomingInSevenDays.length}
              />
              {nextEventLabel ? (
                <InlineStat
                  icon={Clock}
                  label="Siguiente"
                  value={nextEventLabel}
                  textValue
                />
              ) : null}
            </div>
          </div>

          {/* Controles: modo + selector de proyecto */}
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[280px]">
            <div className="inline-flex rounded-full border border-[#E8E6E0] bg-[#F8F7F4] p-1 shadow-apple-sm">
              <ModeButton
                active={mode === "projects"}
                onClick={() => setMode("projects")}
                icon={Briefcase}
                label="Proyectos"
              />
              <ModeButton
                active={mode === "personal"}
                onClick={() => setMode("personal")}
                icon={User}
                label="Mis tareas"
              />
            </div>
            {mode === "projects" ? (
              <AdminProjectPicker projects={projects} activeSlug={activeSlug} allowGlobalOption />
            ) : null}
          </div>
        </div>
      </section>

      <AdminTaskCalendar
        events={events}
        projectName={mode === "personal" ? "Mis tareas" : activeSlug ? activeProjectName : undefined}
        projectId={activeProjectId}
        showAdminControls={Boolean(activeProjectId)}
        mode={mode}
        projects={projects}
        isGlobal={mode === "projects" && !activeSlug}
        onEventsChanged={handleEventsChanged}
      />
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Briefcase
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[#2F4F4F] text-white shadow-apple-sm"
          : "text-[#4B5563] hover:text-[#2F4F4F]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function InlineStat({
  icon: Icon,
  label,
  value,
  textValue,
}: {
  icon: typeof CalendarDays
  label: string
  value: string | number
  textValue?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-1.5 text-xs text-[#4B5563]">
      <Icon className="h-3.5 w-3.5 text-[#C6B89E]" />
      <span className="font-medium text-[#6B7280]">{label}:</span>
      <span className={`font-semibold text-[#2F4F4F] ${textValue ? "capitalize" : ""}`}>{value}</span>
    </div>
  )
}
