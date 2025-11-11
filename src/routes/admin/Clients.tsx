import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, UserCircle, Users, FolderKanban, Sparkles } from "lucide-react"

import { createAdminClient, fetchAdminClients, type CreateAdminClientPayload } from "@app/lib/api/admin"
import type { AdminClientOverview } from "@app/types/admin"

interface FormState extends CreateAdminClientPayload {
  status: "idle" | "pending" | "success" | "error"
  message?: string
}

export function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({ fullName: "", email: "", status: "idle" })

  useEffect(() => {
    void refreshClients()
  }, [])

  const totalProjects = useMemo(() => clients.reduce((acc, client) => acc + client.projects.length, 0), [clients])

  const refreshClients = async () => {
    setLoading(true)
    try {
      const data = await fetchAdminClients()
      setClients(data)
    } catch (error) {
      console.error("Error fetching admin clients", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.fullName.trim() || !form.email.trim()) {
      setForm((prev) => ({ ...prev, status: "error", message: "Introduce nombre y correo válidos." }))
      return
    }

    setForm((prev) => ({ ...prev, status: "pending", message: undefined }))
    try {
      await createAdminClient({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase() })
      setForm({ fullName: "", email: "", status: "success", message: "Cliente creado correctamente." })
      await refreshClients()
    } catch (error) {
      console.error("Error creating client", error)
      setForm((prev) => ({
        ...prev,
        status: "error",
        message: "No se pudo crear el cliente. Revisa el correo indicado.",
      }))
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-[2rem] border border-[#E8E6E0] bg-white/90 p-8 shadow-apple-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#C6B89E]">
              <Sparkles className="h-3.5 w-3.5" />
              Experiencia Terrazea
            </span>
            <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Gestión de clientes Terrazea</h1>
            <p className="text-sm text-[#6B7280]">
              Registra nuevas cuentas de clientes y consulta sus proyectos activos con una estética alineada al resto del panel Terrazea.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryTile icon={Users} value={clients.length} label="Clientes activos" />
            <SummaryTile icon={FolderKanban} value={totalProjects} label="Proyectos vinculados" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <UserCircle className="h-5 w-5" />
              Registrar nuevo cliente
            </CardTitle>
            <CardDescription className="text-[#6B7280]">
              El cliente podrá acceder a su área privada con estas credenciales tras iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Nombre completo
                </label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="María García"
                  required
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="cliente@terrazea.com"
                  required
                  className="h-12 rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-[#2F4F4F] text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535]"
                disabled={form.status === "pending"}
              >
                {form.status === "pending" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                  </span>
                ) : (
                  "Registrar cliente"
                )}
              </Button>

              {form.status === "success" && form.message ? (
                <p className="rounded-[0.9rem] border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#047857]">
                  {form.message}
                </p>
              ) : null}
              {form.status === "error" && form.message ? (
                <p className="rounded-[0.9rem] border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C]">
                  {form.message}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 shadow-apple-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-[#2F4F4F]">Directorio de clientes</CardTitle>
            <CardDescription className="text-[#6B7280]">
              {loading ? "Cargando..." : `${clients.length} cliente${clients.length === 1 ? "" : "s"} · ${totalProjects} proyecto${totalProjects === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] py-10 text-sm text-[#6B7280]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando clientes…
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-8 text-center text-sm text-[#6B7280]">
                Todavía no has registrado clientes. Cuando lo hagas, verás sus datos y proyectos vinculados en este panel.
              </div>
            ) : (
              clients.map((client) => (
                <article
                  key={client.id}
                  className="space-y-3 rounded-[1.5rem] border border-[#E8E6E0] bg-white/95 p-5 shadow-apple transition hover:border-[#2F4F4F]"
                >
                  <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-[#2F4F4F]">{client.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{client.email}</span>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-[#2F4F4F] px-3 py-1 text-xs text-white">
                      {client.projects.length} proyecto{client.projects.length === 1 ? "" : "s"}
                    </Badge>
                  </header>

                  {client.projects.length > 0 ? (
                    <div className="space-y-3 rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">Detalle de proyectos</p>
                      <div className="space-y-3">
                        {client.projects.map((project) => (
                          <div
                            key={project.id}
                            className="rounded-[1rem] border border-[#E8E6E0] bg-white px-4 py-3 text-xs text-[#4B5563] shadow-apple"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-[#2F4F4F]">{project.name}</p>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-[#C6B89E]">
                                  {project.slug?.toUpperCase() ?? "SIN SLUG"}
                                </p>
                              </div>
                              <Badge variant="outline" className="border-[#E8E6E0] bg-[#FDFCF9] text-[#2F4F4F]">
                                {project.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <InfoItem label="Inicio" value={formatDate(project.startDate)} />
                              <InfoItem label="Entrega estimada" value={formatDate(project.estimatedDelivery)} />
                              <InfoItem label="Progreso" value={`${Math.round(project.progressPercent)}%`} />
                              {project.code ? <InfoItem label="Código" value={project.code} /> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.1rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#6B7280]">
                      Este cliente aún no tiene proyectos asociados. Cuando lo vincules a uno aparecerá aquí su resumen.
                    </div>
                  )}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
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

function SummaryTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] border border-[#E8E6E0] bg-white/95 p-4 shadow-apple">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{label}</p>
        <p className="text-lg font-semibold text-[#2F4F4F]">{value}</p>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-[#6B7280]">{label}:</span>{" "}
      <span className="font-medium text-[#2F4F4F]">{value}</span>
    </p>
  )
}
