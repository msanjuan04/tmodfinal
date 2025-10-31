const PRIMARY_ADMIN_EMAIL = "aterrazea@gmail.com"
const ADMIN_EMAIL_ALIASES = ["terrazea@gmail.com"] as const

const ADMIN_EMAIL_SET = new Set<string>([PRIMARY_ADMIN_EMAIL, ...ADMIN_EMAIL_ALIASES])

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isSuperAdminEmail(email: string) {
  return ADMIN_EMAIL_SET.has(normalizeEmail(email))
}

export function resolveAdminSessionEmail(email: string) {
  return isSuperAdminEmail(email) ? PRIMARY_ADMIN_EMAIL : normalizeEmail(email)
}

export function resolveAdminLoginCandidates(email: string) {
  const normalized = normalizeEmail(email)
  if (ADMIN_EMAIL_SET.has(normalized)) {
    const ordered = [normalized, ...Array.from(ADMIN_EMAIL_SET).filter((value) => value !== normalized)]
    return Array.from(new Set(ordered))
  }
  return [normalized]
}

export const SUPER_ADMIN_PRIMARY_EMAIL = PRIMARY_ADMIN_EMAIL
