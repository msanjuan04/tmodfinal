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
import { consumePasswordResetToken, issuePasswordResetToken } from "../services/password-reset"
import {
  sendAccountActivatedEmail,
  sendPasswordResetEmail,
} from "../services/email"
import { env } from "../config/env"

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

    // Correo de confirmación de activación (no bloquea la respuesta).
    if (session.email) {
      void (async () => {
        try {
          await sendAccountActivatedEmail({
            to: session.email,
            name: session.name ?? session.email.split("@")[0],
            activatedAt: new Date().toISOString(),
          })
        } catch (emailError) {
          console.error("[email] No se pudo enviar la confirmación de activación", emailError)
        }
      })()
    }

    response.json({ success: true, message: "Contraseña creada correctamente." })
  }),
)

router.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const { email } = request.body as { email?: string }
    const normalizedEmail = email?.trim().toLowerCase() ?? ""

    // Siempre devolvemos el mismo mensaje para no filtrar qué correos están
    // registrados (email enumeration). El cliente final ve "te hemos enviado
    // un correo si existe una cuenta".
    const neutralMessage =
      "Si el correo corresponde a una cuenta Terrazea, te hemos enviado un enlace para restablecer la contraseña."

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      response.json({ success: true, message: neutralMessage })
      return
    }

    try {
      const issued = await issuePasswordResetToken(normalizedEmail)
      if (issued) {
        const resetUrl = `${env.clientAppUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(issued.rawToken)}`
        try {
          await sendPasswordResetEmail({
            to: issued.email,
            name: issued.fullName,
            resetUrl,
            expiresAt: issued.expiresAt,
            forceSend: true,
          })
        } catch (emailError) {
          console.error("[email] No se pudo enviar el correo de reset", emailError)
        }
      }
    } catch (error) {
      console.error("[auth] Error emitiendo token de reset", error)
    }

    response.json({ success: true, message: neutralMessage })
  }),
)

router.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const { token, password } = request.body as { token?: string; password?: string }
    const rawToken = token?.trim() ?? ""
    const sanitized = password?.trim() ?? ""

    if (!rawToken) {
      response.status(400).json({ success: false, message: "Falta el token de restablecimiento." })
      return
    }
    if (sanitized.length < 8) {
      response.status(400).json({ success: false, message: "La contraseña debe tener al menos 8 caracteres." })
      return
    }

    const result = await consumePasswordResetToken(rawToken, sanitized)
    if (!result.ok) {
      const reasonMessage: Record<typeof result.reason, string> = {
        invalid: "El enlace no es válido. Solicita uno nuevo.",
        expired: "El enlace ha caducado. Solicita uno nuevo desde la pantalla de acceso.",
        used: "Este enlace ya se utilizó. Solicita otro si necesitas cambiarla de nuevo.",
        weak: "La contraseña debe tener al menos 8 caracteres.",
        error: "No hemos podido actualizar la contraseña. Inténtalo más tarde.",
      }
      response.status(400).json({ success: false, message: reasonMessage[result.reason] })
      return
    }

    // Correo de confirmación (no bloquea la respuesta).
    void (async () => {
      try {
        await sendAccountActivatedEmail({
          to: result.consumed.email,
          name: result.consumed.fullName,
          activatedAt: new Date().toISOString(),
        })
      } catch (emailError) {
        console.error("[email] No se pudo enviar la confirmación tras reset", emailError)
      }
    })()

    response.json({ success: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." })
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
