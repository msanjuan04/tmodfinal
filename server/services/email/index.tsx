import type { ReactElement } from "react"
import { render } from "@react-email/render"
import type { CreateEmailOptions } from "resend"
import { Resend } from "resend"

import { env } from "../../config/env"
import { createServerSupabaseClient } from "../../../lib/supabase/server"
import {
  AccountActivatedEmail,
  ActivationReminderEmail,
  ClientInviteEmail,
  DocumentLifecycleEmail,
  type DocumentLifecycleVariant,
  DocumentSharedEmail,
  EmailChangeNoticeEmail,
  EventReminderEmail,
  MessageNotificationEmail,
  MilestoneCompletedEmail,
  NewProjectAssignedEmail,
  PasswordResetEmail,
  PaymentReceiptEmail,
  PaymentReminderEmail,
  type PaymentReminderVariant,
  PaymentRequestEmail,
  PaymentStatusEmail,
  type PaymentStatusVariant,
  ProjectFeedbackEmail,
  ProjectStatusChangeEmail,
  type ProjectStatusKey,
  TeamAssignmentEmail,
  type UnreadConversationSummary,
  UnreadMessagesDigestEmail,
  WeeklyDigestEmail,
  type WeeklyDigestProjectSummary,
} from "../../emails"

const resend = new Resend(env.resend.apiKey)
const isDryRun = env.resend.dryRun

// Registra en project_notifications el fallo de envío para que Operaciones lo
// vea en el panel admin. No mandamos otro correo (evitamos bucles si el fallo
// es global de Resend) y tragamos cualquier error del insert.
async function logEmailDeliveryFailure(params: {
  to: string | string[]
  subject: string
  attempts: number
  error: string
}) {
  try {
    const supabase = createServerSupabaseClient()
    const recipient = Array.isArray(params.to) ? params.to.join(", ") : params.to
    const title = `Fallo de envío de correo · ${truncate(params.subject, 80)}`
    await supabase.from("project_notifications").insert({
      audience: "admin",
      type: "email_delivery_failure",
      title,
      description: truncate(params.error, 400),
      metadata: {
        to: recipient,
        subject: params.subject,
        attempts: params.attempts,
        error: params.error,
      },
    })
  } catch (logError) {
    // El fallo del log no debe enmascarar el fallo original.
    console.error("[email] No se pudo registrar el fallo de entrega", logError)
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

interface SendEmailInput {
  to: string | string[]
  subject: string
  react?: ReactElement
  text?: string
  bcc?: string | string[] | null
  replyTo?: string
  retries?: number
  forceSend?: boolean
}

export async function sendEmail({ to, subject, react, text, bcc, replyTo, retries = 2, forceSend = false }: SendEmailInput) {
  if (!react && !text) {
    throw new Error("sendEmail requiere contenido react o text.")
  }

  const html = react ? await render(react) : undefined
  const base = {
    from: env.resend.fromEmail,
    to,
    subject,
    bcc: bcc ?? env.resend.bccEmail ?? undefined,
    replyTo,
  }

  let payload: CreateEmailOptions
  if (html) {
    payload = {
      ...base,
      html,
      ...(text ? { text } : {}),
    }
  } else if (text) {
    payload = {
      ...base,
      text,
    }
  } else {
    throw new Error("sendEmail requiere al menos html o text.")
  }

  if (isDryRun && !forceSend) {
    console.info("[email:dry-run]", { to, subject })
    return null
  }

  console.log(`[email] Enviando correo a ${to} (forceSend: ${forceSend}, dryRun: ${isDryRun})`)

  for (let attempt = 1; attempt <= Math.max(retries, 1); attempt += 1) {
    try {
      const result = await resend.emails.send(payload)

      // Resend puede devolver errores en el objeto result en lugar de lanzar excepciones
      if (result.error) {
        const errorMessage = `Resend API error: ${result.error.message || result.error.name || "Unknown error"}`
        console.error(`[email] Error de Resend (intento ${attempt}):`, result.error)
        if (attempt === retries) {
          await logEmailDeliveryFailure({ to, subject, attempts: attempt, error: errorMessage })
          throw new Error(errorMessage)
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
        continue
      }

      console.log(`[email] Correo enviado exitosamente (intento ${attempt})`, result.data)
      return result
    } catch (error) {
      console.error(`[email] Falló intento ${attempt} (${subject})`, error)
      if (attempt === retries) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        await logEmailDeliveryFailure({ to, subject, attempts: attempt, error: errorMessage })
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
}

export async function sendClientWelcomeEmail(params: {
  to: string
  name: string
  projectCode?: string | null
  projectName?: string | null
  forceSend?: boolean
}) {
  // Apuntamos al login público: el cliente pulsa el botón, elige el tab
  // "Código de proyecto", introduce el código de arriba y crea su contraseña.
  const portalUrl = `${env.clientAppUrl.replace(/\/$/, "")}/login?mode=code`
  const subject = params.projectName
    ? `Bienvenido al Portal Terrazea · ${params.projectName}`
    : "Bienvenido al Portal Terrazea · activa tu acceso"
  await sendEmail({
    to: params.to,
    subject,
    react: (
      <ClientInviteEmail
        name={params.name}
        portalUrl={portalUrl}
        projectCode={params.projectCode}
        projectName={params.projectName}
        supportEmail={env.resend.fromEmail}
      />
    ),
    forceSend: params.forceSend ?? false,
  })
}

/**
 * Correo para avisar a un cliente YA activado de que tiene un nuevo proyecto.
 * No es un welcome (no le pide activar cuenta), solo le notifica y le da el
 * enlace directo para abrirlo.
 */
export async function sendNewProjectAssignedEmail(params: {
  to: string
  name: string
  projectName: string
  projectCode?: string | null
  projectSlug?: string | null
  forceSend?: boolean
}) {
  const base = env.clientAppUrl.replace(/\/$/, "")
  const projectUrl = params.projectSlug
    ? `${base}/client/projects?project=${encodeURIComponent(params.projectSlug)}`
    : `${base}/client/projects`
  await sendEmail({
    to: params.to,
    subject: `Nuevo proyecto en Terrazea: ${params.projectName}`,
    react: (
      <NewProjectAssignedEmail
        name={params.name}
        projectName={params.projectName}
        projectCode={params.projectCode ?? null}
        projectUrl={projectUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
    forceSend: params.forceSend ?? false,
  })
}

export async function sendPaymentRequestEmail(params: {
  to: string
  name: string
  concept: string
  amountCents: number
  currency: string
  paymentLink: string
  dueDate?: string | null
  projectName?: string | null
}) {
  const amountLabel = formatCurrency(params.amountCents / 100, params.currency)
  const dueDateLabel = params.dueDate ? formatDate(params.dueDate) : null
  await sendEmail({
    to: params.to,
    subject: `Nuevo pago disponible: ${params.concept}`,
    react: (
      <PaymentRequestEmail
        name={params.name}
        concept={params.concept}
        amount={amountLabel}
        dueDateLabel={dueDateLabel}
        paymentLink={params.paymentLink}
        projectName={params.projectName}
      />
    ),
  })
}

export async function sendPaymentReceiptEmail(params: {
  to: string
  name: string
  concept: string
  amountCents: number
  currency: string
  paidAt?: string | null
  projectName?: string | null
  receiptUrl?: string | null
}) {
  const amountLabel = formatCurrency(params.amountCents / 100, params.currency)
  const paidAtLabel = params.paidAt ? formatDate(params.paidAt) : undefined
  await sendEmail({
    to: params.to,
    subject: `Pago registrado: ${params.concept}`,
    react: (
      <PaymentReceiptEmail
        name={params.name}
        concept={params.concept}
        amount={amountLabel}
        projectName={params.projectName}
        paidAtLabel={paidAtLabel}
        receiptUrl={params.receiptUrl ?? null}
      />
    ),
  })
}

export async function sendDocumentSharedEmail(params: {
  to: string
  name: string
  documentName: string
  documentCategory?: string | null
  projectName?: string | null
  documentUrl: string
}) {
  await sendEmail({
    to: params.to,
    subject: `Nuevo documento: ${params.documentName}`,
    react: (
      <DocumentSharedEmail
        name={params.name}
        documentName={params.documentName}
        documentCategory={params.documentCategory}
        projectName={params.projectName}
        documentUrl={params.documentUrl}
      />
    ),
  })
}

export async function sendConversationNotificationEmail(params: {
  to: string
  recipientName: string
  senderName: string
  projectName?: string | null
  messageSnippet: string
  ctaUrl: string
  audience: "client" | "team"
}) {
  await sendEmail({
    to: params.to,
    subject: `Nuevo mensaje de ${params.senderName}`,
    react: (
      <MessageNotificationEmail
        recipientName={params.recipientName}
        senderName={params.senderName}
        projectName={params.projectName}
        messageSnippet={params.messageSnippet}
        ctaUrl={params.ctaUrl}
        audience={params.audience}
      />
    ),
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  name: string
  resetUrl: string
  expiresAt: string
  forceSend?: boolean
}) {
  await sendEmail({
    to: params.to,
    subject: "Restablece tu contraseña Terrazea",
    react: (
      <PasswordResetEmail
        name={params.name}
        resetUrl={params.resetUrl}
        expiresAtLabel={formatDateTime(params.expiresAt)}
        supportEmail={env.resend.fromEmail}
      />
    ),
    forceSend: params.forceSend ?? true,
  })
}

export async function sendAccountActivatedEmail(params: {
  to: string
  name: string
  activatedAt?: string | null
}) {
  const loginUrl = `${env.clientAppUrl.replace(/\/$/, "")}/login`
  const activatedAtLabel = formatDateTime(params.activatedAt ?? new Date().toISOString())
  await sendEmail({
    to: params.to,
    subject: "Tu cuenta Terrazea ya está activa",
    react: (
      <AccountActivatedEmail
        name={params.name}
        loginUrl={loginUrl}
        activatedAtLabel={activatedAtLabel}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendActivationReminderEmail(params: {
  to: string
  name: string
  projectCode?: string | null
  projectName?: string | null
}) {
  const portalUrl = `${env.clientAppUrl.replace(/\/$/, "")}/login?mode=code`
  await sendEmail({
    to: params.to,
    subject: "Recordatorio: activa tu acceso a Terrazea",
    react: (
      <ActivationReminderEmail
        name={params.name}
        portalUrl={portalUrl}
        projectCode={params.projectCode ?? null}
        projectName={params.projectName ?? null}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendPaymentReminderEmail(params: {
  to: string
  name: string
  variant: PaymentReminderVariant
  concept: string
  amountCents: number
  currency: string
  dueDate: string | null
  paymentLink: string
  projectName?: string | null
  daysLabel: string
}) {
  const amountLabel = formatCurrency(params.amountCents / 100, params.currency)
  const dueDateLabel = params.dueDate ? formatDate(params.dueDate) : null
  const subject =
    params.variant === "overdue"
      ? `Pago pendiente · ${params.concept}`
      : `Recordatorio de pago: ${params.concept}`

  await sendEmail({
    to: params.to,
    subject,
    react: (
      <PaymentReminderEmail
        name={params.name}
        variant={params.variant}
        concept={params.concept}
        amountLabel={amountLabel}
        dueDateLabel={dueDateLabel}
        daysLabel={params.daysLabel}
        projectName={params.projectName ?? null}
        paymentLink={params.paymentLink}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendPaymentStatusEmail(params: {
  to: string
  name: string
  variant: PaymentStatusVariant
  concept: string
  amountCents: number
  currency: string
  projectName?: string | null
  reason?: string | null
}) {
  const amountLabel = formatCurrency(params.amountCents / 100, params.currency)
  const subject =
    params.variant === "failed"
      ? `No pudimos procesar tu pago: ${params.concept}`
      : params.variant === "refunded"
        ? `Reembolso procesado: ${params.concept}`
        : `Pago cancelado: ${params.concept}`

  await sendEmail({
    to: params.to,
    subject,
    react: (
      <PaymentStatusEmail
        name={params.name}
        variant={params.variant}
        concept={params.concept}
        amountLabel={amountLabel}
        projectName={params.projectName ?? null}
        reason={params.reason ?? null}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendProjectStatusChangeEmail(params: {
  to: string
  name: string
  projectName: string
  projectSlug: string
  status: ProjectStatusKey
  statusLabel: string
  description: string
  nextSteps: string[]
}) {
  const ctaUrl = `${env.clientAppUrl.replace(/\/$/, "")}/client/projects?project=${encodeURIComponent(params.projectSlug)}`
  await sendEmail({
    to: params.to,
    subject: `Tu proyecto entra en fase de ${params.statusLabel.toLowerCase()}`,
    react: (
      <ProjectStatusChangeEmail
        name={params.name}
        projectName={params.projectName}
        status={params.status}
        statusLabel={params.statusLabel}
        description={params.description}
        nextSteps={params.nextSteps}
        ctaUrl={ctaUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendMilestoneCompletedEmail(params: {
  to: string
  name: string
  projectName: string
  projectSlug: string
  milestoneTitle: string
  milestoneSummary?: string | null
  projectProgressPercent?: number | null
}) {
  const ctaUrl = `${env.clientAppUrl.replace(/\/$/, "")}/client/projects?project=${encodeURIComponent(params.projectSlug)}`
  await sendEmail({
    to: params.to,
    subject: `Hito completado: ${params.milestoneTitle}`,
    react: (
      <MilestoneCompletedEmail
        name={params.name}
        projectName={params.projectName}
        milestoneTitle={params.milestoneTitle}
        milestoneSummary={params.milestoneSummary ?? null}
        projectProgressPercent={params.projectProgressPercent ?? null}
        ctaUrl={ctaUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendTeamAssignmentEmail(params: {
  to: string
  recipientName: string
  projectName: string
  projectSlug: string
  clientName?: string | null
  roleLabel: string
  startDate?: string | null
  estimatedDelivery?: string | null
}) {
  const ctaUrl = `${env.clientAppUrl.replace(/\/$/, "")}/dashboard/projects/${encodeURIComponent(params.projectSlug)}`
  await sendEmail({
    to: params.to,
    subject: `Nuevo proyecto asignado: ${params.projectName}`,
    react: (
      <TeamAssignmentEmail
        recipientName={params.recipientName}
        projectName={params.projectName}
        clientName={params.clientName ?? null}
        roleLabel={params.roleLabel}
        startDate={params.startDate ? formatDate(params.startDate) : null}
        estimatedDelivery={params.estimatedDelivery ? formatDate(params.estimatedDelivery) : null}
        ctaUrl={ctaUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendWeeklyDigestEmail(params: {
  to: string
  name: string
  weekLabel: string
  projects: WeeklyDigestProjectSummary[]
}) {
  const ctaUrl = `${env.clientAppUrl.replace(/\/$/, "")}/client/dashboard`
  await sendEmail({
    to: params.to,
    subject: `Tu resumen semanal · ${params.weekLabel}`,
    react: (
      <WeeklyDigestEmail
        name={params.name}
        weekLabel={params.weekLabel}
        projects={params.projects}
        ctaUrl={ctaUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendProjectFeedbackEmail(params: {
  to: string
  name: string
  projectName: string
}) {
  await sendEmail({
    to: params.to,
    subject: `¿Qué te pareció ${params.projectName}?`,
    react: (
      <ProjectFeedbackEmail
        name={params.name}
        projectName={params.projectName}
        replyToEmail={env.resend.fromEmail}
        reviewUrl={env.feedbackReviewUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
    replyTo: env.resend.fromEmail,
  })
}

export async function sendUnreadMessagesDigestEmail(params: {
  to: string
  name: string
  totalUnread: number
  conversations: UnreadConversationSummary[]
}) {
  const ctaUrl = `${env.clientAppUrl.replace(/\/$/, "")}/client/messages`
  await sendEmail({
    to: params.to,
    subject: `Tienes ${params.totalUnread} mensaje${params.totalUnread === 1 ? "" : "s"} sin leer en Terrazea`,
    react: (
      <UnreadMessagesDigestEmail
        name={params.name}
        totalUnread={params.totalUnread}
        conversations={params.conversations}
        ctaUrl={ctaUrl}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendDocumentLifecycleEmail(params: {
  to: string
  name: string
  variant: DocumentLifecycleVariant
  documentName: string
  documentCategory?: string | null
  projectName?: string | null
  documentUrl?: string | null
}) {
  const subject =
    params.variant === "deleted"
      ? `Documento retirado: ${params.documentName}`
      : `Documento actualizado: ${params.documentName}`
  await sendEmail({
    to: params.to,
    subject,
    react: (
      <DocumentLifecycleEmail
        name={params.name}
        variant={params.variant}
        documentName={params.documentName}
        documentCategory={params.documentCategory ?? null}
        projectName={params.projectName ?? null}
        documentUrl={params.documentUrl ?? null}
        supportEmail={env.resend.fromEmail}
      />
    ),
  })
}

export async function sendEmailChangeNoticeEmail(params: {
  to: string
  name: string
  newEmail: string
  changedAt?: string | null
}) {
  const changedAtLabel = formatDateTime(params.changedAt ?? new Date().toISOString())
  await sendEmail({
    to: params.to,
    subject: "Hemos cambiado el correo de tu cuenta Terrazea",
    react: (
      <EmailChangeNoticeEmail
        name={params.name}
        newEmail={params.newEmail}
        changedAtLabel={changedAtLabel}
        supportEmail={env.resend.fromEmail}
      />
    ),
    // Seguridad: queremos que este correo salga siempre, aunque estemos en
    // modo dry-run (cambios de email son eventos de seguridad críticos).
    forceSend: true,
  })
}

export async function sendEventReminderEmail(params: {
  to: string
  name: string
  eventTitle: string
  startsAt: string
  projectName?: string | null
  location?: string | null
  ctaUrl: string
}) {
  await sendEmail({
    to: params.to,
    subject: `Recordatorio: ${params.eventTitle}`,
    react: (
      <EventReminderEmail
        name={params.name}
        eventTitle={params.eventTitle}
        startsAtLabel={formatDateTime(params.startsAt)}
        projectName={params.projectName}
        location={params.location ?? null}
        ctaUrl={params.ctaUrl}
      />
    ),
  })
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
