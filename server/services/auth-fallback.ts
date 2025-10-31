import { normalizeEmail, resolveAdminSessionEmail, isSuperAdminEmail } from "../../lib/constants/admin"
import type { SessionRole, SessionData } from "./session"
import { env } from "../config/env"

interface FallbackUser {
  id: string
  email: string
  aliases?: string[]
  password: string
  name: string
  role: SessionRole
  clientId?: string | null
  projectCode?: string | null
  projectSlug?: string | null
}

interface FallbackMatch {
  session: SessionData
  projectCode?: string | null
  projectSlug?: string | null
}

const FALLBACK_USERS: FallbackUser[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    email: "aterrazea@gmail.com",
    aliases: ["terrazea@gmail.com"],
    password: "admin123",
    name: "Administrador Terrazea",
    role: "admin",
    clientId: null,
  },
  {
    id: "fallback-user-juan",
    email: "juan@example.com",
    password: "password123",
    name: "Juan Pérez",
    role: "client",
    clientId: "4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c",
    projectCode: "TRZ-2024-089",
    projectSlug: "terraza-mediterranea-premium",
  },
  {
    id: "fallback-user-maria",
    email: "maria.garcia@example.com",
    password: "password123",
    name: "María García",
    role: "client",
    clientId: "fallback-client-maria",
    projectCode: null,
  },
]

function canUseFallback() {
  if (process.env.ENABLE_FALLBACK_AUTH?.toLowerCase() === "false") {
    return false
  }
  if (process.env.ENABLE_FALLBACK_AUTH?.toLowerCase() === "true") {
    return true
  }
  return env.nodeEnv !== "production" || process.env.NODE_ENV !== "production"
}

function resolveFallbackEmail(email: string) {
  if (isSuperAdminEmail(email)) {
    return resolveAdminSessionEmail(email)
  }
  return normalizeEmail(email)
}

function buildMatch(user: FallbackUser): FallbackMatch {
  return {
    session: {
      userId: user.id,
      email: resolveFallbackEmail(user.email),
      name: user.name,
      clientId: user.clientId ?? null,
      role: user.role,
    },
    projectCode: user.projectCode ?? null,
    projectSlug: user.projectSlug ?? null,
  }
}

export function matchFallbackCredentials(email: string, password: string): FallbackMatch | null {
  if (!canUseFallback()) return null
  const normalized = normalizeEmail(email)
  const candidate = FALLBACK_USERS.find((user) => {
    const emails = [user.email, ...(user.aliases ?? [])].map(normalizeEmail)
    return emails.includes(normalized)
  })
  if (!candidate) return null
  if (candidate.password !== password) return null
  return buildMatch(candidate)
}

export function matchFallbackByEmail(email: string): FallbackMatch | null {
  if (!canUseFallback()) return null
  const normalized = normalizeEmail(email)
  const candidate = FALLBACK_USERS.find((user) => {
    const emails = [user.email, ...(user.aliases ?? [])].map(normalizeEmail)
    return emails.includes(normalized)
  })
  if (!candidate) return null
  return buildMatch(candidate)
}

export function matchFallbackByProjectCode(projectCode: string): FallbackMatch | null {
  if (!canUseFallback()) return null
  const candidate = FALLBACK_USERS.find((user) => user.projectCode && user.projectCode.toLowerCase() === projectCode.toLowerCase())
  if (!candidate) return null
  return buildMatch(candidate)
}
