import { Router } from "express"
import { z } from "zod"

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
import { requireSession } from "../services/session"
import { asyncHandler } from "../utils/async-handler"

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

export const clientRouter = router
