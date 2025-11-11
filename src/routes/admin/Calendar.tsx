import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { AdminProjectPicker } from "@/components/calendar/admin-project-picker"
import { ProjectCalendar } from "@/components/calendar/project-calendar"
import { Card } from "@/components/ui/card"
import type { ProjectEvent } from "@app/types/events"
import { listGlobalEvents, listProjectCalendarSummaries, listProjectEvents } from "@app/lib/api/events"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export function AdminCalendarPage() {
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectCalendarSummaries>>>([])
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>(undefined)
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined)

  const requestedSlug = searchParams.get("project")
  const activeSlug = useMemo(() => (requestedSlug ? requestedSlug : null), [requestedSlug])

  useEffect(() => {
    listProjectCalendarSummaries()
      .then((items) => {
        setProjects(items)
      })
      .catch((err) => {
        console.error(err)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

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
  }, [activeSlug])

  const title = activeSlug ? activeProjectName ?? "Calendario de proyecto" : "Calendario global Terrazea"
  const subtitle = activeSlug
    ? "Gestiona visitas, hitos y entregas del proyecto en tiempo real."
    : "Visión general de todos los proyectos Terrazea."

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
    ? `${nextEvent.isAllDay ? format(nextEventStart, "EEEE d 'de' MMMM", { locale: es }) + " · Todo el día" : format(nextEventStart, "EEEE d 'de' MMMM · HH:mm", { locale: es })}${nextEvent.project ? ` · ${nextEvent.project.name}` : ""}`
    : "Sin eventos próximos programados."

  const projectSummary = activeSlug ? projects.find((project) => project.slug === activeSlug) : null

  const headerContent = upcomingEvents.length > 0 ? (
    <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#FDFCF9] p-4 text-sm text-[#4B5563] shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximos hitos</p>
      <ul className="mt-3 space-y-2 text-xs">
        {upcomingEvents.slice(0, 3).map(({ event, start }) => (
          <li key={event.id} className="flex items-center justify-between gap-3">
            <span className="font-medium text-[#2F4F4F]">{event.title}</span>
            <span className="text-[#6B7280]">
              {format(start, "d MMM · HH:mm", { locale: es })}
              {event.project ? ` · ${event.project.name}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#6B7280]">
      Añade visitas, hitos o entregas para construir tu cronograma.
    </div>
  )

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
        <p className="text-sm font-medium text-[#6B7280]">Cargando calendario…</p>
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

  return (
    <div className="space-y-6 pb-16">
      <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Planificación Terrazea</p>
              <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">{title}</h1>
              <p className="max-w-2xl text-sm text-[#6B7280]">{subtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Eventos planificados</p>
                <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{events.length}</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Incluye históricos y próximos hitos
                  {projectSummary?.clientName ? ` para ${projectSummary.clientName}` : "."}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximos 7 días</p>
                <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{upcomingInSevenDays.length}</p>
                <p className="mt-1 text-xs text-[#6B7280]">Eventos programados dentro de la próxima semana.</p>
              </div>
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximo hito</p>
                <p className="mt-2 line-clamp-1 text-sm font-medium text-[#2F4F4F]">
                  {nextEvent ? nextEvent.title : "Sin eventos próximos"}
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">{nextEventLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <AdminProjectPicker projects={projects} activeSlug={activeSlug} allowGlobalOption />
            {projectSummary ? (
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-xs text-[#4B5563]">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Cliente</p>
                <p className="mt-1 font-medium text-[#2F4F4F]">
                  {projectSummary.clientName ?? "Cliente sin asignar"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <ProjectCalendar
        events={events}
        projectName={activeSlug ? activeProjectName : undefined}
        showVisibility
        projectId={activeProjectId}
        showAdminControls={Boolean(activeProjectId)}
        getEventSecondaryLine={(event) =>
          event.project ? <span className="font-medium text-[#2F4F4F]">{event.project.name}</span> : ""
        }
        getUpcomingSecondaryLine={(event) => (event.project ? event.project.name : "")}
        headerContent={headerContent}
      />
    </div>
  )
}
