import { Router } from "express"
import Stripe from "stripe"
import { createServerSupabaseClient } from "../../lib/supabase/server"
import { env } from "../config/env"
import { asyncHandler } from "../utils/async-handler"

const router = Router()

const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2024-06-20",
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
        }
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

