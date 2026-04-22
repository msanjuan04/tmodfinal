/**
 * Smoke test manual de los correos y jobs de scheduler.
 *
 * Uso:
 *   npx tsx scripts/smoke-test-emails.ts <comando>
 *
 * Comandos:
 *   welcome        Correo de bienvenida (ClientInviteEmail)
 *   reset          Correo de reset de contraseña
 *   activated      Confirmación de activación
 *   activation     Recordatorio de activación pendiente
 *   payment-up     Recordatorio pago próximo
 *   payment-over   Aviso pago vencido
 *   payment-failed Aviso pago rechazado
 *   event          Recordatorio evento 24h
 *   status         Cambio de fase de proyecto
 *   milestone      Hito completado
 *   team           Asignación a equipo
 *   digest         Digest semanal
 *   unread         Digest de mensajes no leídos
 *   feedback       Petición de reseña post-cierre
 *   doc-replaced   Documento actualizado
 *   doc-deleted    Documento retirado
 *   email-change   Cambio de email de cuenta
 *
 *   jobs:activation  Ejecutar el job real de recordatorios de activación
 *   jobs:events      Job de recordatorios de eventos
 *   jobs:payments    Job de recordatorios de pago
 *   jobs:digest      Job de digest semanal
 *   jobs:feedback    Job de feedback post-cierre
 *   jobs:unread      Job de digest de no leídos
 *
 * Antes de arrancar exporta `SMOKE_TO="tu.correo@ejemplo.com"`. Si no,
 * usa el fallback del script.
 */

import {
  sendAccountActivatedEmail,
  sendActivationReminderEmail,
  sendClientWelcomeEmail,
  sendDocumentLifecycleEmail,
  sendEmailChangeNoticeEmail,
  sendEventReminderEmail,
  sendMilestoneCompletedEmail,
  sendPasswordResetEmail,
  sendPaymentReminderEmail,
  sendPaymentStatusEmail,
  sendProjectFeedbackEmail,
  sendProjectStatusChangeEmail,
  sendTeamAssignmentEmail,
  sendUnreadMessagesDigestEmail,
  sendWeeklyDigestEmail,
} from "../server/services/email"
import { schedulerJobs } from "../server/services/scheduler"

const to = process.env.SMOKE_TO || "hola@terrazea.com"
const name = "San Juan"
const projectName = "Terraza Mediterránea Barcelona"

async function run(cmd: string) {
  switch (cmd) {
    case "welcome":
      return sendClientWelcomeEmail({
        to,
        name,
        projectCode: "TRZ-2025-SMOK",
        projectName,
        forceSend: true,
      })

    case "reset":
      return sendPasswordResetEmail({
        to,
        name,
        resetUrl: "https://example.com/reset-password?token=FAKE_TOKEN_ABC",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        forceSend: true,
      })

    case "activated":
      return sendAccountActivatedEmail({
        to,
        name,
        activatedAt: new Date().toISOString(),
      })

    case "activation":
      return sendActivationReminderEmail({
        to,
        name,
        projectCode: "TRZ-2025-SMOK",
        projectName,
      })

    case "payment-up":
      return sendPaymentReminderEmail({
        to,
        name,
        variant: "upcoming",
        concept: "Hito 2 · Estructura",
        amountCents: 450000,
        currency: "EUR",
        dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        paymentLink: "https://example.com/pay/FAKE",
        projectName,
        daysLabel: "en 3 días",
      })

    case "payment-over":
      return sendPaymentReminderEmail({
        to,
        name,
        variant: "overdue",
        concept: "Hito 3 · Instalación",
        amountCents: 620000,
        currency: "EUR",
        dueDate: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        paymentLink: "https://example.com/pay/FAKE",
        projectName,
        daysLabel: "hace 4 días",
      })

    case "payment-failed":
      return sendPaymentStatusEmail({
        to,
        name,
        variant: "failed",
        concept: "Hito 3 · Instalación",
        amountCents: 620000,
        currency: "EUR",
        projectName,
        reason: "Tarjeta rechazada por el banco",
      })

    case "event":
      return sendEventReminderEmail({
        to,
        name,
        eventTitle: "Visita de obra",
        startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        projectName,
        location: "Calle Ejemplo 12, Barcelona",
        ctaUrl: "https://example.com/client/calendar",
      })

    case "status":
      return sendProjectStatusChangeEmail({
        to,
        name,
        projectName,
        projectSlug: "terraza-mediterranea",
        status: "obra_ejecucion",
        statusLabel: "Ejecución de obra",
        description:
          "Estamos ejecutando el proyecto. A partir de ahora verás avances visibles casi cada semana.",
        nextSteps: [
          "Se publicarán fotografías y avances.",
          "Te avisaremos de cada hito cerrado.",
          "Recibirás recordatorios antes de cada visita.",
        ],
      })

    case "milestone":
      return sendMilestoneCompletedEmail({
        to,
        name,
        projectName,
        projectSlug: "terraza-mediterranea",
        milestoneTitle: "Instalación de pérgola completada",
        milestoneSummary:
          "Estructura principal instalada y tratada. Procedemos con la iluminación y mobiliario.",
        projectProgressPercent: 62,
      })

    case "team":
      return sendTeamAssignmentEmail({
        to,
        recipientName: name,
        projectName,
        projectSlug: "terraza-mediterranea",
        clientName: "María García",
        roleLabel: "Arquitecto/a",
        startDate: "2025-05-12",
        estimatedDelivery: "2025-09-30",
      })

    case "digest":
      return sendWeeklyDigestEmail({
        to,
        name,
        weekLabel: "semana del 14 al 21 de abril",
        projects: [
          {
            projectName,
            statusLabel: "En progreso",
            documentsAdded: 2,
            tasksCompleted: 5,
            upcoming: [
              { title: "Visita de obra", whenLabel: "mié 23 abr 10:00" },
              { title: "Entrega iluminación", whenLabel: "vie 25 abr 09:00" },
            ],
          },
        ],
      })

    case "unread":
      return sendUnreadMessagesDigestEmail({
        to,
        name,
        totalUnread: 5,
        conversations: [
          {
            teamMemberName: "Laura — Arquitecta",
            projectName,
            unreadCount: 3,
            lastMessagePreview: "Te paso el render final actualizado con los cambios que pediste…",
            lastMessageLabel: "hace 3 h",
          },
          {
            teamMemberName: "Mario — Coordinador",
            projectName,
            unreadCount: 2,
            lastMessagePreview: "Confirmamos la visita del jueves a las 10. ¿Prefieres otra hora?",
            lastMessageLabel: "hace 6 h",
          },
        ],
      })

    case "feedback":
      return sendProjectFeedbackEmail({ to, name, projectName })

    case "doc-replaced":
      return sendDocumentLifecycleEmail({
        to,
        name,
        variant: "replaced",
        documentName: "Plano cotas v2",
        documentCategory: "Planos",
        projectName,
        documentUrl: "https://example.com/docs/plano-v2",
      })

    case "doc-deleted":
      return sendDocumentLifecycleEmail({
        to,
        name,
        variant: "deleted",
        documentName: "Plano cotas v1",
        documentCategory: "Planos",
        projectName,
      })

    case "email-change":
      return sendEmailChangeNoticeEmail({
        to,
        name,
        newEmail: "nuevo.correo@ejemplo.com",
        changedAt: new Date().toISOString(),
      })

    case "jobs:activation":
      return schedulerJobs.activationReminders()
    case "jobs:events":
      return schedulerJobs.eventReminders()
    case "jobs:payments":
      return schedulerJobs.paymentReminders()
    case "jobs:digest":
      return schedulerJobs.weeklyDigest()
    case "jobs:feedback":
      return schedulerJobs.projectFeedback()
    case "jobs:unread":
      return schedulerJobs.unreadMessagesDigest()

    default:
      console.error(`Comando desconocido: ${cmd}`)
      console.error("Revisa la lista al principio del archivo.")
      process.exit(1)
  }
}

async function main() {
  const cmd = process.argv[2]
  if (!cmd) {
    console.error("Uso: npx tsx scripts/smoke-test-emails.ts <comando>")
    process.exit(1)
  }
  console.log(`[smoke] ejecutando "${cmd}" (destino: ${to})`)
  try {
    await run(cmd)
    console.log(`[smoke] ok: ${cmd}`)
  } catch (error) {
    console.error(`[smoke] fallo en ${cmd}:`, error)
    process.exitCode = 1
  }
}

main()
