import { Router } from "express"
import Stripe from "stripe"
import { createServerSupabaseClient } from "../../lib/supabase/server"
import { env } from "../config/env"
import { sendPaymentReceiptEmail, sendPaymentStatusEmail } from "../services/email"
import { getAdminPaymentById, syncPaymentCalendarEvents } from "../../lib/supabase/admin-payments"
import { recordNotification } from "../services/scheduler/dedupe"
import { asyncHandler } from "../utils/async-handler"

const router = Router()

const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
})

// Stripe webhook endpoint - debe recibir el body raw sin parsear
router.post(
  "/stripe",
  asyncHandler(async (request, response) => {
    const sig = request.headers["stripe-signature"]

    if (!sig) {
      response.status(400).json({ message: "Missing stripe-signature header" })
      return
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, env.stripeWebhookSecret)
    } catch (err) {
      const error = err as Error
      console.error("Webhook signature verification failed:", error.message)
      response.status(400).json({ message: `Webhook Error: ${error.message}` })
      return
    }

    const supabase = createServerSupabaseClient()

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Buscar el pago por checkout_session_id
        const { data: payment, error: findError } = await supabase
          .from("project_payments")
          .select("id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle()

        if (findError) {
          console.error("Error finding payment for checkout session:", findError)
          break
        }

        if (!payment) {
          console.warn(`Payment not found for checkout session: ${session.id}`)
          break
        }

        // Si el pago ya está marcado como pagado, no hacer nada
        if (payment.status === "paid") {
          console.log(`Payment ${payment.id} already marked as paid`)
          break
        }

        // Actualizar el estado del pago a "paid"
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
        const invoiceId = typeof session.invoice === "string" ? session.invoice : null

        const { error: updateError } = await supabase
          .from("project_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId,
            stripe_invoice_id: invoiceId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        if (updateError) {
          console.error("Error updating payment status:", updateError)
        } else {
          console.log(`Payment ${payment.id} marked as paid via webhook`)
          await notifyPaymentReceipt(payment.id)
          await syncPaymentCalendarEvents(payment.id)
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Buscar el pago por payment_intent_id
        const { data: payment, error: findError } = await supabase
          .from("project_payments")
          .select("id, status")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle()

        if (findError) {
          console.error("Error finding payment for payment intent:", findError)
          break
        }

        if (!payment) {
          console.warn(`Payment not found for payment intent: ${paymentIntent.id}`)
          break
        }

        // Si el pago ya está marcado como pagado, no hacer nada
        if (payment.status === "paid") {
          console.log(`Payment ${payment.id} already marked as paid`)
          break
        }

        // Actualizar el estado del pago a "paid"
        const { error: updateError } = await supabase
          .from("project_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        if (updateError) {
          console.error("Error updating payment status:", updateError)
        } else {
          console.log(`Payment ${payment.id} marked as paid via payment_intent webhook`)
          await notifyPaymentReceipt(payment.id)
          await syncPaymentCalendarEvents(payment.id)
        }
        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session

        // Similar a checkout.session.completed pero para pagos asíncronos
        const { data: payment, error: findError } = await supabase
          .from("project_payments")
          .select("id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle()

        if (findError || !payment) {
          console.error("Error finding payment for async checkout session:", findError)
          break
        }

        if (payment.status === "paid") {
          break
        }

        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null

        const { error: updateError } = await supabase
          .from("project_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        if (updateError) {
          console.error("Error updating payment status:", updateError)
        } else {
          console.log(`Payment ${payment.id} marked as paid via async webhook`)
          await notifyPaymentReceipt(payment.id)
          await syncPaymentCalendarEvents(payment.id)
        }
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const reason =
          paymentIntent.last_payment_error?.message ??
          paymentIntent.last_payment_error?.decline_code ??
          null

        const { data: payment, error: findError } = await supabase
          .from("project_payments")
          .select("id, status")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle()

        if (findError) {
          console.error("Error finding payment for failed intent:", findError)
          break
        }
        if (!payment) {
          console.warn(`Payment not found for failed payment intent: ${paymentIntent.id}`)
          break
        }

        // Marcamos como failed y notificamos.
        const { error: updateError } = await supabase
          .from("project_payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", payment.id)

        if (updateError) {
          console.error("Error marcando pago como failed:", updateError)
        } else {
          console.log(`Payment ${payment.id} marcado como failed`)
          await notifyPaymentStatus(payment.id, "failed", reason)
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null

        if (!paymentIntentId) {
          console.warn("charge.refunded sin payment_intent asociado")
          break
        }

        const { data: payment, error: findError } = await supabase
          .from("project_payments")
          .select("id, status")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle()

        if (findError) {
          console.error("Error finding payment for refund:", findError)
          break
        }
        if (!payment) {
          console.warn(`Payment not found for refund of PI: ${paymentIntentId}`)
          break
        }

        // No tocamos el status en DB (el enum no tiene "refunded"). Solo
        // notificamos y dejamos constancia en project_notifications.
        await notifyPaymentStatus(payment.id, "refunded", null)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true })
  }),
)

export const webhooksRouter = router

async function notifyPaymentReceipt(paymentId: string) {
  try {
    const payment = await getAdminPaymentById(paymentId)
    if (!payment || !payment.clientEmail) {
      return
    }

    await sendPaymentReceiptEmail({
      to: payment.clientEmail,
      name: payment.clientName ?? "Cliente Terrazea",
      concept: payment.concept,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paidAt: payment.paidAt ?? new Date().toISOString(),
      projectName: payment.projectName ?? null,
      receiptUrl: payment.paymentLink,
    })
  } catch (error) {
    console.error("[email] No se pudo enviar el recibo del pago", error)
  }
}

async function notifyPaymentStatus(
  paymentId: string,
  variant: "failed" | "refunded" | "canceled",
  reason: string | null,
) {
  try {
    const payment = await getAdminPaymentById(paymentId)
    if (!payment || !payment.clientEmail) return

    await sendPaymentStatusEmail({
      to: payment.clientEmail,
      name: payment.clientName ?? "Cliente Terrazea",
      variant,
      concept: payment.concept,
      amountCents: payment.amountCents,
      currency: payment.currency,
      projectName: payment.projectName ?? null,
      reason,
    })

    await recordNotification({
      type: `payment_${variant}`,
      relatedId: payment.id,
      audience: "client",
      clientId: payment.clientId ?? null,
      projectId: payment.projectId ?? null,
      title:
        variant === "failed"
          ? `Pago no completado: ${payment.concept}`
          : variant === "refunded"
            ? `Reembolso emitido: ${payment.concept}`
            : `Pago cancelado: ${payment.concept}`,
      description: reason ?? null,
      linkUrl: payment.paymentLink ?? null,
    })
  } catch (error) {
    console.error(`[email] No se pudo notificar status ${variant}`, error)
  }
}
