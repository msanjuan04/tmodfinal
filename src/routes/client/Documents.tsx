import { useEffect, useMemo, useState } from "react"

import { DocumentsView } from "@/components/documents-view"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { fetchClientDocuments } from "@app/lib/api/client"
import type { DocumentsData } from "@app/types/documents"

import { useClientRouteContext } from "./ClientLayout"
import { ClientPageHeader } from "@/components/client/client-page-header"

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
      <Card className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/90 p-10 text-center shadow-apple-md">
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
      <ClientPageHeader
        overline="Archivo del proyecto"
        title="Documentos compartidos"
        description="Descarga planos, contratos y garantías tal como los publica el equipo Terrazea."
        icon={FileText}
        projects={projects}
        selectedSlug={selectedSlug}
        onSelectedSlugChange={setSelectedSlug}
        onRefresh={() => setRefreshToken((value) => value + 1)}
        refreshing={loading}
      >
        {selectedProject ? (
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-1.5 text-xs text-[#4B5563]">
            <span className="font-semibold text-[#2F4F4F]">{selectedProject.name}</span>
            {selectedProject.code ? <span className="text-[#9CA3AF]">· {selectedProject.code}</span> : null}
          </div>
        ) : null}
      </ClientPageHeader>

      {loading ? (
        <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tus documentos…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[1.5rem] border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="py-12 text-center text-sm text-[#B91C1C]">{error}</CardContent>
        </Card>
      ) : documents ? (
        <DocumentsView data={documents} showHeader={false} />
      ) : (
        <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white">
          <CardContent className="py-12 text-center text-sm text-[#6B7280]">
            Selecciona un proyecto para revisar sus documentos compartidos.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
