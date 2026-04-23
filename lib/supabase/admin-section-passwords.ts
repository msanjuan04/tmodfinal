import bcrypt from "bcryptjs"

import { createServerSupabaseClient } from "./server"
import type { ProtectedSection } from "../../server/services/section-access"

/**
 * Verifica una contraseña contra la fila de la tabla `admin_section_passwords`
 * para la sección indicada. Devuelve `true` si el bcrypt coincide.
 */
export async function verifySectionPassword(
  section: ProtectedSection,
  password: string,
): Promise<boolean> {
  const trimmed = typeof password === "string" ? password.trim() : ""
  if (!trimmed) return false

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("admin_section_passwords")
    .select("password_hash")
    .eq("section", section)
    .maybeSingle()

  if (error) {
    console.error("[section-passwords] Error consultando Supabase", error)
    return false
  }

  if (!data?.password_hash) {
    console.warn(`[section-passwords] No hay contraseña configurada para la sección "${section}"`)
    return false
  }

  try {
    return await bcrypt.compare(trimmed, data.password_hash)
  } catch (compareError) {
    console.error("[section-passwords] Error comparando bcrypt", compareError)
    return false
  }
}
