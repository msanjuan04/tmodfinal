"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fetchClientPayments, type ClientPaymentRecord, type ClientPaymentsSummary } from "@/src/lib/api/client"

interface PaymentsViewProps {
  projectSlug?: string | null
}

function formatCurrency(cents: number, currency: string = "EUR"): string {
  const amount = cents / 100
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amount)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—"
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return dateString
  }
}

function getStatusLabel(status: ClientPaymentRecord["status"]): string {
  const labels: Record<ClientPaymentRecord["status"], string> = {
    draft: "Borrador",
    pending: "Pendiente",
    paid: "Pagado",
    cancelled: "Cancelado",
  }
  return labels[status] ?? status
}

function getStatusBadgeClass(status: ClientPaymentRecord["status"]): string {
  const classes: Record<ClientPaymentRecord["status"], string> = {
    draft: "bg-gray-500/10 text-gray-700",
    pending: "bg-orange-500/10 text-orange-700",
    paid: "bg-green-500/10 text-green-700",
    cancelled: "bg-red-500/10 text-red-700",
  }
  return classes[status] ?? "bg-[#E8E6E0] text-[#2F4F4F]"
}

export function PaymentsView({ projectSlug }: PaymentsViewProps = {}) {

  const [payments, setPayments] = useState<ClientPaymentRecord[]>([])
  const [summary, setSummary] = useState<ClientPaymentsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchClientPayments(projectSlug)
        setPayments(data.payments)
        setSummary(data.summary)
      } catch (err) {
        console.error("Error loading payments", err)
        setError("No se pudieron cargar los pagos. Inténtalo de nuevo en unos segundos.")
      } finally {
        setLoading(false)
      }
    }

    void loadPayments()
  }, [projectSlug])

  if (loading) {
    return (
      <Card className="border-[#E8E6E0] bg-white/80 shadow-apple-lg">
        <CardContent className="p-8 text-center text-sm text-[#6B7280]">Cargando pagos...</CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-[#E8E6E0] bg-white/80 shadow-apple-lg">
        <CardContent className="p-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    )
  }

  if (payments.length === 0) {
    return (
      <Card className="border-[#E8E6E0] bg-white/80 shadow-apple-lg">
        <CardContent className="p-8 text-center text-sm text-[#6B7280]">
          Aún no hay pagos registrados para este proyecto.
        </CardContent>
      </Card>
    )
  }

  const currency = summary?.currency ?? "EUR"
  const totalPaid = formatCurrency(summary?.totalPaidCents ?? 0, currency)
  const totalPending = formatCurrency(summary?.totalPendingCents ?? 0, currency)

  // Encontrar el próximo pago pendiente
  const nextPending = payments.find((p) => p.status === "pending" && p.dueDate) ?? null
  const nextPendingAmount = nextPending ? formatCurrency(nextPending.amountCents, nextPending.currency) : null
  const nextPendingDate = nextPending?.dueDate ? formatDate(nextPending.dueDate) : null

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
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{totalPaid}</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {summary?.paidCount ?? 0} {summary?.paidCount === 1 ? "pago" : "pagos"} completados
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Pendiente</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{totalPending}</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {summary?.pendingCount ?? 0} {summary?.pendingCount === 1 ? "pago" : "pagos"} pendientes
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#E8E6E0] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Próximo hito</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{nextPendingAmount ?? "—"}</p>
            <p className="mt-1 text-xs text-[#6B7280]">{nextPendingDate ? `Vence el ${nextPendingDate}` : "Sin fecha"}</p>
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
              <div className="flex-1">
                <p className="font-heading text-lg font-semibold text-[#2F4F4F]">{payment.concept}</p>
                {payment.description && (
                  <p className="mt-1 text-sm text-[#6B7280]">{payment.description}</p>
                )}
                <p className="mt-1 text-sm text-[#6B7280]">
                  {payment.projectName ?? "Proyecto"} · Emitida el {formatDate(payment.createdAt)}
                  {payment.dueDate && ` · Vence el ${formatDate(payment.dueDate)}`}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:gap-6">
                <Badge className={getStatusBadgeClass(payment.status)}>{getStatusLabel(payment.status)}</Badge>
                <span className="font-semibold text-[#2F4F4F]">{formatCurrency(payment.amountCents, payment.currency)}</span>
                {payment.paymentLink && payment.status === "pending" && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-[#C6B89E] text-[#2F4F4F] hover:bg-[#F4F1EA]"
                  >
                    <a href={payment.paymentLink} target="_blank" rel="noopener noreferrer">
                      Pagar ahora
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
