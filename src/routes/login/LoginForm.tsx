import { useEffect, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { useAuth } from "@app/context/AuthContext"
import {
  loginWithEmailAndPassword,
  loginWithProjectCode,
  type LoginResult,
} from "@app/lib/api/auth"

interface LoginFormProps {
  redirectTo?: string
  reason?: string
  mode?: "client" | "admin"
}

export function LoginForm({ redirectTo, reason, mode = "client" }: LoginFormProps) {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [projectCode, setProjectCode] = useState("")
  const [loginMode, setLoginMode] = useState<"email" | "code">("email")
  const [status, setStatus] = useState<LoginResult | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (status?.success) {
      const timeout = setTimeout(() => {
        const target = status.redirectTo ?? redirectTo ?? "/client/dashboard"
        navigate(target, { replace: true })
      }, 600)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [status, redirectTo, navigate])

  useEffect(() => {
    if (mode === "admin") {
      setLoginMode("email")
    }
  }, [mode])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loginMode === "email") {
      const currentEmail = email.trim()
      const currentPassword = password.trim()

      if (!currentEmail || !currentPassword) {
        setStatus({ success: false, message: "Introduce tu correo y contraseña." })
        return
      }

      startTransition(() => {
        void (async () => {
          const result = await loginWithEmailAndPassword(currentEmail, currentPassword)
          if (result.success) {
            await refresh()
          }
          setStatus(result)
        })()
      })
    } else {
      const currentCode = projectCode.trim()

      if (!currentCode) {
        setStatus({ success: false, message: "Introduce tu código de proyecto." })
        return
      }

      startTransition(() => {
        void (async () => {
          const result = await loginWithProjectCode(currentCode)
          if (result.success) {
            await refresh()
          }
          setStatus(result)
        })()
      })
    }
  }

  const helper =
    reason === "unauthenticated" ? "Tu sesión ha finalizado. Vuelve a iniciar sesión para continuar." : undefined

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Accede a tu zona privada</h2>
        <p className="text-sm text-[#6B7280]">
      {mode === "admin"
        ? "Introduce tu correo corporativo y contraseña para acceder al portal interno."
        : "Elige cómo quieres acceder: con tu correo y contraseña, o con tu código de proyecto."}
        </p>
        {helper ? <p className="text-sm font-medium text-[#C05621]">{helper}</p> : null}
      </div>

      {mode === "client" ? (
        <div className="flex rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-1">
          <button
            type="button"
            onClick={() => setLoginMode("email")}
            className={`flex-1 rounded-[0.75rem] px-4 py-2 text-sm font-medium transition ${
              loginMode === "email" ? "bg-white text-[#2F4F4F] shadow-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
            }`}
          >
            Correo y contraseña
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("code")}
            className={`flex-1 rounded-[0.75rem] px-4 py-2 text-sm font-medium transition ${
              loginMode === "code" ? "bg-white text-[#2F4F4F] shadow-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
            }`}
          >
            Código de proyecto
          </button>
        </div>
      ) : null}

      {loginMode === "email" ? (
        <>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[#2F4F4F]">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu.correo@ejemplo.com"
              required
              className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] transition focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#2F4F4F]">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              required
              className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] transition focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <label htmlFor="projectCode" className="block text-sm font-medium text-[#2F4F4F]">
            Código de proyecto
          </label>
          <input
            id="projectCode"
            type="text"
            value={projectCode}
            onChange={(event) => setProjectCode(event.target.value)}
            placeholder="TRZ-2024-089"
            required
            className="w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-4 py-3 text-sm text-[#2F4F4F] transition focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
          />
          <p className="text-xs text-[#6B7280]">
            Lo encontrarás en tus comunicaciones o documentación Terrazea. Te llevará directamente a tu proyecto.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2F4F4F] px-6 py-3 text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535] disabled:cursor-not-allowed disabled:bg-[#4B6161]"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Accediendo...
          </>
        ) : loginMode === "email" ? (
          mode === "admin" ? "Entrar al portal Terrazea" : "Acceder con correo y contraseña"
        ) : (
          "Acceder con código de proyecto"
        )}
      </button>

      <div
        className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#4B5563]"
        role="status"
        aria-live="polite"
      >
        {pending && !status ? (
          <span>Verificando tu acceso...</span>
        ) : status?.success ? (
          <span className="font-medium text-[#2F4F4F]">
            {status.message ?? "Acceso concedido. Redirigiendo..."}
          </span>
        ) : status?.message ? (
          <span className="font-medium text-[#B91C1C]">{status.message}</span>
        ) : (
          <span>
            {mode === "admin"
              ? "Introduce tus credenciales corporativas para acceder al panel interno Terrazea."
              : "Recibirás un acceso directo si el correo está asociado a tu cuenta Terrazea."}
          </span>
        )}
      </div>
    </form>
  )
}
