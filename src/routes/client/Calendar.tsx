import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { ProjectCalendar } from "@/components/calendar/project-calendar"
import type { ProjectEvent } from "@app/types/events"
import { fetchClientProjectEvents } from "@app/lib/api/events"

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

  return (
    <ProjectCalendar
      events={events}
      projectName={activeProjectName}
      showVisibility={false}
    />
  )
}
