import type { CookieOptions, Request, Response } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "../config/env"

/**
 * Secciones del admin protegidas por contraseña.
 * Cada sección se desbloquea de forma independiente.
 */
export const PROTECTED_SECTIONS = ["budgets", "payments"] as const
export type ProtectedSection = (typeof PROTECTED_SECTIONS)[number]

export function isProtectedSection(value: unknown): value is ProtectedSection {
  return typeof value === "string" && (PROTECTED_SECTIONS as readonly string[]).includes(value)
}

const COOKIE_PREFIX = "terrazea_section_"
/** Duración del desbloqueo: 8 horas. */
const TTL_SECONDS = 60 * 60 * 8

function cookieName(section: ProtectedSection) {
  return `${COOKIE_PREFIX}${section}`
}

function sign(payload: string) {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url")
}

function verify(payload: string, signature: string) {
  try {
    const expected = sign(payload)
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
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
  if (env.sessionCookie.domain) options.domain = env.sessionCookie.domain
  return options
}

export function grantSectionAccess(response: Response, section: ProtectedSection) {
  const issuedAt = Date.now()
  const payload = `${section}.${issuedAt}`
  const signature = sign(payload)
  const value = `${payload}.${signature}`
  response.cookie(cookieName(section), value, {
    ...baseCookieOptions(),
    maxAge: TTL_SECONDS * 1000,
  })
}

export function revokeSectionAccess(response: Response, section: ProtectedSection) {
  response.clearCookie(cookieName(section), baseCookieOptions())
}

export function hasSectionAccess(request: Request, section: ProtectedSection): boolean {
  const raw = request.cookies?.[cookieName(section)]
  if (!raw || typeof raw !== "string") return false

  const parts = raw.split(".")
  if (parts.length !== 3) return false

  const [cookieSection, issuedAtRaw, signature] = parts
  if (cookieSection !== section) return false

  const payload = `${cookieSection}.${issuedAtRaw}`
  if (!verify(payload, signature)) return false

  const issuedAt = Number(issuedAtRaw)
  if (!Number.isFinite(issuedAt)) return false

  const ageSeconds = (Date.now() - issuedAt) / 1000
  if (ageSeconds < 0 || ageSeconds > TTL_SECONDS) return false

  return true
}

/**
 * Middleware que bloquea la request si no hay desbloqueo válido de la sección.
 * Devuelve 403 con un mensaje estructurado para que el frontend lo detecte.
 */
export function requireSectionAccess(section: ProtectedSection) {
  return (request: Request, response: Response, next: (err?: unknown) => void) => {
    if (hasSectionAccess(request, section)) {
      return next()
    }
    response.status(403).json({
      message: "Sección bloqueada. Introduce la contraseña para continuar.",
      code: "SECTION_LOCKED",
      section,
    })
  }
}
