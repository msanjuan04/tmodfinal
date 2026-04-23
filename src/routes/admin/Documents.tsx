import { useCallback, useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DocumentsView } from "@/components/documents-view"
import { FileText, Loader2, RefreshCw } from "lucide-react"

import { fetchAdminDocuments } from "@app/lib/api/admin"
import { listProjectCalendarSummaries } from "@app/lib/api/events"
import type { DocumentsData } from "@app/types/documents"

export function AdminDocumentsPage() {
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectCalendarSummaries>>>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

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

  const loadDocuments = useCallback(
    async (slug: string | null) => {
      if (!slug) {
        setDocuments(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await fetchAdminDocuments(slug)
        setDocuments(data)
      } catch (requestError) {
        console.error("Error fetching admin documents", requestError)
        setError("No se pudo cargar la documentación del proyecto seleccionado.")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadDocuments(selectedSlug ?? null)
  }, [loadDocuments, selectedSlug])

  const projectOptions = useMemo(() => projects.map((project) => ({ value: project.slug, label: `${project.name}${project.clientName ? ` · ${project.clientName}` : ""}` })), [projects])

  const handleManualRefresh = async () => {
    await loadDocuments(selectedSlug ?? null)
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                Gestión documental
              </p>
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
              Documentación de proyectos
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#6B7280]">
              Revisa planos, certificados y documentación legal en un solo lugar. Selecciona el proyecto para visualizar sus archivos publicados.
            </p>
            {selectedProject ? (
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-1.5 text-xs text-[#4B5563]">
                <span className="font-semibold text-[#2F4F4F]">{selectedProject.name}</span>
                {selectedProject.clientName ? (
                  <span className="text-[#9CA3AF]">· {selectedProject.clientName}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="h-10 min-w-[220px] rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
              value={selectedSlug ?? ""}
              onChange={(event) => setSelectedSlug(event.target.value || null)}
            >
              <option value="">{projectOptions.length === 0 ? "Sin proyectos disponibles" : "Selecciona un proyecto"}</option>
              {projectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="inline-flex h-10 items-center gap-2 rounded-full border-[#E8E6E0] bg-white px-4 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={() => {
                void handleManualRefresh()
              }}
              disabled={!selectedSlug || loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? "Actualizando" : "Actualizar"}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando documentación…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[1.25rem] border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-8 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : documents ? (
        <DocumentsView data={documents} showHeader={false} />
      ) : (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para visualizar su documentación.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
