import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertCircle, CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react"

import { fetchClientPayments } from "@app/lib/api/client"
import type { ClientPaymentRecord, ClientPaymentsSummary } from "@app/lib/api/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const STATUS_LABELS: Record<ClientPaymentRecord["status"], string> = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
}

const STATUS_BADGES: Record<ClientPaymentRecord["status"], string> = {
  draft: "bg-[#F4F1EA] text-[#6B7280]",
  pending: "bg-[#FEF3C7] text-[#B45309]",
  paid: "bg-[#DCFCE7] text-[#047857]",
  cancelled: "bg-[#E5E7EB] text-[#6B7280]",
}

function formatCurrency(amountCents: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amountCents / 100)
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`
  }
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha"
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es })
  } catch {
    return value
  }
}

export function ClientPaymentsPage() {
  const [payments, setPayments] = useState<ClientPaymentRecord[]>([])
  const [summary, setSummary] = useState<ClientPaymentsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchClientPayments()
      setPayments(data.payments)
      setSummary(data.summary)
    } catch (requestError) {
      console.error("Error fetching client payments", requestError)
      setError("No pudimos cargar tus pagos. Inténtalo de nuevo en unos segundos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  const pendingAmount = useMemo(() => {
    if (!summary) return "—"
    return formatCurrency(summary.totalPendingCents, summary.currency)
  }, [summary])

  const paidAmount = useMemo(() => {
    if (!summary) return "—"
    return formatCurrency(summary.totalPaidCents, summary.currency)
  }, [summary])

  return (
    <div className="space-y-6 pb-16">
      <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/80 px-6 py-6 shadow-apple-xl">
        <CardHeader className="p-0 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-heading text-2xl text-[#2F4F4F]">Pagos y facturación</CardTitle>
              <CardDescription className="text-sm text-[#6B7280]">
                Consulta tus pagos pendientes, revisa recibos pagados y accede al enlace seguro de Stripe para abonarlos.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-full border-[#E8E6E0] px-4 py-2 text-sm text-[#2F4F4F]"
              onClick={() => loadPayments()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Pendiente de pago</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{loading ? "—" : pendingAmount}</p>
            <p className="text-xs text-[#6B7280]">Importe total de propuestas activas</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Pagado a Terrazea</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{loading ? "—" : paidAmount}</p>
            <p className="text-xs text-[#6B7280]">{summary ? `${summary.paidCount} pagos completados` : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-[#B91C1C]">
            <AlertCircle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card className="border-[#E8E6E0] bg-white">
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando tus pagos…
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="border-dashed border-[#E8E6E0] bg-white/70">
          <CardContent className="py-10 text-center text-sm text-[#6B7280]">
            Aquí aparecerán tus propuestas y pagos. En cuanto activemos la primera, recibirás el enlace directo para pagarla.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className="border-[#E8E6E0] bg-white/90 shadow-apple-md transition hover:border-[#2F4F4F]"
            >
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-lg text-[#2F4F4F]">{payment.concept}</p>
                    <Badge className={STATUS_BADGES[payment.status]}>{STATUS_LABELS[payment.status]}</Badge>
                  </div>
                  <p className="text-sm text-[#6B7280]">
                    {payment.projectName ?? "Proyecto Terrazea"} · {formatCurrency(payment.amountCents, payment.currency)}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    {payment.status === "paid"
                      ? `Pagado el ${formatDate(payment.paidAt)}`
                      : `Vencimiento ${formatDate(payment.dueDate)}`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-sm text-[#4B5563] md:text-right">
                  {payment.status === "pending" && payment.paymentLink ? (
                    <Button
                      asChild
                      className="inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-4 py-2 text-white shadow-apple-md hover:bg-[#0B766C]"
                    >
                      <a href={payment.paymentLink} target="_blank" rel="noreferrer">
                        <CreditCard className="h-4 w-4" />
                        Pagar ahora
                      </a>
                    </Button>
                  ) : payment.status === "paid" ? (
                    <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#047857]">
                      Pagado
                    </span>
                  ) : null}
                  {payment.paymentLink && payment.status === "pending" ? (
                    <a
                      href={payment.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0D9488]"
                    >
                      Ver enlace seguro <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
