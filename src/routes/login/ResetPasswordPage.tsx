import { useMemo, useState, useTransition } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { TERRAZEA_BRAND_ICON_URL } from "@/lib/constants/brand"
import { confirmPasswordReset } from "@app/lib/api/auth"

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams])

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setStatus({ success: false, message: "El enlace no es válido. Solicita uno nuevo." })
      return
    }
    const trimmed = password.trim()
    if (trimmed.length < 8) {
      setStatus({ success: false, message: "La contraseña debe tener al menos 8 caracteres." })
      return
    }
    if (trimmed !== confirm.trim()) {
      setStatus({ success: false, message: "Las dos contraseñas no coinciden." })
      return
    }
    startTransition(() => {
      void (async () => {
        try {
          const result = await confirmPasswordReset(token, trimmed)
          setStatus(result)
          if (result.success) {
            setTimeout(() => navigate("/login", { replace: true }), 1200)
          }
        } catch (error) {
          console.error(error)
          setStatus({ success: false, message: "No hemos podido actualizar la contraseña. Inténtalo más tarde." })
        }
      })()
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1EA]">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Link to="/" className="flex items-center gap-3 text-[#2F4F4F]">
          <img src={TERRAZEA_BRAND_ICON_URL} alt="Terrazea" className="h-9 w-9" />
          <span className="font-heading text-lg font-semibold tracking-wide">Terrazea</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center rounded-full border border-[#2F4F4F] px-5 py-2 text-sm font-medium text-[#2F4F4F] transition hover:bg-[#2F4F4F] hover:text-white"
        >
          Volver al acceso
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-[#C6B89E]/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-[#2F4F4F]/20 blur-3xl" />

        <div className="relative w-full max-w-md rounded-[2rem] border border-[#E8E6E0] bg-white p-8 shadow-apple-xl backdrop-blur">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">Nueva contraseña</p>
            <h1 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Crea tu nueva contraseña</h1>
            <p className="text-sm text-[#6B7280]">
              Elige una contraseña segura (mínimo 8 caracteres). La próxima vez que entres en Terrazea la usarás junto a
              tu correo.
            </p>
          </div>

          {!token ? (
            <div className="mt-6 rounded-[1rem] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
              Este enlace no incluye un token válido. Solicita uno nuevo desde «¿Olvidaste tu contraseña?» en la
              pantalla de acceso.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-[#2F4F4F]">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] transition focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="block text-sm font-medium text-[#2F4F4F]">
                  Repite la contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] transition focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2F4F4F] px-6 py-3 text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535] disabled:cursor-not-allowed disabled:bg-[#4B6161]"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando…
                  </>
                ) : (
                  "Guardar contraseña"
                )}
              </button>

              <div
                role="status"
                aria-live="polite"
                className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#4B5563]"
              >
                {status ? (
                  <span className={status.success ? "font-medium text-[#2F4F4F]" : "font-medium text-[#B91C1C]"}>
                    {status.message}
                  </span>
                ) : (
                  <span>Cuando guardes la contraseña te redirigiremos al acceso para que inicies sesión.</span>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
