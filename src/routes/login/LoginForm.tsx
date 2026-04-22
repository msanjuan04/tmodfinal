import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
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
  initialLoginMode?: "email" | "code"
}

export function LoginForm({ redirectTo, reason, mode = "client", initialLoginMode }: LoginFormProps) {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [projectCode, setProjectCode] = useState("")
  const [loginMode, setLoginMode] = useState<"email" | "code">(
    mode === "admin" ? "email" : initialLoginMode ?? "email",
  )
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
        <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">
          {mode === "admin" ? "Bienvenido al panel Terrazea" : "Accede a tu espacio Terrazea"}
        </h2>
        <p className="text-sm text-[#6B7280]">
          {mode === "admin"
            ? "Inicia sesión con tu correo corporativo Terrazea y la contraseña asignada por Operaciones."
            : "Ya tienes cuenta: entra con tu correo y contraseña. ¿Primera vez? Usa el código TRZ que te hemos enviado por correo para activarla."}
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-[#2F4F4F]">
                Contraseña
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[#2F4F4F] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
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
            Usa el código que recibiste por correo al abrirse tu proyecto. Solo es válido para activar tu cuenta la
            primera vez: después crearás tu contraseña y entrarás siempre con tu correo.
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
          "Activar cuenta con código Terrazea"
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
              ? "Solo el equipo Terrazea puede acceder. Si necesitas ayuda, contacta con Operaciones."
              : loginMode === "code"
                ? "Tras activar tu cuenta con el código, crearás una contraseña personal y el código quedará deshabilitado."
                : "Usa el correo que registramos en tu proyecto. Si aún no has activado tu cuenta, cambia a la opción de código."}
          </span>
        )}
      </div>
    </form>
  )
}
