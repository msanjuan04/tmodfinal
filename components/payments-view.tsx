import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const payments = [
  {
    id: "INV-204",
    concept: "Fase diseño y planificación",
    amount: "2.450 €",
    status: "Pagado",
    date: "15 Feb 2024",
    method: "Transferencia SEPA",
  },
  {
    id: "INV-205",
    concept: "Suministro de materiales",
    amount: "4.980 €",
    status: "Pendiente",
    date: "29 Feb 2024",
    method: "Tarjeta corporativa",
  },
  {
    id: "INV-206",
    concept: "Aplicación liquid glass y acabados",
    amount: "3.640 €",
    status: "Programado",
    date: "15 Mar 2024",
    method: "Pendiente de confirmar",
  },
]

const statusBadges: Record<string, string> = {
  Pagado: "bg-green-500/10 text-green-700",
  Pendiente: "bg-orange-500/10 text-orange-700",
  Programado: "bg-[#C6B89E]/20 text-[#2F4F4F]",
}

export function PaymentsView() {
  return (
    <div className="space-y-6">
      <Card className="border-[#E8E6E0] bg-white/80 shadow-apple-lg">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-[#2F4F4F]">Resumen de pagos</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Consulta el estado de tus facturas y próximos hitos de pago. Si necesitas modificar la forma de pago, contacta
            con tu project manager Terrazea.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-[#F4F1EA] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Pagado</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">2.450 €</p>
            <p className="mt-1 text-xs text-[#6B7280]">Fase diseño completada</p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Pendiente</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">4.980 €</p>
            <p className="mt-1 text-xs text-[#6B7280]">Materiales confirmados</p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Próximo hito</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">3.640 €</p>
            <p className="mt-1 text-xs text-[#6B7280]">Aplicación liquid glass 15 Mar</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8E6E0] bg-white/90 shadow-apple-md">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-[#2F4F4F]">Historial de facturas</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Toda la información de pagos queda almacenada para tu control. Este módulo es de solo lectura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-3 rounded-[1.25rem] border border-[#E8E6E0] bg-white p-5 shadow-apple hover:bg-[#F8F7F4]/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-heading text-lg font-semibold text-[#2F4F4F]">{payment.concept}</p>
                <p className="text-sm text-[#6B7280]">
                  {payment.id} · Emitida el {payment.date}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:gap-6">
                <Badge className={statusBadges[payment.status] ?? "bg-[#E8E6E0] text-[#2F4F4F]"}>{payment.status}</Badge>
                <span className="font-semibold text-[#2F4F4F]">{payment.amount}</span>
                <span className="text-[#6B7280]">{payment.method}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
