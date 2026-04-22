import { createHash, randomBytes } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

import { createServerSupabaseClient } from "../../lib/supabase/server"

// Emitimos un token aleatorio crudo (se envía por correo) y guardamos solo su
// SHA-256 en la DB. Así, si alguien filtra la tabla, no sirve de nada: habría
// que revertir un hash. Además el token es de un solo uso y caduca pronto.

const TOKEN_BYTES = 32
const TOKEN_TTL_MINUTES = 30

export interface IssuedResetToken {
  rawToken: string
  expiresAt: string
  userId: string
  email: string
  fullName: string
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

export async function issuePasswordResetToken(
  email: string,
): Promise<IssuedResetToken | null> {
  const supabase = createServerSupabaseClient()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  const { data: user, error } = await supabase
    .from("app_users")
    .select("id, email, full_name, is_active")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (error) {
    console.error("[password-reset] Error buscando usuario", error)
    return null
  }

  if (!user || user.is_active === false) {
    return null
  }

  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url")
  const tokenHash = hashResetToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString()

  // Invalidamos tokens anteriores que aún no se hayan usado: solo uno vigente
  // a la vez por usuario. Mejor UX (el último correo es el que funciona) y
  // mejor seguridad (no se acumulan enlaces vivos).
  await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null)

  const { error: insertError } = await supabase.from("password_reset_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error("[password-reset] Error creando token", insertError)
    return null
  }

  return {
    rawToken,
    expiresAt,
    userId: user.id,
    email: user.email,
    fullName: user.full_name ?? user.email.split("@")[0],
  }
}

export interface ConsumedResetToken {
  userId: string
  email: string
  fullName: string
}

export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string,
): Promise<
  | { ok: true; consumed: ConsumedResetToken }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak" | "error" }
> {
  if (newPassword.trim().length < 8) {
    return { ok: false, reason: "weak" }
  }

  const supabase = createServerSupabaseClient()
  const tokenHash = hashResetToken(rawToken.trim())

  const { data: record, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error) {
    console.error("[password-reset] Error consultando token", error)
    return { ok: false, reason: "error" }
  }
  if (!record) {
    return { ok: false, reason: "invalid" }
  }
  if (record.used_at) {
    return { ok: false, reason: "used" }
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" }
  }

  const { data: user, error: userError } = await supabase
    .from("app_users")
    .select("id, email, full_name")
    .eq("id", record.user_id)
    .maybeSingle()

  if (userError || !user) {
    console.error("[password-reset] Usuario no encontrado", userError)
    return { ok: false, reason: "error" }
  }

  const passwordHash = await bcrypt.hash(newPassword.trim(), 10)

  const { error: updateError } = await supabase
    .from("app_users")
    .update({ password_hash: passwordHash, must_update_password: false })
    .eq("id", user.id)

  if (updateError) {
    console.error("[password-reset] Error guardando nueva contraseña", updateError)
    return { ok: false, reason: "error" }
  }

  const { error: markError } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id)

  if (markError) {
    console.error("[password-reset] Error marcando token como usado", markError)
  }

  return {
    ok: true,
    consumed: {
      userId: user.id,
      email: user.email,
      fullName: user.full_name ?? user.email.split("@")[0],
    },
  }
}

export async function purgeExpiredResetTokens(supabase?: SupabaseClient) {
  const client = supabase ?? createServerSupabaseClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  await client.from("password_reset_tokens").delete().lt("expires_at", cutoff)
}
