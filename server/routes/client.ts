import { Router } from "express"
import { z } from "zod"

import { env } from "../config/env"
import { getClientProjectBySlug, getClientProjects } from "../../lib/supabase/client-data"
import { getClientProjectEvents } from "../../lib/supabase/project-events"
import { listClientPayments } from "../../lib/supabase/client-payments"
import {
  getDashboardData,
  getDocuments,
  getMessages,
  getProjectDetails,
  getProjectGallery,
  sendClientConversationMessage,
} from "../../lib/supabase/queries"
import { getAdminPaymentById } from "../../lib/supabase/admin-payments"
import { createServerSupabaseClient } from "../../lib/supabase/server"
import { ensureStripeCustomer, createCheckoutSessionForPayment } from "../../lib/payments/stripe"
import { requireSession } from "../services/session"
import { asyncHandler } from "../utils/async-handler"
import { listClientNotifications, markClientNotificationRead } from "../../lib/supabase/notifications"

const router = Router()

const sendClientMessageSchema = z.object({
  content: z
    .string()
    .max(4000)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: "El mensaje no puede estar vacío" }),
})

router.get(
  "/projects",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)
    response.json({ projects })
  }),
)

router.get(
  "/dashboard",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)

    if (projects.length === 0) {
      response.json({ projects, dashboard: null, activeProjectSlug: null })
      return
    }

    const requested = typeof request.query.project === "string" ? request.query.project : undefined
    const activeProjectSlug =
      requested && projects.some((project) => project.slug === requested) ? requested : projects[0].slug

    const projectRecord = await getClientProjectBySlug(session.clientId, activeProjectSlug)
    if (!projectRecord) {
      response.json({ projects, dashboard: null, activeProjectSlug: projects[0]?.slug ?? null })
      return
    }

    const dashboard = await getDashboardData(activeProjectSlug)

    response.json({
      projects,
      dashboard,
      activeProjectSlug,
    })
  }),
)

router.get(
  "/calendar",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projectSlug = typeof request.query.project === "string" ? request.query.project : undefined
    const result = await getClientProjectEvents(session.clientId, projectSlug)

    response.json(result)
  }),
)

router.get(
  "/messages",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)

    if (projects.length === 0) {
      response.json({ messages: null, activeProjectSlug: null })
      return
    }

    const requested = typeof request.query.project === "string" ? request.query.project : undefined
    const activeProjectSlug =
      requested && projects.some((project) => project.slug === requested) ? requested : projects[0].slug

    const data = await getMessages(activeProjectSlug)
    response.json({ messages: data, activeProjectSlug })
  }),
)

router.get(
  "/documents",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)

    if (projects.length === 0) {
      response.json({ documents: null, activeProjectSlug: null })
      return
    }

    const requested = typeof request.query.project === "string" ? request.query.project : undefined
    const activeProjectSlug =
      requested && projects.some((project) => project.slug === requested) ? requested : projects[0].slug

    const data = await getDocuments(activeProjectSlug)
    response.json({ documents: data, activeProjectSlug })
  }),
)

router.get(
  "/gallery",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)

    if (projects.length === 0) {
      response.json({ gallery: null, activeProjectSlug: null })
      return
    }

    const requested = typeof request.query.project === "string" ? request.query.project : undefined
    const activeProjectSlug =
      requested && projects.some((project) => project.slug === requested) ? requested : projects[0].slug

    const data = await getProjectGallery(activeProjectSlug)
    response.json({ gallery: data, activeProjectSlug })
  }),
)

router.get(
  "/project-details",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projects = await getClientProjects(session.clientId)

    if (projects.length === 0) {
      response.json({ project: null, activeProjectSlug: null })
      return
    }

    const requested = typeof request.query.project === "string" ? request.query.project : undefined
    const activeProjectSlug =
      requested && projects.some((project) => project.slug === requested) ? requested : projects[0].slug

    const data = await getProjectDetails(activeProjectSlug)
    response.json({ project: data, activeProjectSlug })
  }),
)

router.get(
  "/payments",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const projectSlug = typeof request.query.project === "string" ? request.query.project : undefined
    const result = await listClientPayments(session.clientId, projectSlug)

    response.json(result)
  }),
)

router.post(
  "/payments/:paymentId/checkout",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const paymentId = request.params.paymentId
    if (!paymentId) {
      response.status(400).json({ message: "Pago no especificado" })
      return
    }

    const payment = await getAdminPaymentById(paymentId)
    if (!payment || payment.clientId !== session.clientId) {
      response.status(404).json({ message: "Pago no encontrado" })
      return
    }

    if (payment.status !== "pending") {
      response.status(400).json({ message: "Este pago no está disponible para realizar el cobro." })
      return
    }

    if (!payment.clientEmail) {
      response.status(400).json({ message: "No hay un correo asociado para este pago." })
      return
    }

    const stripeEnabled = Boolean(env.stripeSecretKey && env.stripeSecretKey.startsWith("sk_"))
    if (!stripeEnabled) {
      response.status(503).json({ message: "El pago no está disponible en este momento." })
      return
    }

    const supabase = createServerSupabaseClient()

    const stripeCustomerId = await ensureStripeCustomer({
      id: payment.clientId,
      fullName: payment.clientName ?? "Cliente Terrazea",
      email: payment.clientEmail,
      stripeCustomerId: payment.clientStripeCustomerId ?? payment.stripeCustomerId ?? null,
    })

    const clientAppBase = (env.clientAppUrl ?? "http://localhost:5173").replace(/\/$/, "")

    const checkoutSession = await createCheckoutSessionForPayment({
      payment,
      customerId: stripeCustomerId,
      successUrl: `${clientAppBase}/client/payments?status=success`,
      cancelUrl: `${clientAppBase}/client/payments?status=cancel`,
    })

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id ?? null

    const invoiceId = typeof checkoutSession.invoice === "string" ? checkoutSession.invoice : null

    const { error: updateError } = await supabase
      .from("project_payments")
      .update({
        payment_link: checkoutSession.url,
        stripe_payment_intent_id: paymentIntentId,
        stripe_invoice_id: invoiceId,
        stripe_customer_id: stripeCustomerId,
        stripe_checkout_session_id: checkoutSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    if (updateError) {
      throw updateError
    }

    response.json({ url: checkoutSession.url })
  }),
)

router.post(
  "/messages/:conversationId/messages",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)

    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }

    const parsed = sendClientMessageSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({
        message: "Mensaje inválido",
        errors: parsed.error.flatten().fieldErrors,
      })
      return
    }

    try {
      const conversationId = request.params.conversationId
      if (!conversationId) {
        response.status(400).json({ message: "Conversación no especificada." })
        return
      }

      await sendClientConversationMessage(conversationId, session.clientId, parsed.data.content)
      response.status(201).json({ success: true })
    } catch (error) {
      const status = (error as Error & { status?: number }).status ?? 500
      if (status >= 400 && status < 500) {
        response.status(status).json({ message: (error as Error).message })
        return
      }
      throw error
    }
  }),
)

router.get(
  "/notifications",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)
    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }
    const limitParam = typeof request.query.limit === "string" ? Number.parseInt(request.query.limit, 10) : undefined
    const limit = Number.isFinite(limitParam) ? limitParam : undefined
    const feed = await listClientNotifications(session.clientId, { limit })
    response.json(feed)
  }),
)

router.post(
  "/notifications/:notificationId/read",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)
    if (!session.clientId) {
      response.status(403).json({ message: "No tienes proyectos asociados" })
      return
    }
    const { notificationId } = request.params
    if (!notificationId) {
      response.status(400).json({ message: "Notificación no especificada" })
      return
    }
    await markClientNotificationRead(notificationId, session.clientId)
    response.status(204).end()
  }),
)

export const clientRouter = router
