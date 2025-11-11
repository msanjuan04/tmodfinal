import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { AlertCircle, CreditCard, Loader2, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import type { AdminPaymentRecord, AdminPaymentsSummary, PaymentStatus } from "@app/types/admin"
import type { ProjectCalendarSummary } from "@app/types/events"
import { createAdminPayment, fetchAdminPayments, type CreateAdminPaymentPayload } from "@app/lib/api/admin"
import { listProjectCalendarSummaries } from "@app/lib/api/events"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  canceled: "Cancelado",
}

const STATUS_BADGES: Record<PaymentStatus, string> = {
  draft: "bg-[#F4F1EA] text-[#6B7280]",
  pending: "bg-[#FEF3C7] text-[#B45309]",
  paid: "bg-[#DCFCE7] text-[#047857]",
  failed: "bg-[#FEE2E2] text-[#B91C1C]",
  canceled: "bg-[#E5E7EB] text-[#6B7280]",
}

const INITIAL_FORM = {
  projectId: "",
  concept: "",
  description: "",
  amount: "",
  dueDate: "",
}

function formatCurrency(amountCents: number | undefined, currency = "EUR") {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) return "—"
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

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return ""
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([])
  const [summary, setSummary] = useState<AdminPaymentsSummary | null>(null)
  const [projects, setProjects] = useState<ProjectCalendarSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAdminPayments()
      setPayments(data.payments)
      setSummary(data.summary)
    } catch (requestError) {
      console.error("Error fetching payments", requestError)
      setError("No se pudieron cargar los pagos. Inténtalo de nuevo en unos segundos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  useEffect(() => {
    void (async () => {
      try {
        const items = await listProjectCalendarSummaries()
        setProjects(items)
      } catch (requestError) {
        console.error("Error fetching project summaries", requestError)
        setProjects([])
      }
    })()
  }, [])

  const canSubmit = useMemo(() => {
    const amountNumber = Number(form.amount.replace(",", "."))
    return Boolean(form.projectId && form.concept.trim() && Number.isFinite(amountNumber) && amountNumber > 0)
  }, [form.amount, form.concept, form.projectId])

  const upcomingDueDateLabel = summary?.upcomingDueDate ? formatDate(summary.upcomingDueDate) : "—"

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setAttachmentError(null)
    if (!file) {
      setAttachmentFile(null)
      return
    }
    if (!file.type.toLowerCase().includes("pdf")) {
      setAttachmentError("Adjunta un archivo PDF.")
      event.target.value = ""
      setAttachmentFile(null)
      return
    }
    setAttachmentFile(file)
  }

  const handleSubmit = async () => {
    const normalizedAmount = Number(form.amount.replace(",", "."))
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setFormError("Introduce un importe válido.")
      return
    }

    if (!form.projectId) {
      setFormError("Selecciona un proyecto.")
      return
    }

    setFormError(null)
    setSubmitting(true)

    try {
      let attachmentPayload: CreateAdminPaymentPayload["attachment"] | undefined
      if (attachmentFile) {
        try {
          const base64 = await fileToBase64(attachmentFile)
          attachmentPayload = {
            name: attachmentFile.name,
            fileType: attachmentFile.type || "application/pdf",
            sizeLabel: formatFileSize(attachmentFile.size),
            content: base64,
          }
        } catch {
          setFormError("No se pudo leer el PDF adjunto.")
          setSubmitting(false)
          return
        }
      }

      await createAdminPayment({
        projectId: form.projectId,
        concept: form.concept.trim(),
        description: form.description.trim() || undefined,
        amount: normalizedAmount,
        currency: "EUR",
        dueDate: form.dueDate || null,
        attachment: attachmentPayload,
      })
      toast.success("Pago creado como borrador")
      setForm(INITIAL_FORM)
      setAttachmentFile(null)
      setAttachmentError(null)
      setSheetOpen(false)
      await loadPayments()
    } catch (requestError) {
      console.error("Error creating payment", requestError)
      toast.error("No se pudo crear el pago. Revisa los datos e inténtalo de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white px-6 py-6 shadow-sm">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="font-heading text-3xl text-[#2F4F4F]">Pagos & facturación</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Centraliza las propuestas de pago y consulta su estado antes de habilitar el cobro en Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-0">
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-[#F8F7F4] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Pendiente</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{formatCurrency(summary?.totalPendingCents, summary?.currency)}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Pagos enviados al cliente</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Borradores</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{formatCurrency(summary?.totalDraftCents, summary?.currency)}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Aún no enviados</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Pagado</p>
            <p className="mt-2 text-2xl font-semibold text-[#2F4F4F]">{formatCurrency(summary?.totalPaidCents, summary?.currency)}</p>
            <p className="mt-1 text-xs text-[#6B7280]">Confirmado vía Stripe</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">Próximo vencimiento</p>
            <p className="mt-2 text-xl font-semibold text-[#2F4F4F]">{upcomingDueDateLabel}</p>
            <p className="mt-1 text-xs text-[#B91C1C]">{summary?.overdueCount ? `${summary.overdueCount} atrasado(s)` : "Sin atrasos"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          className="inline-flex items-center gap-2 rounded-full border-[#E8E6E0] px-4 py-2 text-sm text-[#2F4F4F] hover:bg-[#F4F1EA]"
          onClick={() => {
            void loadPayments()
          }}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? "Actualizando" : "Actualizar"}
        </Button>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button className="inline-flex items-center gap-2 rounded-full bg-[#2F4F4F] px-5 py-2 text-sm text-white shadow-apple" disabled={projects.length === 0}>
              <Plus className="h-4 w-4" />
              Proponer pago
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-lg border-l border-[#E8E6E0] bg-white/95">
            <SheetHeader>
              <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">Nuevo pago</SheetTitle>
              <p className="text-sm text-[#6B7280]">
                Define el concepto, importe y fecha objetivo. Se registrará como borrador hasta que lo conectemos con Stripe.
              </p>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label htmlFor="payment-project">Proyecto</Label>
                <select
                  id="payment-project"
                  className="w-full rounded-[0.9rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                  value={form.projectId}
                  onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
                >
                  <option value="">Selecciona un proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.clientName ? ` · ${project.clientName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-concept">Concepto</Label>
                <Input
                  id="payment-concept"
                  value={form.concept}
                  onChange={(event) => setForm((current) => ({ ...current, concept: event.target.value }))}
                  placeholder="Fase diseño y planificación"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-description">Descripción</Label>
                <Textarea
                  id="payment-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Detalles del presupuesto aprobado, referencias o acuerdos internos."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Importe (EUR)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="2450"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-due">Fecha objetivo</Label>
                  <Input
                    id="payment-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-attachment">Presupuesto (PDF)</Label>
                <Input id="payment-attachment" type="file" accept="application/pdf" onChange={handleAttachmentChange} />
                {attachmentFile ? (
                  <p className="text-xs text-[#4B5563]">
                    Adjuntado: <strong>{attachmentFile.name}</strong> · {formatFileSize(attachmentFile.size)}
                  </p>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">Opcional. Se añadirá a Documentos como “Presupuesto”.</p>
                )}
                {attachmentError ? <p className="text-sm text-[#B91C1C]">{attachmentError}</p> : null}
              </div>

              {formError ? <p className="text-sm text-[#B91C1C]">{formError}</p> : null}
            </div>
            <SheetFooter>
              <Button className="w-full rounded-full bg-[#2F4F4F] text-white" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Guardar como borrador
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {error ? (
        <Card className="border-[#FCA5A5] bg-[#FEF2F2]">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-[#B91C1C]">
            <AlertCircle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/90 shadow-apple-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-[#2F4F4F]">Historial de propuestas</CardTitle>
          <CardDescription className="text-sm text-[#6B7280]">
            Registra cada hito de cobro y coordina con finanzas antes de activar el enlace de pago definitivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando pagos…
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[#E8E6E0] bg-[#F8F7F4] px-6 py-10 text-center text-sm text-[#6B7280]">
              Aún no hay propuestas registradas. Crea la primera para vincularla al presupuesto aceptado.
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="grid gap-4 rounded-[1.25rem] border border-[#E8E6E0] bg-white px-4 py-5 shadow-apple md:grid-cols-[2fr_1.5fr_1fr_auto]"
              >
                <div>
                  <p className="font-heading text-lg text-[#2F4F4F]">{payment.concept}</p>
                  <div className="mt-1 text-sm text-[#6B7280]">
                    {payment.projectSlug ? (
                      <Link to={`/dashboard/projects/${payment.projectSlug}`} className="font-medium text-[#2F4F4F] hover:underline">
                        {payment.projectName}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#2F4F4F]">{payment.projectName}</span>
                    )}
                    {payment.clientName ? <> · {payment.clientName}</> : null}
                  </div>
                  {payment.description ? <p className="mt-2 text-sm text-[#4B5563]">{payment.description}</p> : null}
                  {payment.proposalDocumentUrl ? (
                    <a
                      href={payment.proposalDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-[#2563EB]"
                    >
                      <Paperclip className="h-4 w-4" />
                      Ver presupuesto PDF
                    </a>
                  ) : payment.proposalDocumentName ? (
                    <p className="mt-2 text-xs text-[#9CA3AF]">Presupuesto adjunto: {payment.proposalDocumentName}</p>
                  ) : null}
                </div>
                <div className="space-y-1 text-sm text-[#4B5563]">
                  <p>Vencimiento: <span className="font-medium text-[#2F4F4F]">{formatDate(payment.dueDate)}</span></p>
                  <p>Creado: {formatDate(payment.createdAt)}</p>
                  {payment.paymentLink ? (
                    <a href={payment.paymentLink} className="text-[#2563EB]" target="_blank" rel="noreferrer">
                      Ver enlace de pago
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={STATUS_BADGES[payment.status]}>{STATUS_LABELS[payment.status]}</Badge>
                  <p className="text-lg font-semibold text-[#2F4F4F]">{formatCurrency(payment.amountCents, payment.currency)}</p>
                </div>
                <div className="flex items-center justify-end text-xs text-[#9CA3AF]">
                  ID {payment.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        resolve(result)
      } else {
        reject(new Error("Formato de archivo inválido"))
      }
    }
    reader.readAsDataURL(file)
  })
}
