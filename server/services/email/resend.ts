import type { ReactElement } from "react"

import { render } from "@react-email/render"
import type { CreateEmailOptions } from "resend"
import { Resend } from "resend"

import { env } from "../../config/env"

export const resend = new Resend(env.resend.apiKey)

type SendEmailOptions = {
  to: string | string[]
  subject: string
  react?: ReactElement
  html?: string
  text?: string
  from?: string
  bcc?: string | string[]
  replyTo?: string | string[]
  forceSend?: boolean
}

export async function sendEmail({ to, subject, react, html, text, from, bcc, replyTo, forceSend = false }: SendEmailOptions) {
  if (!react && !html && !text) {
    throw new Error("sendEmail requires at least one of react, html, or text content.")
  }

  const compiledHtml = react ? await render(react) : html

  const base = {
    from: from ?? env.resend.fromEmail,
    to,
    subject,
    bcc: bcc ?? env.resend.bccEmail ?? undefined,
    replyTo,
  }

  let payload: CreateEmailOptions
  if (compiledHtml) {
    payload = {
      ...base,
      html: compiledHtml,
      ...(text ? { text } : {}),
    }
  } else if (text) {
    payload = {
      ...base,
      text,
    }
  } else {
    throw new Error("sendEmail requires at least html or text content.")
  }

  if (env.resend.dryRun && !forceSend) {
    console.info("[email:dry-run]", { to, subject })
    return
  }

  return resend.emails.send(payload)
}

