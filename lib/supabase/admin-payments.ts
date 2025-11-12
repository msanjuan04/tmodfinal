import { createServerSupabaseClient } from "./server"
import type { AdminPaymentRecord, AdminPaymentsSummary, PaymentStatus } from "@app/types/admin"

const STORAGE_BUCKET = "project-assets"

const PAYMENT_SELECT = `
  id,
  project_id,
  client_id,
  concept,
  description,
  amount_cents,
  currency,
  status,
  due_date,
  stripe_payment_intent_id,
  stripe_checkout_session_id,
  stripe_customer_id,
  stripe_invoice_id,
  payment_link,
  proposal_document_id,
  created_by,
  sent_at,
  paid_at,
  created_at,
  updated_at,
  metadata,
  projects (
    name,
    slug
  ),
  clients (
    full_name,
    email,
    stripe_customer_id
  ),
  proposal_document:project_documents!project_payments_proposal_document_id_fkey(
    id,
    name,
    storage_path
  )
`

type PaymentRow = {
  id: string
  project_id: string
  client_id: string
  concept: string
  description: string | null
  amount_cents: number
  currency: string
  status: PaymentStatus
  due_date: string | null
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  stripe_checkout_session_id: string | null
  stripe_customer_id: string | null
  payment_link: string | null
  proposal_document_id: string | null
  created_by: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
  projects: { name: string | null; slug: string | null } | null
  clients: { full_name: string | null; email: string | null; stripe_customer_id: string | null } | null
  proposal_document: { id: string; name: string | null; storage_path: string | null } | null
}

function mapPayment(row: PaymentRow, resolveDocumentUrl: (path: string | null) => string | null): AdminPaymentRecord {
  const documentPath = row.proposal_document?.storage_path ?? null
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? "Proyecto sin nombre",
    projectSlug: row.projects?.slug ?? null,
    clientId: row.client_id,
    clientName: row.clients?.full_name ?? null,
    concept: row.concept,
    description: row.description ?? null,
    status: row.status,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : Number(row.amount_cents),
    currency: (row.currency ?? "EUR").toUpperCase(),
    dueDate: row.due_date,
    paymentLink: row.payment_link ?? null,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeInvoiceId: row.stripe_invoice_id ?? null,
    createdBy: row.created_by ?? null,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata ?? {},
    clientEmail: row.clients?.email ?? null,
    clientStripeCustomerId: row.clients?.stripe_customer_id ?? null,
    proposalDocumentId: row.proposal_document_id ?? row.proposal_document?.id ?? null,
    proposalDocumentName: row.proposal_document?.name ?? null,
    proposalDocumentUrl: resolveDocumentUrl(documentPath),
  }
}

function calculateSummary(payments: AdminPaymentRecord[]): AdminPaymentsSummary {
  const initialCounts: Record<PaymentStatus, number> = {
    draft: 0,
    pending: 0,
    paid: 0,
    failed: 0,
    canceled: 0,
  }

  let totalDraftCents = 0
  let totalPendingCents = 0
  let totalPaidCents = 0
  let overdueCount = 0
  let upcomingDueDate: string | null = null
  const today = new Date().toISOString().split("T")[0]

  for (const payment of payments) {
    initialCounts[payment.status] = (initialCounts[payment.status] ?? 0) + 1

    if (payment.status === "draft") {
      totalDraftCents += payment.amountCents
    } else if (payment.status === "pending") {
      totalPendingCents += payment.amountCents
      if (payment.dueDate) {
        if (payment.dueDate < today) {
          overdueCount += 1
        } else if (!upcomingDueDate || payment.dueDate < upcomingDueDate) {
          upcomingDueDate = payment.dueDate
        }
      }
    } else if (payment.status === "paid") {
      totalPaidCents += payment.amountCents
    }
  }

  return {
    totalCount: payments.length,
    overdueCount,
    upcomingDueDate,
    totalsByStatus: initialCounts,
    totalDraftCents,
    totalPendingCents,
    totalPaidCents,
    currency: payments[0]?.currency ?? "EUR",
  }
}

export async function getAdminPaymentById(paymentId: string): Promise<AdminPaymentRecord | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const storage = supabase.storage.from(STORAGE_BUCKET)
  const resolveDocumentUrl = (path: string | null) => {
    if (!path) return null
    const { data: urlData } = storage.getPublicUrl(path)
    return urlData?.publicUrl ?? null
  }
  return mapPayment(data as PaymentRow, resolveDocumentUrl)
}

export async function listAdminPayments(): Promise<{ payments: AdminPaymentRecord[]; summary: AdminPaymentsSummary }> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("project_payments")
    .select(PAYMENT_SELECT)
    .order("created_at", { ascending: false })

  if (error) throw error

  const storage = supabase.storage.from(STORAGE_BUCKET)
  const resolveDocumentUrl = (path: string | null) => {
    if (!path) return null
    const { data: urlData } = storage.getPublicUrl(path)
    return urlData?.publicUrl ?? null
  }

  const payments = (data as PaymentRow[] | null)?.map((row) => mapPayment(row, resolveDocumentUrl)) ?? []
  return {
    payments,
    summary: calculateSummary(payments),
  }
}

export interface CreateProjectPaymentInput {
  projectId: string
  concept: string
  description?: string | null
  amountCents: number
  currency: string
  dueDate?: string | null
  createdBy: string
  proposalDocumentId?: string | null
}

export interface UpdateProjectPaymentInput {
  concept?: string
  description?: string | null
  amountCents?: number
  currency?: string
  dueDate?: string | null
  proposalDocumentId?: string | null
}

export async function createProjectPayment(input: CreateProjectPaymentInput): Promise<AdminPaymentRecord> {
  const supabase = createServerSupabaseClient()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", input.projectId)
    .maybeSingle()

  if (projectError) throw projectError
  if (!project) {
    throw new Error("No se encontró el proyecto para crear el pago")
  }

  const sanitizedConcept = input.concept.trim()
  const sanitizedDescription = input.description?.trim() || null
  const currency = input.currency.toUpperCase()

  const { data, error } = await supabase
    .from("project_payments")
    .insert({
      project_id: input.projectId,
      client_id: project.client_id,
      concept: sanitizedConcept,
      description: sanitizedDescription,
      amount_cents: input.amountCents,
      currency,
      status: "draft",
      due_date: input.dueDate ?? null,
      created_by: input.createdBy,
      proposal_document_id: input.proposalDocumentId ?? null,
    })
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!data?.id) {
    throw new Error("No se pudo crear el registro de pago")
  }

  const payment = await getAdminPaymentById(data.id)
  if (!payment) {
    throw new Error("No se pudo recuperar el pago creado")
  }
  return payment
}

export async function updateProjectPayment(paymentId: string, input: UpdateProjectPaymentInput): Promise<AdminPaymentRecord> {
  const supabase = createServerSupabaseClient()
  const existing = await getAdminPaymentById(paymentId)
  if (!existing) {
    throw new Error("Pago no encontrado")
  }

  if (existing.status === "paid") {
    throw new Error("Los pagos completados no pueden modificarse.")
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.concept !== undefined) update.concept = input.concept.trim()
  if (input.description !== undefined) update.description = input.description
  if (input.dueDate !== undefined) update.due_date = input.dueDate ?? null
  if (input.proposalDocumentId !== undefined) update.proposal_document_id = input.proposalDocumentId

  if (input.amountCents !== undefined) {
    if (existing.status !== "draft") {
      throw new Error("Solo puedes modificar el importe en pagos en borrador.")
    }
    update.amount_cents = input.amountCents
  }

  if (input.currency !== undefined) {
    if (existing.status !== "draft") {
      throw new Error("Solo puedes modificar la divisa en pagos en borrador.")
    }
    update.currency = input.currency.toUpperCase()
  }

  const { error } = await supabase.from("project_payments").update(update).eq("id", paymentId)
  if (error) throw error

  const updated = await getAdminPaymentById(paymentId)
  if (!updated) throw new Error("No se pudo recuperar el pago actualizado")
  return updated
}

export async function deleteProjectPayment(paymentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("project_payments").delete().eq("id", paymentId)
  if (error) throw error
}
