import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AlertCircle, CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react"

import { fetchClientPayments, createClientPaymentCheckout } from "@app/lib/api/client"
import type { ClientPaymentRecord, ClientPaymentsSummary } from "@app/lib/api/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isStripeCheckoutUrl } from "@app/lib/payments"
import { toast } from "sonner"
import { ClientPageHeader } from "@/components/client/client-page-header"

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
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null)

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

  const handleCheckout = useCallback(
    async (payment: ClientPaymentRecord) => {
      try {
        setCheckoutPaymentId(payment.id)
        if (isStripeCheckoutUrl(payment.paymentLink)) {
          window.open(payment.paymentLink, "_blank", "noopener,noreferrer")
          return
        }
        const { url } = await createClientPaymentCheckout(payment.id)
        setPayments((current) =>
          current.map((currentPayment) =>
            currentPayment.id === payment.id ? { ...currentPayment, paymentLink: url } : currentPayment,
          ),
        )
        window.open(url, "_blank", "noopener,noreferrer")
      } catch (checkoutError) {
        console.error("Error creando checkout", checkoutError)
        const message =
          (checkoutError as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "No pudimos generar el enlace de pago. Inténtalo de nuevo."
        toast.error(message)
      } finally {
        setCheckoutPaymentId(null)
      }
    },
    [],
  )

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
      <ClientPageHeader
        overline="Facturación"
        title="Pagos y facturación"
        description="Consulta tus pagos pendientes, revisa recibos pagados y accede al enlace seguro de Stripe para abonarlos."
        icon={CreditCard}
        onRefresh={() => loadPayments()}
        refreshing={loading}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-[1.5rem] border border-[#E8E6E0] bg-white shadow-apple-sm">
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
              Pendiente de pago
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-[#2F4F4F]">
              {loading ? "—" : pendingAmount}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">Importe total de propuestas activas</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border border-[#E8E6E0] bg-white shadow-apple-sm">
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C6B89E]">
              Pagado a Terrazea
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-[#2F4F4F]">
              {loading ? "—" : paidAmount}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {summary ? `${summary.paidCount} pagos completados` : "—"}
            </p>
          </CardContent>
        </Card>
      </section>

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
                  {payment.status === "pending" ? (
                    <Button
                      className="inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-4 py-2 text-white shadow-apple-md hover:bg-[#0B766C]"
                      onClick={() => {
                        void handleCheckout(payment)
                      }}
                      disabled={checkoutPaymentId === payment.id}
                    >
                      {checkoutPaymentId === payment.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparando pago...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pagar ahora
                        </>
                      )}
                    </Button>
                  ) : payment.status === "paid" ? (
                    <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#047857]">
                      Pagado
                    </span>
                  ) : null}
                  {payment.status === "pending" && isStripeCheckoutUrl(payment.paymentLink) ? (
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
