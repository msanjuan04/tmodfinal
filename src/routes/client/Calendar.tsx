import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, Clock } from "lucide-react"

import { ClientTaskCalendar } from "@/components/calendar/client-task-calendar"
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
      <div className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/90 p-10 shadow-apple-md">
        <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Tu agenda Terrazea</p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-[#2F4F4F]">
          Calendario del proyecto
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Cuando tu proyecto esté activo verás aquí todas las visitas, entregas y hitos.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <CalendarDays className="h-4 w-4 animate-pulse text-[#2F4F4F]" />
          Cargando tu calendario Terrazea…
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

  const projectSummary = projects.find((project) => project.slug === activeProjectSlug) ?? null
  const title = projectSummary ? projectSummary.name : activeProjectName ?? "Calendario del proyecto"

  return (
    <div className="space-y-6 pb-16">
      {/* Header idéntico al admin en estética */}
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 px-6 py-6 shadow-apple-md lg:px-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Tu agenda Terrazea</p>
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F] lg:text-4xl">{title}</h1>
            <p className="max-w-2xl text-sm text-[#6B7280]">
              Consulta visitas, entregas e hitos importantes de tu proyecto. Te avisaremos con tiempo para que no se te escape nada.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <InlineStat icon={CalendarDays} label="Próximos 7 días" value={upcomingInSevenDays.length} />
            {nextEventLabel ? (
              <InlineStat icon={Clock} label="Siguiente" value={nextEventLabel} textValue />
            ) : (
              <InlineStat icon={Clock} label="Siguiente" value="Sin eventos próximos" textValue />
            )}
          </div>
        </div>
      </section>

      <ClientTaskCalendar events={events} projectName={activeProjectName ?? projectSummary?.name} />
    </div>
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
