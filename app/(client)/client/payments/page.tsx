import { requireSession } from "@/lib/auth/guards"
import { getClientProjects } from "@/lib/supabase/client-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentsView } from "@/components/payments-view"

interface PaymentsPageProps {
  searchParams: Promise<{
    project?: string
  }>
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams
  const session = await requireSession()
  if (!session.clientId) {
    return null
  }

  const projects = await getClientProjects(session.clientId)
  const activeProject = projects.find((project) => project.slug === params.project) ?? projects[0] ?? null

  if (!activeProject) {
    return (
      <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-lg">
        <CardContent className="p-8 text-center text-sm text-[#6B7280]">
          Aún no hay información de pagos registrada.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-[#2F4F4F]">Pagos – {activeProject.name}</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Toda la información financiera se muestra en modo lectura. Si necesitas cambiar la forma de pago, contacta con
            nosotros en hola@terrazea.com.
          </CardDescription>
        </CardHeader>
      </Card>
      <PaymentsView />
    </div>
  )
}
