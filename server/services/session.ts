import type { CookieOptions, Request, Response } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"

import { resolveAdminSessionEmail, isSuperAdminEmail } from "../../lib/constants/admin"
import { env } from "../config/env"

export type SessionRole = "admin" | "client"

export interface SessionData {
  userId: string
  email: string
  name: string
  clientId: string | null
  role: SessionRole
  mustUpdatePassword?: boolean
}

const SESSION_COOKIE_NAME = "terrazea_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function signPayload(payload: string) {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url")
}

function verifySignature(payload: string, signature: string) {
  try {
    const expected = signPayload(payload)
    const expectedBuffer = Buffer.from(expected)
    const providedBuffer = Buffer.from(signature)
    if (expectedBuffer.length !== providedBuffer.length) {
      return false
    }
    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

function encodeSession(session: SessionData) {
  return Buffer.from(JSON.stringify(session)).toString("base64url")
}

function decodeSession(encoded: string): SessionData | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8")
    const parsed = JSON.parse(json) as Partial<SessionData>

    if (typeof parsed.userId !== "string") return null
    if (typeof parsed.email !== "string") return null
    if (typeof parsed.name !== "string") return null
    const role: SessionRole = parsed.role === "admin" ? "admin" : "client"

    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name,
      clientId: typeof parsed.clientId === "string" ? parsed.clientId : null,
      role,
      mustUpdatePassword: parsed.mustUpdatePassword === true,
    }
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: Request) {
  const rawCookie = request.cookies?.[SESSION_COOKIE_NAME]
  if (!rawCookie) return null

  const [payload, signature] = rawCookie.split(".")
  if (!payload || !signature) return null

  if (!verifySignature(payload, signature)) return null

  return decodeSession(payload)
}

export function requireSession(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) {
    const error = new Error("Unauthenticated")
    ;(error as Error & { status?: number }).status = 401
    throw error
  }
  return session
}

export function requireAdminSession(request: Request) {
  const session = requireSession(request)
  if (session.role !== "admin" && !isSuperAdminEmail(session.email)) {
    const error = new Error("Forbidden")
    ;(error as Error & { status?: number }).status = 403
    throw error
  }
  return session
}

function baseCookieOptions(): CookieOptions {
  const sameSite = env.sessionCookie.sameSite
  const secure = sameSite === "none" ? true : env.sessionCookie.secure

  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  }

  if (env.sessionCookie.domain) {
    options.domain = env.sessionCookie.domain
  }

  return options
}

export function setSessionCookie(response: Response, session: SessionData) {
  if (isSuperAdminEmail(session.email)) {
    session = { ...session, email: resolveAdminSessionEmail(session.email) }
  }
  const payload = encodeSession(session)
  const signature = signPayload(payload)
  const value = `${payload}.${signature}`

  const options: CookieOptions = {
    ...baseCookieOptions(),
    maxAge: SESSION_TTL_SECONDS * 1000,
  }

  response.cookie(SESSION_COOKIE_NAME, value, options)
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions())
}

export function sessionCookieName() {
  return SESSION_COOKIE_NAME
}

export { isSuperAdminEmail, resolveAdminSessionEmail } from "../../lib/constants/admin"
