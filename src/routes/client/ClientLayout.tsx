import { useCallback, useEffect, useMemo, useState } from "react"
import { Outlet, useOutletContext } from "react-router-dom"

import { ClientShell } from "@/components/client/client-shell"
import { useAuth } from "@app/context/AuthContext"
import { fetchClientProjects } from "@app/lib/api/client"
import type { ClientProjectSummary } from "@app/types/client"

interface ClientRouteContextValue {
  projects: ClientProjectSummary[]
  refreshProjects: () => Promise<void>
}

function LoadingState() {
  return (
    <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 text-center shadow-apple-xl">
      <p className="text-sm font-medium text-[#6B7280]">Cargando tus proyectos Terrazea…</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#E8E6E0] bg-white/60 p-10 text-center shadow-apple-md">
      <h2 className="font-heading text-xl font-semibold text-[#2F4F4F]">Aún no tienes proyectos activos</h2>
      <p className="mt-2 text-sm text-[#6B7280]">
        Cuando tu primer proyecto Terrazea esté disponible aparecerá aquí con todos los detalles y seguimiento.
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#FCA5A5] bg-[#FEF2F2] p-10 text-center shadow-apple-md">
      <h2 className="font-heading text-xl font-semibold text-[#B91C1C]">No pudimos cargar tus proyectos</h2>
      <p className="mt-2 text-sm text-[#B91C1C]">{message}</p>
      <p className="mt-1 text-xs text-[#9B1C1C]">Inténtalo de nuevo en unos segundos.</p>
    </div>
  )
}

export function ClientLayout() {
  const { session } = useAuth()
  const [projects, setProjects] = useState<ClientProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const data = await fetchClientProjects()
      setProjects(data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError("Ha ocurrido un error al recuperar tus proyectos.")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const contextValue = useMemo<ClientRouteContextValue>(
    () => ({
      projects,
      refreshProjects: loadProjects,
    }),
    [projects, loadProjects],
  )

  if (!session) {
    return null
  }

  return (
    <ClientShell user={session} projects={projects}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <Outlet context={contextValue} />
      )}
    </ClientShell>
  )
}

export function useClientRouteContext() {
  return useOutletContext<ClientRouteContextValue>()
}
