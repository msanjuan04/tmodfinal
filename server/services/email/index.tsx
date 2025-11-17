import type { ReactElement } from "react"
import { render } from "@react-email/render"
import type { CreateEmailOptions } from "resend"
import { Resend } from "resend"

import { env } from "../../config/env"
import {
  ClientInviteEmail,
  DocumentSharedEmail,
  EventReminderEmail,
  MessageNotificationEmail,
  PaymentReceiptEmail,
  PaymentRequestEmail,
} from "../../emails"

const resend = new Resend(env.resend.apiKey)
const isDryRun = env.resend.dryRun

interface SendEmailInput {
  to: string | string[]
  subject: string
  react?: ReactElement
  text?: string
  bcc?: string | string[] | null
  replyTo?: string
  retries?: number
}

export async function sendEmail({ to, subject, react, text, bcc, replyTo, retries = 2 }: SendEmailInput) {
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

  if (isDryRun) {
    console.info("[email:dry-run]", { to, subject })
    return
  }

  for (let attempt = 1; attempt <= Math.max(retries, 1); attempt += 1) {
    try {
      await resend.emails.send(payload)
      return
    } catch (error) {
      console.error(`[email] Falló intento ${attempt} (${subject})`, error)
      if (attempt === retries) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
}

export async function sendClientWelcomeEmail(params: { to: string; name: string; temporaryPassword?: string; projectCode?: string | null }) {
  const portalUrl = `${env.clientAppUrl.replace(/\/$/, "")}/client/setup-password`
  await sendEmail({
    to: params.to,
    subject: "Bienvenido al Portal Terrazea",
    react: (
      <ClientInviteEmail
        name={params.name}
        portalUrl={portalUrl}
        temporaryPassword={params.temporaryPassword}
        projectCode={params.projectCode}
        supportEmail={env.resend.fromEmail}
      />
    ),
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
