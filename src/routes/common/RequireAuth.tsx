import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@app/context/AuthContext"
import { isSuperAdminEmail } from "@/lib/constants/admin"

interface RequireAuthProps {
  children: ReactNode
  role?: "client" | "admin" | "any"
  allowPasswordSetup?: boolean
}

export function RequireAuth({ children, role = "client", allowPasswordSetup = false }: RequireAuthProps) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA]">
        <p className="text-sm font-medium text-[#6B7280]">Cargando tu acceso a Terrazea…</p>
      </div>
    )
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  const mustCompletePassword = session.role === "client" && session.mustUpdatePassword === true
  const isSetupRoute = location.pathname.startsWith("/client/setup-password")

  if (mustCompletePassword && !allowPasswordSetup) {
    const redirect = `/client/setup-password?next=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={redirect} replace />
  }

  if (!mustCompletePassword && allowPasswordSetup && isSetupRoute) {
    return <Navigate to="/client/dashboard" replace />
  }

  if (role === "admin" && !(session.role === "admin" || isSuperAdminEmail(session.email))) {
    return <Navigate to="/client/dashboard" replace />
  }

  if (role === "client" && session.role !== "client" && !isSuperAdminEmail(session.email)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
