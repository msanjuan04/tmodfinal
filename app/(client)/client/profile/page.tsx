import { requireSession } from "@/lib/auth/guards"
import { getClientProfile } from "@/lib/supabase/client-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function ProfilePage() {
  const session = await requireSession()
  const profile = session.clientId ? await getClientProfile(session.clientId) : null

  return (
    <div className="space-y-8">
      <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-xl">
        <CardHeader>
          <CardTitle className="font-heading text-3xl text-[#2F4F4F]">Tu perfil Terrazea</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Actualizamos tus datos desde nuestro equipo. Si necesitas modificar algún dato de contacto, escríbenos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F4F1EA] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Nombre</p>
            <p className="mt-2 text-lg font-semibold text-[#2F4F4F]">{profile?.full_name ?? session.name}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Correo electrónico</p>
            <p className="mt-2 text-lg font-semibold text-[#2F4F4F]">{session.email}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Cliente desde</p>
            <p className="mt-2 text-lg font-semibold text-[#2F4F4F]">
              {profile?.created_at ? formatDate(profile.created_at) : "En proceso"}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Gestor de cuenta</p>
            <p className="mt-2 text-lg font-semibold text-[#2F4F4F]">Equipo Terrazea</p>
            <p className="mt-1 text-sm text-[#6B7280]">Estamos a tu disposición en hola@terrazea.com</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-[#2F4F4F]">Preferencias de comunicación</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Ajustaremos tus preferencias desde nuestro equipo en cuanto nos lo indiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#4B5563]">
            Podemos enviarte notificaciones sobre nuevos documentos, avances de obra y recordatorios de mantenimiento.
          </p>
          <Button
            variant="outline"
            className="rounded-full border-[#E8E6E0] text-[#2F4F4F] hover:bg-[#F4F1EA]"
            asChild
          >
            <a href="mailto:hola@terrazea.com?subject=Preferencias%20Terrazea">Actualizar preferencias</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value))
}
