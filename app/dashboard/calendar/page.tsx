import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminProjectPicker } from "@/components/calendar/admin-project-picker"
import { ProjectCalendar } from "@/components/calendar/project-calendar"
import type { AdminGlobalEvent } from "@/lib/supabase/project-events"
import { requireAdminSession } from "@/lib/auth/guards"
import {
  getAdminGlobalEvents,
  getAdminProjectEventsBySlug,
  listProjectCalendarSummaries,
} from "@/lib/supabase/project-events"

interface DashboardCalendarPageProps {
  searchParams: {
    project?: string
  }
}

export default async function DashboardCalendarPage({ searchParams }: DashboardCalendarPageProps) {
  await requireAdminSession()

  const [projects, globalEvents] = await Promise.all([listProjectCalendarSummaries(), getAdminGlobalEvents()])

  let activeProjectSlug: string | null = null
  if (projects.length > 0) {
    const requested = searchParams.project
    activeProjectSlug = projects.some((project) => project.slug === requested) ? requested ?? null : projects[0].slug
  }

  const projectCalendarData = activeProjectSlug ? await getAdminProjectEventsBySlug(activeProjectSlug) : null

  const globalCalendarEvents: Array<AdminGlobalEvent & { projectName: string }> = globalEvents.map((event) => ({
    ...event,
    projectName: event.project.name,
  }))

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section className="rounded-[2rem] border border-[#E8E6E0] bg-white/80 p-8 shadow-apple-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Calendario de proyecto</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">
                Gestiona hitos, visitas de obra y entregas clave. Los eventos marcados como internos solo serán visibles para
                el equipo Terrazea; los eventos de cliente se sincronizan automáticamente con la zona privada.
              </p>
            </div>
            <AdminProjectPicker projects={projects} activeSlug={activeProjectSlug} />
          </div>
        </section>

        {projectCalendarData ? (
          <ProjectCalendar
            events={projectCalendarData.events}
            projectName={projectCalendarData.project.projectName}
            showVisibility
            projectId={projectCalendarData.project.id}
            projectSlug={projectCalendarData.project.projectSlug}
            showAdminControls
            getEventSecondaryLine={(event) =>
              event.visibility === "internal" ? "Visible solo para el equipo Terrazea" : "Visible para cliente"
            }
          />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[#E8E6E0] bg-white/80 p-12 text-center shadow-apple-lg">
            <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Aún no hay proyectos activos</h2>
            <p className="mt-3 text-sm text-[#6B7280]">
              En cuanto registres tu primer proyecto, aquí podrás planificar y compartir hitos con tus clientes.
            </p>
          </div>
        )}

        <section className="space-y-6 rounded-[1.75rem] border border-[#E8E6E0] bg-white/80 p-8 shadow-apple-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Calendario global</h2>
              <p className="text-sm text-[#6B7280]">
                Visualiza todos los compromisos de Terrazea a la vez. Ideal para coordinar equipos y proveedores.
              </p>
            </div>
          </div>
          <ProjectCalendar<AdminGlobalEvent & { projectName: string }>
            events={globalCalendarEvents}
            projectName="Todos los proyectos"
            showVisibility
            getEventSecondaryLine={(event) => (event.projectName ? `Proyecto: ${event.projectName}` : null)}
            getUpcomingSecondaryLine={(event) => event.projectName ?? null}
          />
        </section>
      </div>
    </DashboardLayout>
  )
}
