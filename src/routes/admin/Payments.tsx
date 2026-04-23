import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import type { AdminPaymentRecord, AdminPaymentsSummary, PaymentStatus } from "@app/types/admin"
import type { ProjectCalendarSummary } from "@app/types/events"
import {
  createAdminPayment,
  deleteAdminPayment,
  fetchAdminPayments,
  updateAdminPayment,
  type CreateAdminPaymentPayload,
  type UpdateAdminPaymentPayload,
} from "@app/lib/api/admin"
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
  budgetId: "" as string | undefined | "",
  entryType: "income" as "income" | "expense",
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

function paymentType(payment: AdminPaymentRecord) {
  const metaType = typeof payment.metadata?.type === "string" ? (payment.metadata.type as string) : ""
  if (payment.amountCents < 0 || metaType === "expense") return "expense" as const
  return "income" as const
}

function normalizeAmountByType(amount: number, entryType: "income" | "expense") {
  return entryType === "expense" ? -Math.abs(amount) : Math.abs(amount)
}

function formatSignedCurrency(amountCents: number | undefined, currency = "EUR") {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) return "—"
  const sign = amountCents < 0 ? "-" : ""
  return `${sign}${formatCurrency(Math.abs(amountCents), currency)}`
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
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingPayment, setEditingPayment] = useState<AdminPaymentRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [actionPaymentId, setActionPaymentId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

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
    const fromBudgetId = searchParams.get("fromBudgetId")
    if (!fromBudgetId) return

    const budgetTitle = searchParams.get("budgetTitle") ?? ""
    const budgetTotalRaw = searchParams.get("budgetTotal")
    const budgetClient = searchParams.get("budgetClient") ?? ""

    const amountValue = budgetTotalRaw ? Number(budgetTotalRaw) : 0

    setFormMode("create")
    setEditingPayment(null)
    setForm({
      projectId: "",
      concept: budgetTitle || "Pago desde presupuesto",
      description: budgetClient ? `Pago generado desde presupuesto para ${budgetClient}.` : "",
      amount: amountValue > 0 ? amountValue.toString() : "",
      dueDate: "",
      budgetId: fromBudgetId,
      entryType: "income",
    })
    setSheetOpen(true)

    // Limpiamos el parámetro para que no rehidrate al volver
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete("fromBudgetId")
      next.delete("budgetTitle")
      next.delete("budgetTotal")
      next.delete("budgetClient")
      return next
    })
  }, [searchParams, setSearchParams])

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

  const upcomingDueDateLabel = summary?.upcomingDueDate ? formatDate(summary.upcomingDueDate) : "—"
  const currency = summary?.currency ?? "EUR"

  const finance = useMemo(() => {
    let incomePaid = 0
    let expensePaid = 0
    let pendingIncome = 0
    let pendingExpense = 0
    let draftIncome = 0
    let draftExpense = 0

    payments.forEach((payment) => {
      const amount = Math.abs(payment.amountCents ?? 0)
      const type = paymentType(payment)

      if (payment.status === "paid") {
        if (type === "income") incomePaid += amount
        else expensePaid += amount
      } else if (payment.status === "pending") {
        if (type === "income") pendingIncome += amount
        else pendingExpense += amount
      } else if (payment.status === "draft") {
        if (type === "income") draftIncome += amount
        else draftExpense += amount
      }
    })

    return {
      incomePaid,
      expensePaid,
      pendingIncome,
      pendingExpense,
      draftIncome,
      draftExpense,
      netPaid: incomePaid - expensePaid,
      netPending: pendingIncome - pendingExpense,
    }
  }, [payments])

  const monthlyNet = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = date.toLocaleDateString("es-ES", { month: "short" })
      const monthPayments = payments.filter((payment) => {
        if (payment.status !== "paid" || !payment.paidAt) return false
        const paidDate = new Date(payment.paidAt)
        return paidDate.getMonth() === date.getMonth() && paidDate.getFullYear() === date.getFullYear()
      })
      const totalCents = monthPayments.reduce((acc, payment) => {
        const type = paymentType(payment)
        const signed = normalizeAmountByType(Math.abs(payment.amountCents ?? 0), type)
        return acc + signed
      }, 0)
      months.push({ label, value: totalCents / 100 })
    }
    return months
  }, [payments])

  const overduePayments = useMemo(
    () =>
      payments.filter((payment) => {
        if (!payment.dueDate || payment.status === "paid" || payment.status === "canceled") return false
        const due = new Date(payment.dueDate)
        return due.getTime() < Date.now()
      }),
    [payments],
  )

  const summaryCards = [
    {
      label: "Ingresos cobrados",
      value: formatCurrency(finance.incomePaid, currency),
      helper: `${summary?.totalCount ?? 0} totales`,
      icon: CreditCard,
    },
    {
      label: "Gastos pagados",
      value: `-${formatCurrency(finance.expensePaid, currency)}`,
      helper: "Egresos liquidados",
      icon: FileSpreadsheet,
    },
    {
      label: "Pendiente (neto)",
      value: formatSignedCurrency(finance.netPending, currency),
      helper: `${summary?.overdueCount ?? 0} vencidos`,
      icon: Pencil,
    },
    {
      label: "Próximo vencimiento",
      value: upcomingDueDateLabel,
      helper: "Agenda de cobros/pagos",
      icon: Calendar,
    },
  ]

  const canSubmit = useMemo(() => {
    const amountNumber = Number(form.amount.replace(",", "."))
    const concept = form.concept.trim()
    return Boolean(
      form.projectId &&
        concept.length >= 3 &&
        Number.isFinite(amountNumber) &&
        amountNumber > 0 &&
        form.dueDate,
    )
  }, [form.amount, form.concept, form.projectId, form.dueDate])

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

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM)
    setFormError(null)
    setAttachmentFile(null)
    setAttachmentError(null)
    setEditingPayment(null)
    setFormMode("create")
  }, [])

  const openCreateForm = useCallback(() => {
    resetForm()
    setSheetOpen(true)
  }, [resetForm])

  const openEditForm = useCallback((payment: AdminPaymentRecord) => {
    setFormMode("edit")
    setEditingPayment(payment)
    const type = paymentType(payment)
    setForm({
      projectId: payment.projectId,
      concept: payment.concept,
      description: payment.description ?? "",
      amount: Math.abs(payment.amountCents / 100).toString(),
      dueDate: payment.dueDate ?? "",
      budgetId: payment.budgetId ?? undefined,
      entryType: type,
    })
    setFormError(null)
    setAttachmentFile(null)
    setAttachmentError(null)
    setSheetOpen(true)
  }, [])

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

    const trimmedConcept = form.concept.trim()
    if (trimmedConcept.length < 3) {
      setFormError("Introduce un concepto de al menos 3 caracteres.")
      return
    }

    if (!form.dueDate) {
      setFormError("Selecciona la fecha objetivo.")
      return
    }

    setFormError(null)
    setSubmitting(true)

    try {
      const signedAmount = normalizeAmountByType(normalizedAmount, form.entryType)

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

      if (formMode === "edit" && editingPayment) {
        const payload: UpdateAdminPaymentPayload = {
          concept: trimmedConcept,
          description: form.description.trim() || undefined,
          amount: editingPayment.status === "draft" ? signedAmount : undefined,
          currency: editingPayment.status === "draft" ? "EUR" : undefined,
          dueDate: form.dueDate || null,
          attachment: attachmentPayload,
        }
        await updateAdminPayment(editingPayment.id, payload)
        toast.success("Pago actualizado")
      } else {
        const payment = await createAdminPayment({
          projectId: form.projectId,
          concept: trimmedConcept,
          description: form.description.trim() || undefined,
          amount: signedAmount,
          currency: "EUR",
          dueDate: form.dueDate || null,
          attachment: attachmentPayload,
          budgetId: form.budgetId || undefined,
        })
        toast.success(
          payment.status === "pending" ? "Pago enviado al cliente" : "Pago creado, pendiente de envío",
        )
      }

      resetForm()
      setSheetOpen(false)
      await loadPayments()
    } catch (requestError) {
      console.error("Error creating payment", requestError)
      const err = requestError as { response?: { data?: { message?: string } } }
      const message =
        err.response?.data?.message ?? "No se pudo guardar el pago. Revisa los datos e inténtalo de nuevo."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = useCallback(
    async (payment: AdminPaymentRecord) => {
      const confirmed = window.confirm(
        `¿Quieres eliminar la propuesta "${payment.concept}"? Esta acción no se puede deshacer.`,
      )
      if (!confirmed) return

      setActionPaymentId(payment.id)
      try {
        await deleteAdminPayment(payment.id)
        toast.success("Pago eliminado")
        await loadPayments()
      } catch (requestError) {
        console.error("Error deleting payment", requestError)
        const err = requestError as { response?: { data?: { message?: string } } }
        const message = err.response?.data?.message ?? "No se pudo eliminar el pago. Inténtalo más tarde."
        toast.error(message)
      } finally {
        setActionPaymentId(null)
      }
    },
    [loadPayments],
  )

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
            Facturación
          </p>
        </div>
        <h1 className="mt-3 font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
          Pagos &amp; facturación
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
          Centraliza las propuestas de pago y consulta su estado antes de habilitar el cobro en Stripe.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <PaymentSummaryCard key={card.label} card={card} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/90 shadow-apple-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
              <TrendingUp className="h-5 w-5" />
              Flujo (ingresos - gastos)
            </CardTitle>
            <CardDescription className="text-sm text-[#6B7280]">
              Evolución neta de movimientos confirmados (estado pagado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsTrendChart data={monthlyNet} currency={currency} />
          </CardContent>
        </Card>
        <AlertsCard overdueCount={summary?.overdueCount ?? 0} upcomingLabel={upcomingDueDateLabel} alerts={overduePayments} />
      </section>

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

        <Button
          asChild
          variant="outline"
          className="inline-flex items-center gap-2 rounded-full border-[#E8E6E0] px-4 py-2 text-sm text-[#2F4F4F] hover:bg-[#F4F1EA]"
        >
          <Link to="/dashboard/budgets">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Ir a presupuestos
          </Link>
        </Button>

        <Sheet
          open={sheetOpen}
          onOpenChange={(nextOpen) => {
            setSheetOpen(nextOpen)
            if (!nextOpen) {
              resetForm()
            }
          }}
        >
          <SheetTrigger asChild>
            <Button
              className="inline-flex items-center gap-2 rounded-full bg-[#2F4F4F] px-5 py-2 text-sm text-white shadow-apple"
              disabled={projects.length === 0}
              onClick={openCreateForm}
            >
              <Plus className="h-4 w-4" />
              Proponer pago
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-lg border-l border-[#E8E6E0] bg-white/95">
            <SheetHeader>
              <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
                {formMode === "create" ? "Nuevo pago" : "Editar pago"}
              </SheetTitle>
              <p className="text-sm text-[#6B7280]">
                {formMode === "create"
                  ? "Define el concepto, importe y fecha objetivo."
                  : "Actualiza la información o añade el documento pendiente."}
              </p>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label htmlFor="payment-project">Proyecto</Label>
                <select
                  id="payment-project"
                  className="w-full rounded-[0.9rem] border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20 disabled:cursor-not-allowed"
                  value={form.projectId}
                  disabled={formMode === "edit"}
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
                {formMode === "edit" && editingPayment ? (
                  <p className="text-xs text-[#6B7280]">Este pago pertenece a {editingPayment.projectName}.</p>
                ) : null}
              </div>

              {formMode === "edit" && editingPayment?.budgetId ? (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-[#6B7280]">Presupuesto vinculado</span>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#F8F7F4] px-3 py-1 text-xs text-[#374151]">
                    <FileSpreadsheet className="h-3 w-3 text-[#2F4F4F]" />
                    <span>ID: {editingPayment.budgetId}</span>
                  </div>
                </div>
              ) : null}

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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="payment-type">Tipo</Label>
                  <select
                    id="payment-type"
                    className="w-full rounded-[0.75rem] border border-[#E8E6E0] bg-[#F8F7F4] px-3 py-2 text-sm text-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
                    value={form.entryType}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, entryType: event.target.value as "income" | "expense" }))
                    }
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Los gastos restan del total y se muestran en negativo.
                  </p>
                </div>
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
                    disabled={formMode === "edit" && editingPayment?.status !== "draft"}
                  />
                  {formMode === "edit" && editingPayment?.status !== "draft" ? (
                    <p className="text-xs text-[#9CA3AF]">No puedes cambiar el importe de un pago enviado.</p>
                  ) : null}
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
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : formMode === "create" ? (
                  <CreditCard className="mr-2 h-4 w-4" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                {submitting ? (formMode === "create" ? "Enviando…" : "Guardando…") : formMode === "create" ? "Enviar pago" : "Guardar cambios"}
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
              <PaymentCard
                key={payment.id}
                payment={payment}
                deleting={actionPaymentId === payment.id}
                onEdit={() => openEditForm(payment)}
                onDelete={() => {
                  void handleDeletePayment(payment)
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface SummaryCardData {
  label: string
  value: string
  helper: string
  icon: typeof CreditCard
}

function PaymentSummaryCard({ card }: { card: SummaryCardData }) {
  const Icon = card.icon
  return (
    <div className="group flex flex-col gap-3 rounded-[1.4rem] border border-[#E8E6E0] bg-white/90 p-4 shadow-apple transition hover:-translate-y-1 hover:shadow-apple-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#C6B89E]">{card.label}</p>
          <p className="mt-2 text-3xl font-bold text-[#2F4F4F]">{card.value}</p>
        </div>
        <div className="rounded-[1rem] bg-[#2F4F4F] p-3 text-white shadow-apple">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-xs text-[#6B7280]">{card.helper}</p>
    </div>
  )
}

function PaymentsTrendChart({ data, currency }: { data: Array<{ label: string; value: number }>; currency: string }) {
  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1)
  return (
    <div className="flex items-end gap-4">
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-40 w-full items-end rounded-[1.5rem] bg-[#F5F5F5]">
            <div
              className={`w-full rounded-[1.5rem] ${
                item.value >= 0
                  ? "bg-gradient-to-t from-[#2F4F4F] to-[#4A6B6B]"
                  : "bg-gradient-to-t from-[#FCA5A5] to-[#FB7185]"
              } shadow-apple`}
              style={{ height: `${Math.max((Math.abs(item.value) / max) * 100, 5)}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-[#2F4F4F] uppercase tracking-[0.2em]">{item.label}</p>
          <p className="text-xs text-[#6B7280]">
            {formatSignedCurrency(Math.round(item.value * 100), currency)}
          </p>
        </div>
      ))}
    </div>
  )
}

function AlertsCard({
  overdueCount,
  upcomingLabel,
  alerts,
}: {
  overdueCount: number
  upcomingLabel: string
  alerts: AdminPaymentRecord[]
}) {
  return (
    <Card className="rounded-[1.5rem] border-[#E8E6E0] bg-white/90 shadow-apple-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2F4F4F]">
          <AlertCircle className="h-5 w-5 text-[#B91C1C]" />
          Alertas de cobro
        </CardTitle>
        <CardDescription className="text-sm text-[#6B7280]">
          {overdueCount > 0 ? `${overdueCount} pagos vencidos` : "Sin pagos atrasados"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.2rem] border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          Próximo vencimiento: <span className="font-semibold">{upcomingLabel}</span>
        </div>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No hay pagos vencidos. Sigue así 👏</p>
          ) : (
            alerts.slice(0, 3).map((payment) => (
              <div key={payment.id} className="rounded-[1rem] border border-[#FEE2E2] bg-white px-3 py-2 text-sm shadow-apple-sm">
                <p className="font-medium text-[#B91C1C]">{payment.concept}</p>
                <p className="text-xs text-[#6B7280]">
                  Vencido el {formatDate(payment.dueDate)} · {formatSignedCurrency(payment.amountCents, payment.currency)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentCard({
  payment,
  deleting,
  onEdit,
  onDelete,
}: {
  payment: AdminPaymentRecord
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const type = paymentType(payment)
  const isOverdue =
    payment.dueDate && payment.status !== "paid" && payment.status !== "canceled"
      ? new Date(payment.dueDate).getTime() < Date.now()
      : false

  const statusIconMap: Record<PaymentStatus, typeof CreditCard> = {
    draft: Pencil,
    pending: Clock,
    paid: CheckCircle,
    failed: AlertCircle,
    canceled: Trash2,
  }

  const StatusIcon = statusIconMap[payment.status] ?? CreditCard

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-[#E8E6E0] bg-white px-4 py-5 shadow-apple transition hover:-translate-y-1 hover:shadow-apple-xl">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4 text-[#2F4F4F]" />
            <p className="font-heading text-lg text-[#2F4F4F]">{payment.concept}</p>
            <Badge
              className={`${
                type === "income" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#B91C1C]"
              }`}
            >
              {type === "income" ? "Ingreso" : "Gasto"}
            </Badge>
          </div>
          <div className="text-sm text-[#6B7280]">
            {payment.projectSlug ? (
              <Link to={`/dashboard/projects/${payment.projectSlug}`} className="font-medium text-[#2F4F4F] hover:underline">
                {payment.projectName}
              </Link>
            ) : (
              <span className="font-medium text-[#2F4F4F]">{payment.projectName}</span>
            )}
            {payment.clientName ? <> · {payment.clientName}</> : null}
          </div>
          {payment.description ? <p className="text-sm text-[#4B5563]">{payment.description}</p> : null}
          {payment.proposalDocumentUrl ? (
            <a href={payment.proposalDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#2563EB]">
              <Paperclip className="h-4 w-4" />
              Ver presupuesto PDF
            </a>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
            <span>Creado: {formatDate(payment.createdAt)}</span>
            <span>·</span>
            <span>Vence: {formatDate(payment.dueDate)}</span>
            {payment.paymentLink ? (
              <>
                <span>·</span>
                <a href={payment.paymentLink} target="_blank" rel="noreferrer" className="text-[#2563EB]">
                  Enlace de pago
                </a>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <Badge className={STATUS_BADGES[payment.status]}>{STATUS_LABELS[payment.status]}</Badge>
          <p className="text-2xl font-semibold text-[#2F4F4F]">
            {formatSignedCurrency(payment.amountCents, payment.currency)}
          </p>
          {isOverdue ? (
            <Badge className="bg-[#FEE2E2] text-[#B91C1C]">Pago vencido</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#9CA3AF]">ID {payment.id.slice(0, 8).toUpperCase()}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[#E8E6E0] text-[#2F4F4F] hover:bg-[#F8F7F4]"
            onClick={onEdit}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]"
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Eliminar
          </Button>
        </div>
      </div>
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
