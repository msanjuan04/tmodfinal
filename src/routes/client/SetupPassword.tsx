import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@app/context/AuthContext"
import { setupClientPassword } from "@app/lib/api/auth"

export function ClientPasswordSetupPage() {
  const { session, refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nextPath = searchParams.get("next") ?? "/client/dashboard"
  const email = session?.email ?? ""

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = password.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (trimmed.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (trimmed !== trimmedConfirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const result = await setupClientPassword(trimmed)
      if (!result?.success) {
        setError(result?.message ?? "No pudimos guardar tu contraseña. Inténtalo más tarde.")
        return
      }
      toast.success("¡Listo! Ya puedes acceder con tu nueva contraseña.")
      await refresh()
      navigate(nextPath, { replace: true })
    } catch (requestError) {
      console.error("Error setting up password", requestError)
      const message =
        (requestError as { response?: { data?: { message?: string } } }).response?.data?.message ??
        "No pudimos guardar tu contraseña. Inténtalo más tarde."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8F7F4] via-white to-[#F1EFEB] px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-[#E8E6E0] bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex flex-col gap-2">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-3xl text-[#2F4F4F]">Crea tu contraseña</h1>
          <p className="text-sm text-[#6B7280]">
            Este será tu acceso permanente a Terrazea. Utiliza una clave segura que solo tú conozcas.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2F4F4F]">Tu correo</label>
            <Input value={email} disabled className="cursor-not-allowed border-[#E8E6E0] bg-[#F8F7F4] text-[#6B7280]" />
            <p className="text-xs text-[#9CA3AF]">Es el correo que tu equipo Terrazea indicó al crear el proyecto.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-[#2F4F4F]">
              Nueva contraseña
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="border-[#E8E6E0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-[#2F4F4F]">
              Confirmar contraseña
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repite tu contraseña"
              className="border-[#E8E6E0]"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-[#E8E6E0] bg-[#F8F7F4] p-4 text-xs text-[#4B5563]">
            Consejos rápidos:
            <ul className="mt-2 list-disc pl-5 text-[#2F4F4F]">
              <li>Incluye letras y números.</li>
              <li>Evita usar el código del proyecto.</li>
              <li>No compartas esta contraseña con nadie.</li>
            </ul>
          </div>

          {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#2F4F4F] text-white hover:bg-[#1F3535]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar contraseña y continuar"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
