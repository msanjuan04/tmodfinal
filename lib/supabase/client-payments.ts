import { createServerSupabaseClient } from "./server"

export interface ClientPaymentRecord {
  id: string
  projectId: string
  projectName: string | null
  projectSlug: string | null
  concept: string
  description: string | null
  status: "draft" | "pending" | "paid" | "cancelled"
  amountCents: number
  currency: string
  dueDate: string | null
  paymentLink: string | null
  sentAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

const CLIENT_PAYMENT_SELECT = `
  id,
  project_id,
  concept,
  description,
  amount_cents,
  currency,
  status,
  due_date,
  payment_link,
  sent_at,
  paid_at,
  created_at,
  updated_at,
  projects (
    name,
    slug
  )
`

type ClientPaymentRow = {
  id: string
  project_id: string
  concept: string
  description: string | null
  amount_cents: number
  currency: string
  status: "draft" | "pending" | "paid" | "cancelled"
  due_date: string | null
  payment_link: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  projects: { name: string | null; slug: string | null } | null
}

function mapClientPayment(row: ClientPaymentRow): ClientPaymentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    projectSlug: row.projects?.slug ?? null,
    concept: row.concept,
    description: row.description ?? null,
    status: row.status,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : Number(row.amount_cents),
    currency: (row.currency ?? "EUR").toUpperCase(),
    dueDate: row.due_date,
    paymentLink: row.payment_link ?? null,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface ClientPaymentsSummary {
  totalCount: number
  paidCount: number
  pendingCount: number
  draftCount: number
  totalPaidCents: number
  totalPendingCents: number
  currency: string
}

function calculateClientSummary(payments: ClientPaymentRecord[]): ClientPaymentsSummary {
  let totalPaidCents = 0
  let totalPendingCents = 0
  let paidCount = 0
  let pendingCount = 0
  let draftCount = 0

  for (const payment of payments) {
    if (payment.status === "paid") {
      totalPaidCents += payment.amountCents
      paidCount += 1
    } else if (payment.status === "pending") {
      totalPendingCents += payment.amountCents
      pendingCount += 1
    } else if (payment.status === "draft") {
      draftCount += 1
    }
  }

  return {
    totalCount: payments.length,
    paidCount,
    pendingCount,
    draftCount,
    totalPaidCents,
    totalPendingCents,
    currency: payments[0]?.currency ?? "EUR",
  }
}

export async function listClientPayments(
  clientId: string,
  projectSlug?: string | null,
): Promise<{ payments: ClientPaymentRecord[]; summary: ClientPaymentsSummary }> {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from("project_payments")
    .select(CLIENT_PAYMENT_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (projectSlug) {
    const { data: project } = await supabase.from("projects").select("id").eq("slug", projectSlug).maybeSingle()
    if (project) {
      query = query.eq("project_id", project.id)
    }
  }

  const { data, error } = await query

  if (error) throw error

  const payments = (data as ClientPaymentRow[] | null)?.map(mapClientPayment) ?? []
  return {
    payments,
    summary: calculateClientSummary(payments),
  }
}

