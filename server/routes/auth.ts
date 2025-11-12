import { Router } from "express"
import bcrypt from "bcryptjs"

import {
  loginWithEmail,
  loginWithEmailAndPassword,
  loginWithProjectCode,
} from "../services/auth"
import {
  clearSessionCookie,
  getSessionFromRequest,
  requireSession,
  setSessionCookie,
} from "../services/session"
import { asyncHandler } from "../utils/async-handler"
import { createServerSupabaseClient } from "../../lib/supabase/server"

const router = Router()

router.get(
  "/session",
  asyncHandler(async (request, response) => {
    const session = getSessionFromRequest(request)
    if (!session) {
      response.status(204).end()
      return
    }

    response.json({ session })
  }),
)

router.post(
  "/login/email-password",
  asyncHandler(async (request, response) => {
    const { email, password } = request.body as { email?: string; password?: string }

    const auth = await loginWithEmailAndPassword(email ?? "", password ?? "")

    if (auth.session) {
      setSessionCookie(response, auth.session)
    }

    response.json(auth.result)
  }),
)

router.post(
  "/login/project-code",
  asyncHandler(async (request, response) => {
    const { projectCode } = request.body as { projectCode?: string }

    const auth = await loginWithProjectCode(projectCode ?? "")

    if (auth.session) {
      setSessionCookie(response, auth.session)
    }

    response.json(auth.result)
  }),
)

router.post(
  "/login/email",
  asyncHandler(async (request, response) => {
    const { email, projectCode } = request.body as { email?: string; projectCode?: string }

    const auth = await loginWithEmail(email ?? "", projectCode)

    if (auth.session) {
      setSessionCookie(response, auth.session)
    }

    response.json(auth.result)
  }),
)

router.post(
  "/setup-password",
  asyncHandler(async (request, response) => {
    const session = requireSession(request)
    if (session.role !== "client") {
      response.status(403).json({ message: "Solo los clientes pueden completar este paso." })
      return
    }

    const { password } = request.body as { password?: string }
    const sanitized = password?.trim() ?? ""

    if (sanitized.length < 8) {
      response.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." })
      return
    }

    const supabase = createServerSupabaseClient()
    const passwordHash = await bcrypt.hash(sanitized, 10)

    const { error } = await supabase
      .from("app_users")
      .update({ password_hash: passwordHash, must_update_password: false })
      .eq("id", session.userId)

    if (error) {
      console.error("Error actualizando contraseña inicial", error)
      response.status(500).json({ message: "No pudimos guardar tu contraseña. Inténtalo más tarde." })
      return
    }

    if (session.clientId) {
      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({ password_initialized: true })
        .eq("id", session.clientId)
      if (clientUpdateError) {
        console.error("Error marcando cliente como inicializado", clientUpdateError)
      }
    }

    const updatedSession = { ...session, mustUpdatePassword: false }
    setSessionCookie(response, updatedSession)

    response.json({ success: true, message: "Contraseña creada correctamente." })
  }),
)

router.post(
  "/logout",
  asyncHandler(async (_request, response) => {
    clearSessionCookie(response)
    response.status(204).end()
  }),
)

export const authRouter = router
