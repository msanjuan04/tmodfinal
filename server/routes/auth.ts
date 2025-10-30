import { Router } from "express"

import {
  loginWithEmail,
  loginWithEmailAndPassword,
  loginWithProjectCode,
} from "../services/auth"
import {
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie,
} from "../services/session"
import { asyncHandler } from "../utils/async-handler"

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
  "/logout",
  asyncHandler(async (_request, response) => {
    clearSessionCookie(response)
    response.status(204).end()
  }),
)

export const authRouter = router
