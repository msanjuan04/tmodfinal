import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminCreateClientForm } from "@/components/admin/admin-create-client-form"
import { AdminCreateProjectForm } from "@/components/admin/admin-create-project-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { requireAdminSession } from "@/lib/auth/guards"
import { getAdminClientsOverview } from "@/lib/supabase/admin-data"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function DashboardClientsPage() {
  await requireAdminSession()
  const clients = await getAdminClientsOverview()

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section className="grid gap-6 rounded-[2rem] border border-[#E8E6E0] bg-white/80 p-8 shadow-apple-xl lg:grid-cols-2">
          <div className="space-y-4">
            <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Añadir nuevo cliente</h1>
            <p className="text-sm text-[#6B7280]">
              Registra a un nuevo cliente para otorgarle acceso a la zona privada y seguir sus proyectos.
            </p>
            <AdminCreateClientForm />
          </div>

          <div className="space-y-4">
            <h2 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Crear proyecto</h2>
            <p className="text-sm text-[#6B7280]">
              Crea un proyecto vinculado a un cliente existente o da de alta un cliente nuevo en el proceso.
            </p>
            <AdminCreateProjectForm clients={clients} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Clientes activos</h2>
            <p className="text-sm text-[#6B7280]">
              Consulta el resumen de proyectos y accede rápidamente a cada ficha.
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-[#E8E6E0] bg-white/80 p-12 text-center shadow-apple-lg">
              <p className="text-sm text-[#6B7280]">Aún no has registrado clientes. Crea el primero con el formulario superior.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {clients.map((client) => (
                <Card key={client.id} className="border-[#E8E6E0] bg-white/80">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="font-heading text-xl text-[#2F4F4F]">{client.fullName}</CardTitle>
                        <p className="text-sm text-[#6B7280]">{client.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs text-[#2F4F4F]">
                        Alta {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true, locale: es })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {client.projects.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-6 text-sm text-[#6B7280]">
                        Este cliente aún no tiene proyectos asignados.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {client.projects.map((project) => (
                          <div key={project.id} className="rounded-xl border border-[#E8E6E0] bg-[#FDFCF9] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-[#2F4F4F]">{project.name}</p>
                                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{project.slug}</p>
                              </div>
                              <Badge className="bg-[#2F4F4F] text-white">{project.status.replace(/_/g, " ")}</Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-2">
                              <p>
                                Inicio: <span className="font-medium text-[#2F4F4F]">{formatDate(project.startDate)}</span>
                              </p>
                              <p>
                                Entrega estimada: <span className="font-medium text-[#2F4F4F]">{formatDate(project.estimatedDelivery)}</span>
                              </p>
                              <p>
                                Progreso: <span className="font-medium text-[#2F4F4F]">{Math.round(project.progressPercent)}%</span>
                              </p>
                              {project.code ? (
                                <p>
                                  Código: <span className="font-medium text-[#2F4F4F]">{project.code}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Sin definir"
  try {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  } catch (error) {
    console.error("Error formatting date", error)
    return value
  }
}
