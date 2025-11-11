import { useEffect, useMemo, useState } from "react"

import { DocumentsView } from "@/components/documents-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { fetchClientDocuments } from "@app/lib/api/client"
import type { DocumentsData } from "@app/types/documents"

import { useClientRouteContext } from "./ClientLayout"

export function ClientDocumentsPage() {
  const { projects } = useClientRouteContext()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(projects[0]?.slug ?? null)
  const [documents, setDocuments] = useState<DocumentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedSlug(null)
      setDocuments(null)
      setLoading(false)
      return
    }
    setSelectedSlug((current) => current ?? projects[0].slug)
  }, [projects])

  useEffect(() => {
    let cancelled = false
    const loadDocuments = async () => {
      if (!selectedSlug) {
        setDocuments(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const response = await fetchClientDocuments(selectedSlug)

        if (!cancelled) {
          if (response.activeProjectSlug && response.activeProjectSlug !== selectedSlug) {
            setSelectedSlug(response.activeProjectSlug)
            return
          }
          setDocuments(response.documents)
        }
      } catch (requestError) {
        console.error("Error fetching client documents", requestError)
        if (!cancelled) {
          setError("No pudimos cargar tus documentos.")
          toast.error("No pudimos cargar tus documentos.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDocuments()
    return () => {
      cancelled = true
    }
  }, [selectedSlug, refreshToken])

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? null,
    [projects, selectedSlug],
  )

  if (projects.length === 0) {
    return (
      <Card className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
        <CardContent>
          <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Aún no tienes documentos disponibles</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Cuando tu primer proyecto esté activo, todos los archivos compartidos aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <Card className="rounded-[2rem] border border-[#E8E6E0] bg-white/90 px-6 py-6 shadow-apple-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Documentos compartidos</p>
              <h1 className="font-heading text-3xl text-[#2F4F4F] lg:text-4xl">Tu archivo Terrazea</h1>
              <p className="max-w-2xl text-sm text-[#6B7280]">
                Descarga planos, contratos y garantías tal como los publica el equipo en tu proyecto.
              </p>
            </div>
            {selectedProject ? (
              <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#4B5563]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Proyecto activo</p>
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-[#2F4F4F]">{selectedProject.name}</p>
                  {selectedProject.code ? <p className="text-xs text-[#6B7280]">Código: {selectedProject.code}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="w-full min-w-[240px] rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-5 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
              value={selectedSlug ?? ""}
              onChange={(event) => setSelectedSlug(event.target.value || null)}
              disabled={projects.length === 0}
            >
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-[#E8E6E0] px-5 py-2 text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={() => {
                setRefreshToken((value) => value + 1)
              }}
              disabled={!selectedSlug || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {loading ? "Actualizando" : "Actualizar"}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tus documentos…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[1.25rem] border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-12 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : documents ? (
        <DocumentsView data={documents} showHeader={false} />
      ) : (
        <Card className="rounded-[1.25rem] border-[#E8E6E0] bg-white">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para revisar sus documentos compartidos.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
