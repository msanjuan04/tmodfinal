import { useAuth } from "@app/context/AuthContext"

export function ClientProfilePage() {
  const { session } = useAuth()

  return (
    <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white/80 p-10 shadow-apple-xl">
      <h2 className="font-heading text-2xl font-semibold text-[#2F4F4F]">Tu perfil Terrazea</h2>
      <p className="mt-2 text-sm text-[#6B7280]">
        Actualiza tus datos de contacto y preferencias para que podamos cuidar aún más de tu proyecto.
      </p>
      {session ? (
        <div className="mt-6 grid gap-4 text-sm text-[#4B5563]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Nombre</p>
            <p className="mt-1 font-medium text-[#2F4F4F]">{session.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Correo</p>
            <p className="mt-1 font-medium text-[#2F4F4F]">{session.email}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
