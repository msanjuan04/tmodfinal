import { createServerSupabaseClient } from "../../../../lib/supabase/server"
import { env } from "../../../config/env"
import { sendPaymentReminderEmail } from "../../email"
import { hasRecentNotification, recordNotification } from "../dedupe"

// Dos avisos por pago pendiente:
//   · 3 días antes del due_date → recordatorio "próximo a vencer"
//   · pasado el due_date sin pagar → aviso de "pago vencido"
// Ambos sólo para status pending/sent (el resto ya no tienen sentido).

const UPCOMING_TYPE = "payment_reminder_upcoming"
const OVERDUE_TYPE = "payment_reminder_overdue"
const UPCOMING_DAYS = 3

type PendingStatus = "draft" | "pending"

const PENDING_STATUSES: PendingStatus[] = ["draft", "pending"]

function toDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  // Supabase devuelve "YYYY-MM-DD" para tipo date, lo fijamos a mediodía UTC
  // para evitar bailes de zona horaria.
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60_000
  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

export async function runPaymentRemindersJob(): Promise<void> {
  const supabase = createServerSupabaseClient()

  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)

  const upcomingCutoff = new Date(today.getTime() + UPCOMING_DAYS * 24 * 60 * 60_000)
  const upcomingCutoffIso = upcomingCutoff.toISOString().slice(0, 10)
  const todayIso = today.toISOString().slice(0, 10)

  const selectClause = `
    id, project_id, client_id, concept, amount_cents, currency, status,
    due_date, payment_link,
    projects:projects(id, name),
    clients:clients(id, full_name, email)
  `

  // Ventana amplia: todo lo pendiente con due_date en [hoy-90, hoy+UPCOMING_DAYS].
  // Luego clasificamos en memoria para elegir variante.
  const lowerBound = new Date(today.getTime() - 90 * 24 * 60 * 60_000).toISOString().slice(0, 10)

  const { data: payments, error } = await supabase
    .from("project_payments")
    .select(selectClause)
    .in("status", PENDING_STATUSES)
    .gte("due_date", lowerBound)
    .lte("due_date", upcomingCutoffIso)
    .limit(500)

  if (error) {
    console.error("[scheduler:payments] error buscando pagos", error)
    return
  }

  const portalBase = env.clientAppUrl.replace(/\/$/, "")
  const list = payments ?? []
  let sent = 0

  for (const payment of list) {
    if (!payment.due_date) continue
    const dueDate = toDateOnly(payment.due_date)
    if (!dueDate) continue

    const diffDays = daysBetween(today, dueDate)
    const client = Array.isArray(payment.clients) ? payment.clients[0] : payment.clients
    const project = Array.isArray(payment.projects) ? payment.projects[0] : payment.projects
    if (!client?.email) continue

    const paymentLink = payment.payment_link ?? `${portalBase}/client/payments?payment=${payment.id}`

    let variant: "upcoming" | "overdue"
    let type: string
    let daysLabel: string

    if (diffDays > 0 && diffDays <= UPCOMING_DAYS) {
      variant = "upcoming"
      type = UPCOMING_TYPE
      daysLabel = diffDays === 1 ? "mañana" : `en ${diffDays} días`
    } else if (diffDays <= 0) {
      variant = "overdue"
      type = OVERDUE_TYPE
      daysLabel = diffDays === 0 ? "hoy" : `hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? "" : "s"}`
    } else {
      continue
    }

    const alreadySent = await hasRecentNotification({
      supabase,
      type,
      relatedId: payment.id,
      // Para overdue permitimos re-envío cada 7 días; para upcoming una única
      // vez dado que la ventana es corta.
      since: variant === "overdue" ? new Date(Date.now() - 7 * 24 * 60 * 60_000) : undefined,
    })
    if (alreadySent) continue

    try {
      await sendPaymentReminderEmail({
        to: client.email,
        name: client.full_name ?? "Cliente Terrazea",
        variant,
        concept: payment.concept,
        amountCents: Number(payment.amount_cents ?? 0),
        currency: payment.currency ?? "EUR",
        dueDate: payment.due_date,
        paymentLink,
        projectName: project?.name ?? null,
        daysLabel,
      })

      await recordNotification({
        supabase,
        type,
        relatedId: payment.id,
        audience: "client",
        clientId: client.id ?? payment.client_id ?? null,
        projectId: project?.id ?? payment.project_id ?? null,
        title:
          variant === "overdue"
            ? `Aviso de pago vencido: ${payment.concept}`
            : `Recordatorio de pago: ${payment.concept}`,
        description: variant === "overdue" ? `Vencido ${daysLabel}` : `Vence ${daysLabel}`,
        linkUrl: paymentLink,
      })
      sent += 1
    } catch (error) {
      console.error(`[scheduler:payments] fallo enviando a ${client.email}`, error)
    }
  }

  console.log(`[scheduler:payments] enviados ${sent}/${list.length}`)
}
