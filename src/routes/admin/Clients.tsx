import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, UserCircle } from "lucide-react"

import {
  createAdminClient,
  fetchAdminClients,
  type CreateAdminClientPayload,
} from "@app/lib/api/admin"
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
    refreshClients()
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
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold text-[#2F4F4F]">Clientes Terrazea</h1>
        <p className="text-sm text-[#6B7280]">
          Gestiona el acceso de tus clientes. Los nuevos clientes podrán iniciar sesión con su correo y contraseña asignada.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
        <Card className="border-[#E8E6E0]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <UserCircle className="h-5 w-5" />
              Crear cliente
            </CardTitle>
            <CardDescription>El cliente recibirá acceso inmediato tras iniciar sesión.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-[#2F4F4F]">
                  Nombre completo
                </label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="María García"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[#2F4F4F]">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="cliente@terrazea.com"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={form.status === "pending"}>
                {form.status === "pending" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                  </span>
                ) : (
                  "Registrar cliente"
                )}
              </Button>

              {form.status === "success" && form.message ? (
                <p className="text-sm font-medium text-green-600">{form.message}</p>
              ) : null}
              {form.status === "error" && form.message ? (
                <p className="text-sm font-medium text-red-600">{form.message}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="border-[#E8E6E0]">
          <CardHeader>
            <CardTitle className="text-[#2F4F4F]">Clientes registrados</CardTitle>
            <CardDescription>
              {loading ? "Cargando..." : `${clients.length} cliente${clients.length === 1 ? "" : "s"}`} · {totalProjects} proyecto
              {totalProjects === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-[#6B7280]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando clientes…
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Aún no hay clientes registrados.</p>
            ) : (
              clients.map((client) => (
                <div key={client.id} className="space-y-3 rounded-[1.25rem] border border-[#E8E6E0] p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2F4F4F]">{client.fullName}</p>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{client.email}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-[#F4F1EA] text-[#2F4F4F]">
                      {client.projects.length} proyecto{client.projects.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  {client.projects.length > 0 ? (
                    <div className="space-y-2">
                      <div className="h-px w-full bg-[#E8E6E0]" />
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C6B89E]">Proyectos</p>
                      <div className="space-y-2">
                        {client.projects.map((project) => (
                          <div key={project.id} className="rounded-lg border border-[#E8E6E0] bg-[#F8F7F4] p-3 text-xs text-[#4B5563]">
                            <p className="font-medium text-[#2F4F4F]">{project.name}</p>
                            <p>Estado: {project.status}</p>
                            <p>Avance: {Math.round(project.progressPercent)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
