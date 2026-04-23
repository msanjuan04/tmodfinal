import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import axios from "axios"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  fetchAdminSectionStatus,
  unlockAdminSection,
  type ProtectedAdminSection,
} from "@app/lib/api/admin"

interface PasswordGateProps {
  /** Sección del backend que se está protegiendo. Debe existir en `admin_section_passwords`. */
  section: ProtectedAdminSection
  /** Nombre legible mostrado al usuario. */
  sectionName: string
  children: ReactNode
}

export function PasswordGate({ section, sectionName, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Al montar, consultamos al backend si la sección ya está desbloqueada
  // en esta sesión (por la cookie firmada que emite /section-unlock).
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const status = await fetchAdminSectionStatus()
        if (!cancelled) setUnlocked(Boolean(status[section]))
      } catch (err) {
        console.error("No se pudo comprobar el estado de la sección", err)
        if (!cancelled) setUnlocked(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [section])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await unlockAdminSection(section, password)
      setUnlocked(true)
      setPassword("")
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Contraseña incorrecta. Inténtalo de nuevo.")
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError("Introduce la contraseña.")
      } else {
        setError("No se pudo validar la contraseña. Revisa tu conexión e inténtalo de nuevo.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando acceso…
        </div>
      </div>
    )
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md rounded-[1.75rem] border-[#E8E6E0] bg-white/95 shadow-apple-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="font-heading text-xl text-[#111827]">
            Sección protegida
          </CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Introduce la contraseña para acceder a {sectionName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="Contraseña"
                autoFocus
                disabled={submitting}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error ? (
              <p className="text-sm text-[#B91C1C]">{error}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full bg-[#2F4F4F] text-white hover:bg-[#1F3535]"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando…
                </>
              ) : (
                "Acceder"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
