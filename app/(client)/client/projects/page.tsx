import Link from "next/link"

import { requireSession } from "@/lib/auth/guards"
import { getClientProjects } from "@/lib/supabase/client-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ProjectsPageProps {
  searchParams: Promise<{
    project?: string
  }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams
  const session = await requireSession()
  if (!session.clientId) {
    return null
  }

  const projects = await getClientProjects(session.clientId)
  const activeProjectSlug = params.project ?? projects[0]?.slug ?? null

  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-[#E8E6E0] bg-white/90 p-8 shadow-apple-xl">
        <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Mis proyectos Terrazea</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Cambia entre tus proyectos para consultar documentos, mensajes y estado de avance. Todo protegido con tecnología
          liquid glass.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {projects.map((project) => {
          const isActive = project.slug === activeProjectSlug
          return (
            <Card
              key={project.id}
              className={`border ${isActive ? "border-[#2F4F4F]" : "border-[#E8E6E0]"} bg-white/90 shadow-apple-lg`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-xl text-[#2F4F4F]">{project.name}</CardTitle>
                    <CardDescription className="text-sm text-[#6B7280]">
                      {project.code ? `Código ${project.code} · ` : ""}Estado {formatStatus(project.status)}
                    </CardDescription>
                  </div>
                  {isActive ? (
                    <span className="rounded-full bg-[#2F4F4F] px-3 py-1 text-xs font-medium text-white">Proyecto activo</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F4F1EA] p-4 text-xs text-[#6B7280]">
                  <p>
                    Inicio: <strong>{formatDate(project.startDate)}</strong>
                  </p>
                  <p>
                    Entrega estimada: <strong>{formatDate(project.estimatedDelivery)}</strong>
                  </p>
                </div>
                <div className="flex flex-col gap-3 text-sm text-[#4B5563] sm:flex-row sm:items-center sm:justify-between">
                  <p>Avance total</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-36 overflow-hidden rounded-full bg-[#E8E6E0]">
                      <div
                        className="h-2 rounded-full bg-[#2F4F4F]"
                        style={{ width: `${Math.round(project.progressPercent)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-[#2F4F4F]">{Math.round(project.progressPercent)}%</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button asChild className="flex-1 rounded-full bg-[#2F4F4F] text-white hover:bg-[#1F3535]">
                    <Link href={`/client/dashboard?project=${encodeURIComponent(project.slug)}`}>Ver en dashboard</Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="flex-1 rounded-full border-[#E8E6E0] text-[#2F4F4F] hover:bg-[#F4F1EA]"
                  >
                    <Link href={`/client/documents?project=${encodeURIComponent(project.slug)}`}>Documentos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/^\w/u, (char) => char.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Pendiente"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}
