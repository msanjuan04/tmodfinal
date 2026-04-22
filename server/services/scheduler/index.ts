import cron from "node-cron"

import { env } from "../../config/env"
import { purgeExpiredResetTokens } from "../password-reset"
import { runActivationRemindersJob } from "./jobs/activation-reminders"
import { runEventRemindersJob } from "./jobs/event-reminders"
import { runPaymentRemindersJob } from "./jobs/payment-reminders"
import { runProjectFeedbackJob } from "./jobs/project-feedback"
import { runUnreadMessagesDigestJob } from "./jobs/unread-messages-digest"
import { runWeeklyDigestJob } from "./jobs/weekly-digest"

type JobFn = () => Promise<void>

function safeJob(name: string, fn: JobFn): () => void {
  return () => {
    const startedAt = Date.now()
    fn()
      .then(() => {
        const ms = Date.now() - startedAt
        console.log(`[scheduler:${name}] ok (${ms} ms)`)
      })
      .catch((error) => {
        console.error(`[scheduler:${name}] error`, error)
      })
  }
}

let started = false

export function startScheduler() {
  if (started) return
  if (env.nodeEnv === "test") {
    console.log("[scheduler] desactivado en modo test")
    return
  }

  // Activación pendiente: cada 6 h a los 15 min (02:15, 08:15, 14:15, 20:15).
  cron.schedule("15 */6 * * *", safeJob("activation", runActivationRemindersJob), { timezone: "Europe/Madrid" })

  // Recordatorio evento 24 h antes: cada hora a los 10 min.
  cron.schedule("10 * * * *", safeJob("events", runEventRemindersJob), { timezone: "Europe/Madrid" })

  // Recordatorio de pagos (próximos y vencidos): cada día a las 09:00.
  cron.schedule("0 9 * * *", safeJob("payments", runPaymentRemindersJob), { timezone: "Europe/Madrid" })

  // Digest semanal: lunes 08:00.
  cron.schedule("0 8 * * 1", safeJob("weekly-digest", runWeeklyDigestJob), { timezone: "Europe/Madrid" })

  // Petición de feedback post-cierre: cada día a las 10:00.
  cron.schedule("0 10 * * *", safeJob("project-feedback", runProjectFeedbackJob), { timezone: "Europe/Madrid" })

  // Digest de mensajes no leídos: cada día a las 19:00.
  cron.schedule("0 19 * * *", safeJob("unread-digest", runUnreadMessagesDigestJob), { timezone: "Europe/Madrid" })

  // Limpieza semanal: tokens de reset caducados > 24 h.
  cron.schedule("30 3 * * 0", safeJob("cleanup-tokens", async () => purgeExpiredResetTokens()), {
    timezone: "Europe/Madrid",
  })

  started = true
  console.log(
    "[scheduler] jobs programados (activation, events, payments, weekly-digest, project-feedback, unread-digest, cleanup-tokens)",
  )
}

// Para disparar manualmente desde scripts de prueba.
export const schedulerJobs = {
  activationReminders: runActivationRemindersJob,
  eventReminders: runEventRemindersJob,
  paymentReminders: runPaymentRemindersJob,
  weeklyDigest: runWeeklyDigestJob,
  projectFeedback: runProjectFeedbackJob,
  unreadMessagesDigest: runUnreadMessagesDigestJob,
}
