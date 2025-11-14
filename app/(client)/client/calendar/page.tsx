import { ProjectCalendar } from "@/components/calendar/project-calendar"
import { requireSession } from "@/lib/auth/guards"
import { getClientProjectEvents } from "@/lib/supabase/project-events"

interface ClientCalendarPageProps {
  searchParams: Promise<{
    project?: string
  }>
}

export default async function ClientCalendarPage({ searchParams }: ClientCalendarPageProps) {
  const params = await searchParams
  const session = await requireSession()
  if (!session.clientId) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[#E8E6E0] bg-white/80 p-12 text-center shadow-apple-lg">
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Aún no tienes proyectos activos</h2>
        <p className="mt-3 text-sm text-[#6B7280]">
          Cuando activemos tu primer proyecto Terrazea aparecerá aquí su calendario.
        </p>
      </div>
    )
  }

  const { project, events } = await getClientProjectEvents(session.clientId, params.project)

  if (!project) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[#E8E6E0] bg-white/80 p-12 text-center shadow-apple-lg">
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Estamos preparando tu proyecto</h2>
        <p className="mt-3 text-sm text-[#6B7280]">
          Una vez activado, podrás seguir cada hito desde este calendario.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ProjectCalendar
        events={events}
        projectName={project.projectName}
        getUpcomingSecondaryLine={(event) => event.eventType}
        showAssistant={false}
      />
    </div>
  )
}
