import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { ProjectCalendar } from "@/components/calendar/project-calendar"
import type { ProjectEvent } from "@app/types/events"
import { fetchClientProjectEvents } from "@app/lib/api/events"
import { Card } from "@/components/ui/card"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { useClientRouteContext } from "./ClientLayout"

export function ClientCalendarPage() {
  const { projects } = useClientRouteContext()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>(undefined)

  const requestedSlug = searchParams.get("project")

  const activeProjectSlug = useMemo(() => {
    if (requestedSlug && projects.some((project) => project.slug === requestedSlug)) {
      return requestedSlug
    }
    return projects[0]?.slug ?? null
  }, [requestedSlug, projects])

  useEffect(() => {
    if (!activeProjectSlug) {
      setEvents([])
      setActiveProjectName(undefined)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchClientProjectEvents(activeProjectSlug)
      .then((result) => {
        setEvents(result.events)
        setActiveProjectName(result.project?.projectName ?? undefined)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError("No pudimos cargar el calendario del proyecto.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [activeProjectSlug])

  if (!activeProjectSlug) {
    return (
      <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 shadow-apple-xl">
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Tu calendario Terrazea</h2>
        <p className="mt-2 text-sm text-[#6B7280]">Cuando tu proyecto esté activo verás aquí todas las visitas y entregas.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
        <p className="text-sm font-medium text-[#6B7280]">Cargando tu calendario Terrazea…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-[#FCA5A5] bg-[#FEF2F2] p-10 text-center shadow-apple-md">
        <h2 className="font-heading text-xl font-semibold text-[#B91C1C]">No pudimos cargar el calendario</h2>
        <p className="mt-2 text-sm text-[#B91C1C]">{error}</p>
      </div>
    )
  }

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
    ? `${nextEvent.isAllDay ? format(nextEventStart, "EEEE d 'de' MMMM", { locale: es }) + " · Todo el día" : format(nextEventStart, "EEEE d 'de' MMMM · HH:mm", { locale: es })}`
    : "Sin eventos próximos programados."

  const projectSummary = projects.find((project) => project.slug === activeProjectSlug) ?? null

  const headerContent = upcomingEvents.length > 0 ? (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#FDFCF9] p-4 text-sm text-[#4B5563] shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximas citas</p>
      <ul className="mt-3 space-y-2 text-xs">
        {upcomingEvents.slice(0, 3).map(({ event, start }) => (
          <li key={event.id} className="flex items-center justify-between gap-3">
            <span className="font-medium text-[#2F4F4F]">{event.title}</span>
            <span className="text-[#6B7280]">{format(start, "d MMM · HH:mm", { locale: es })}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#6B7280]">
      En cuanto programemos visitas o entregas aparecerán aquí para que puedas planificarte con calma.
    </div>
  )

  return (
    <div className="space-y-6 pb-16">
      <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/90 px-6 py-6 shadow-apple-xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Tu agenda Terrazea</p>
            <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">
              {projectSummary ? projectSummary.name : activeProjectName ?? "Calendario del proyecto"}
            </h1>
            <p className="max-w-2xl text-sm text-[#6B7280]">
              Consulta visitas, entregas y hitos importantes. Te avisaremos con tiempo para que no se te escape nada.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Eventos totales</p>
              <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{events.length}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Incluye visitas, entregas y reuniones registradas hasta hoy.</p>
            </div>
            <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximos 7 días</p>
              <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{upcomingInSevenDays.length}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Eventos programados durante la próxima semana.</p>
            </div>
            <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximo evento</p>
              <p className="mt-2 line-clamp-1 text-sm font-medium text-[#2F4F4F]">
                {nextEvent ? nextEvent.title : "Sin eventos programados"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">{nextEventLabel}</p>
            </div>
          </div>
        </div>
      </Card>

      <ProjectCalendar
        events={events}
        projectName={activeProjectName}
        showVisibility={false}
        headerContent={headerContent}
        showAssistant={false}
      />
    </div>
  )
}
