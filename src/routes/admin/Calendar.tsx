import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { AdminProjectPicker } from "@/components/calendar/admin-project-picker"
import { ProjectCalendar } from "@/components/calendar/project-calendar"
import type { ProjectEvent } from "@app/types/events"
import { listGlobalEvents, listProjectCalendarSummaries, listProjectEvents } from "@app/lib/api/events"

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">{title}</h1>
          <p className="text-sm text-[#6B7280]">{subtitle}</p>
        </div>
        <AdminProjectPicker projects={projects} activeSlug={activeSlug} />
      </div>

      <ProjectCalendar
        events={events}
        projectName={activeSlug ? activeProjectName : undefined}
        showVisibility
        projectId={activeProjectId}
        showAdminControls={Boolean(activeProjectId)}
        getEventSecondaryLine={(event) =>
          event.project ? (
            <span className="font-medium text-[#2F4F4F]">{event.project.name}</span>
          ) : (
            ""
          )
        }
        getUpcomingSecondaryLine={(event) => (event.project ? event.project.name : "")}
      />
    </div>
  )
}
