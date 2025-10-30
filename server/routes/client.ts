import { Router } from "express"

import { getClientProjectBySlug, getClientProjects } from "../../lib/supabase/client-data"
import { getClientProjectEvents } from "../../lib/supabase/project-events"
import { getDashboardData } from "../../lib/supabase/queries"
import { requireSession } from "../services/session"
import { asyncHandler } from "../utils/async-handler"

const router = Router()

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

export const clientRouter = router
