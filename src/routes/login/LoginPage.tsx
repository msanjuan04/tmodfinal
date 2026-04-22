import { useMemo } from "react"
import { Navigate, useLocation, useSearchParams } from "react-router-dom"

import { useAuth } from "@app/context/AuthContext"
import { isSuperAdminEmail } from "@/lib/constants/admin"
import { TERRAZEA_BRAND_ICON_URL } from "@/lib/constants/brand"

import { LoginForm } from "./LoginForm"

export function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const target = (searchParams.get("target") ?? "client").toLowerCase() === "admin" ? "admin" : "client"
  const forceLogin = searchParams.get("fresh") === "1"
  const initialLoginMode: "email" | "code" =
    (searchParams.get("mode") ?? "").toLowerCase() === "code" ? "code" : "email"
  const redirectTo = useMemo(
    () => searchParams.get("redirect") ?? (target === "admin" ? "/dashboard" : "/client/dashboard"),
    [searchParams, target],
  )
  const reason = searchParams.get("reason") ?? undefined

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA]">
        <p className="text-sm font-medium text-[#6B7280]">Preparando tu acceso a Terrazea…</p>
      </div>
    )
  }

  if (session && !forceLogin) {
    if (session.role === "admin" || isSuperAdminEmail(session.email)) {
      return <Navigate to={location.state?.from ?? "/dashboard"} replace />
    }
    return <Navigate to={redirectTo} replace />
  }

  const badgeLabel = target === "admin" ? "Panel interno Terrazea" : "Portal cliente Terrazea"
  const heading =
    target === "admin"
      ? "Opera proyectos Terrazea con precisión y calma"
      : "Bienvenido a tu panel de seguimiento Terrazea"
  const description =
    target === "admin"
      ? "Centraliza clientes, hitos, pagos y documentación en un entorno diseñado para el día a día del estudio."
      : "Consulta avances, cronogramas, documentos y pagos de tu proyecto en tiempo real desde cualquier dispositivo."
  const helperBox =
    target === "admin"
      ? {
          title: "¿Necesitas acceso corporativo?",
          content:
            "Inicia sesión con tu correo @terrazea o autorizado. Si aún no tienes credenciales, solicita el alta al equipo de Operaciones.",
        }
      : {
          title: "¿Es tu primera vez como cliente?",
          content:
            "Usa el correo que compartiste con Terrazea o entra con tu código TRZ. Una vez establezcas tu contraseña, podrás acceder siempre con tu correo.",
        }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1EA]">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <a href="/" className="flex items-center gap-3 text-[#2F4F4F]">
          <img src={TERRAZEA_BRAND_ICON_URL} alt="Terrazea" className="h-9 w-9" />
          <span className="font-heading text-lg font-semibold tracking-wide">Terrazea</span>
        </a>
        <a
          href="/"
          className="inline-flex items-center rounded-full border border-[#2F4F4F] px-5 py-2 text-sm font-medium text-[#2F4F4F] transition hover:bg-[#2F4F4F] hover:text-white"
        >
          Volver al inicio
        </a>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-16 sm:px-10">
        <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-[#C6B89E]/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-[#2F4F4F]/20 blur-3xl" />

        <div className="relative w-full max-w-3xl rounded-[2.25rem] border border-[#E8E6E0] bg-white/70 p-10 shadow-apple-xl backdrop-blur-xl">
          <div className="flex flex-col gap-10 lg:flex-row">
            <div className="flex-1 space-y-6">
              <div className="rounded-full bg-[#E8E6E0]/60 px-4 py-2 text-sm font-medium text-[#2F4F4F]">
                {badgeLabel}
              </div>
              <h1 className="font-heading text-4xl font-semibold leading-tight text-[#2F4F4F]">{heading}</h1>
              <p className="text-base text-[#4B5563]">{description}</p>
              <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F4F1EA] p-6 text-sm text-[#4B5563]">
                <p className="font-semibold text-[#2F4F4F]">{helperBox.title}</p>
                <p className="mt-2">{helperBox.content}</p>
              </div>
            </div>

            <div className="flex-1 rounded-[1.75rem] border border-[#E8E6E0] bg-white p-8 shadow-apple-md">
              <LoginForm
                redirectTo={redirectTo}
                reason={reason}
                mode={target}
                initialLoginMode={initialLoginMode}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
