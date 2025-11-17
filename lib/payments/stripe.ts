"use server"

import Stripe from "stripe"

import { env } from "../../server/config/env"
import { createServerSupabaseClient } from "../supabase/server"
import type { AdminPaymentRecord } from "@app/types/admin"

const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
  appInfo: {
    name: "Terrazea ClientZone",
  },
})

type EnsureClientInput = {
  id: string
  fullName: string
  email: string
  stripeCustomerId?: string | null
}

export async function ensureStripeCustomer(client: EnsureClientInput): Promise<string> {
  if (client.stripeCustomerId) {
    return client.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    name: client.fullName,
    email: client.email,
    metadata: {
      terrazea_client_id: client.id,
    },
  })

  const supabase = createServerSupabaseClient()
  await supabase
    .from("clients")
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", client.id)

  return customer.id
}

interface CheckoutSessionOptions {
  payment: AdminPaymentRecord
  customerId: string
  successUrl: string
  cancelUrl: string
}

export async function createCheckoutSessionForPayment(options: CheckoutSessionOptions) {
  const { payment, customerId, successUrl, cancelUrl } = options

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    currency: payment.currency.toLowerCase(),
    metadata: {
      project_payment_id: payment.id,
      project_id: payment.projectId,
    },
    line_items: [
      {
        price_data: {
          currency: payment.currency.toLowerCase(),
          product_data: {
            name: payment.concept,
            description: payment.description ?? undefined,
          },
          unit_amount: payment.amountCents,
        },
        quantity: 1,
      },
    ],
    invoice_creation: {
      enabled: true,
    },
  })
}

export function getStripeClient() {
  return stripe
}
