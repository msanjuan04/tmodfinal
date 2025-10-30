import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { SessionData } from "@app/types/session"
import { fetchSession, logout as logoutRequest } from "@app/lib/api/auth"

interface AuthContextValue {
  session: SessionData | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSession()
      setSession(data)
    } catch (error) {
      console.error("[Auth] No se pudo recuperar la sesión", error)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setSession(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      refresh,
      logout,
    }),
    [session, loading, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return context
}
