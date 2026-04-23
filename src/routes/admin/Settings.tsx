import { useState, useTransition } from "react"
import { Loader2, Lock, ShieldCheck, UserCircle2 } from "lucide-react"

import { useAuth } from "@app/context/AuthContext"
import { changePassword } from "@app/lib/api/auth"

// Configuración del admin: datos de la cuenta (read-only) y cambio de
// contraseña. Mantenemos el estilo de cards del resto del portal.

export function AdminSettingsPage() {
  const { session } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    const current = currentPassword.trim()
    const next = newPassword.trim()
    const confirm = confirmPassword.trim()

    if (!current || !next) {
      setStatus({ success: false, message: "Rellena los dos campos de contraseña." })
      return
    }
    if (next.length < 8) {
      setStatus({ success: false, message: "La nueva contraseña debe tener al menos 8 caracteres." })
      return
    }
    if (next !== confirm) {
      setStatus({ success: false, message: "La confirmación no coincide con la nueva contraseña." })
      return
    }

    startTransition(() => {
      void (async () => {
        try {
          const result = await changePassword(current, next)
          setStatus(result)
          if (result.success) {
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
          }
        } catch (error) {
          console.error(error)
          setStatus({ success: false, message: "No hemos podido guardar la contraseña. Inténtalo más tarde." })
        }
      })()
    })
  }

  const displayName = session?.name ?? "Administrador"
  const displayEmail = session?.email ?? "—"
  const roleLabel = session?.role === "admin" ? "Administrador" : "Cliente"

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
              <UserCircle2 className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
              Mi cuenta
            </p>
          </div>
          <h1 className="font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
            Configuración
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#6B7280]">
            Revisa tus datos de acceso y gestiona tu contraseña. Si necesitas cambiar el nombre o correo asociado a
            esta cuenta, escribe a Operaciones: siempre queda un registro auditable del cambio.
          </p>
        </div>
      </section>

      {/* Perfil */}
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md">
        <div className="mb-4 flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-[#2F4F4F]" />
          <h2 className="font-heading text-lg font-semibold text-[#2F4F4F]">Datos de la cuenta</h2>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">Nombre</dt>
            <dd className="mt-1 text-sm font-medium text-[#2F4F4F]">{displayName}</dd>
          </div>
          <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">Correo</dt>
            <dd className="mt-1 break-all text-sm font-medium text-[#2F4F4F]">{displayEmail}</dd>
          </div>
          <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">Rol</dt>
            <dd className="mt-1 text-sm font-medium text-[#2F4F4F]">{roleLabel}</dd>
          </div>
          <div className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">ID de usuario</dt>
            <dd className="mt-1 truncate text-xs font-mono text-[#6B7280]">{session?.userId ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Seguridad: cambio de contraseña */}
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-[#2F4F4F]" />
          <h2 className="font-heading text-lg font-semibold text-[#2F4F4F]">Contraseña</h2>
        </div>
        <p className="mb-6 text-sm text-[#6B7280]">
          Cambia tu contraseña periódicamente. Si olvidas la actual, cierra sesión y usa el enlace «¿Olvidaste tu
          contraseña?» del login.
        </p>
        <form onSubmit={handleSubmit} className="grid max-w-xl gap-5">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-[#2F4F4F]">
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium text-[#2F4F4F]">
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
            />
            <p className="text-xs text-[#9CA3AF]">Mínimo 8 caracteres.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2F4F4F]">
              Repite la nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/10"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#2F4F4F] px-6 py-3 text-sm font-semibold text-white shadow-apple transition hover:bg-[#1F3535] disabled:cursor-not-allowed disabled:bg-[#4B6161]"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando…
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </button>

          {status ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[1rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4 text-sm"
            >
              <span className={status.success ? "font-medium text-[#047857]" : "font-medium text-[#B91C1C]"}>
                {status.message}
              </span>
            </div>
          ) : null}
        </form>
      </section>

      {/* Info de seguridad */}
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#2F4F4F]" />
          <h2 className="font-heading text-lg font-semibold text-[#2F4F4F]">Seguridad y sesiones</h2>
        </div>
        <ul className="space-y-3 text-sm text-[#4B5563]">
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F4F4F]" aria-hidden="true" />
            <span>Las contraseñas se guardan con bcrypt. Nadie del equipo Terrazea la conoce.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F4F4F]" aria-hidden="true" />
            <span>Al cambiar la contraseña tu sesión actual sigue activa en este dispositivo.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F4F4F]" aria-hidden="true" />
            <span>
              Si sospechas que alguien ha entrado en tu cuenta, cambia la contraseña aquí y cierra sesión en el resto
              de dispositivos desde el menú superior.
            </span>
          </li>
        </ul>
      </section>
    </div>
  )
}
