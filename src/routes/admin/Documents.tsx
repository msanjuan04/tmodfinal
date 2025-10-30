import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DocumentsView } from "@/components/documents-view"
import { Loader2 } from "lucide-react"

import { fetchAdminDocuments } from "@app/lib/api/admin"
import { listProjectCalendarSummaries } from "@app/lib/api/events"
import type { DocumentsData } from "@app/types/documents"

export function AdminDocumentsPage() {
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectCalendarSummaries>>>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const items = await listProjectCalendarSummaries()
        setProjects(items)
        if (items.length > 0) {
          setSelectedSlug((current) => current ?? items[0].slug)
        }
      } catch (error) {
        console.error("Error fetching project summaries", error)
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedSlug) {
      setDocuments(null)
      setLoading(false)
      return
    }

    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAdminDocuments(selectedSlug)
        setDocuments(data)
      } catch (error) {
        console.error("Error fetching admin documents", error)
        setError("No se pudo cargar la documentación del proyecto seleccionado.")
      } finally {
        setLoading(false)
      }
    })()
  }, [selectedSlug])

  const projectOptions = useMemo(() => projects.map((project) => ({ value: project.slug, label: `${project.name}${project.clientName ? ` · ${project.clientName}` : ""}` })), [projects])

  return (
    <div className="space-y-6">
      <Card className="border-[#E8E6E0]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-[#2F4F4F]">Documentación de proyectos</CardTitle>
            <CardDescription>
              Revisa planos, certificados y documentación legal de cada proyecto Terrazea.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="w-full rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
              value={selectedSlug ?? ""}
              onChange={(event) => setSelectedSlug(event.target.value || null)}
            >
              {projectOptions.length === 0 ? <option value="">Sin proyectos</option> : null}
              {projectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="border-[#E8E6E0] bg-transparent text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={async () => {
                if (!selectedSlug) return
                try {
                  setLoading(true)
                  setError(null)
                  const data = await fetchAdminDocuments(selectedSlug)
                  setDocuments(data)
                } catch (error) {
                  console.error(error)
                  setError("No se pudo refrescar la documentación.")
                } finally {
                  setLoading(false)
                }
              }}
              disabled={!selectedSlug || loading}
            >
              Recargar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="border-[#E8E6E0]">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando documentación…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-8 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : documents ? (
        <DocumentsView data={documents} />
      ) : (
        <Card className="border-[#E8E6E0]">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para visualizar su documentación.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
