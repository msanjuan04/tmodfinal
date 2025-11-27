import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { AdminProjectPicker } from "@/components/calendar/admin-project-picker"
import { AdminTaskCalendar } from "@/components/calendar/admin-task-calendar"
import { Card } from "@/components/ui/card"
import type { ProjectEvent } from "@app/types/events"
import {
  listGlobalEvents,
  listMyPersonalEvents,
  listProjectCalendarSummaries,
  listProjectEvents,
} from "@app/lib/api/events"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

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
    // Recarga silenciosa para que el usuario no pierda el scroll ni vea parpadeos
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
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Planning</p>
              <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">Task calendar</h1>
              <p className="max-w-2xl text-sm text-[#6B7280]">{subtitle}</p>
            </div>
            <div className="mt-2 flex max-w-md flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type="search"
                  placeholder="Buscar tareas, visitas o hitos..."
                  className="w-full rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2.5 text-sm text-[#2F4F4F] placeholder:text-[#9CA3AF] focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#AAF2E3]"
                />
              </div>
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Vista</p>
              <p className="mt-1 text-xs text-[#4B5563]">
                {mode === "personal"
                  ? "Mostrando tus tareas personales"
                  : activeSlug
                    ? "Mostrando calendario del proyecto seleccionado"
                    : "Mostrando calendario global Terrazea"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "projects"
                    ? "border-[#0D9488] bg-white text-[#0D9488]"
                    : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60"
                }`}
                onClick={() => setMode("projects")}
              >
                Proyectos
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "personal"
                    ? "border-[#0D9488] bg-white text-[#0D9488]"
                    : "border-[#E8E6E0] bg-white/60 text-[#374151] hover:border-[#0D9488]/60"
                }`}
                onClick={() => setMode("personal")}
              >
                Mis tareas
              </button>
            </div>
            {mode === "projects" ? (
              <AdminProjectPicker projects={projects} activeSlug={activeSlug} allowGlobalOption />
            ) : null}
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
