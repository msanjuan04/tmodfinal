import type { SessionData } from "@app/types/session"
import type { SessionRole } from "@app/types/session"

import { supabase } from "@app/lib/supabase/client"

export interface LoginResult {
  success: boolean
  message?: string
  redirectTo?: string
}

type SupabaseAppUser = {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
  must_update_password?: boolean | null
  is_active?: boolean | null
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const resolveRole = (rawRole?: string): SessionRole => (rawRole === "admin" ? "admin" : "client")

async function buildSessionFromEmail(email: string): Promise<SessionData | null> {
  const normalized = normalizeEmail(email)
  const { data: appUser, error } = await supabase
    .from<SupabaseAppUser>("app_users")
    .select("id, full_name, role, must_update_password, is_active")
    .eq("email", normalized)
    .maybeSingle()

  if (error || !appUser || appUser.is_active === false) {
      return null
    }

  const sessionRole = resolveRole(appUser.role ?? undefined)
  const displayName = appUser.full_name ?? normalized.split("@")[0]

  let clientId: string | null = null
  if (sessionRole === "client") {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name")
      .eq("email", normalized)
      .maybeSingle()
    if (!clientError && client?.id) {
      clientId = client.id
      if (client.full_name) {
        return {
          userId: appUser.id,
          email: normalized,
          name: client.full_name,
          clientId,
          role: sessionRole,
          mustUpdatePassword: Boolean(appUser.must_update_password),
        }
      }
    }
  }

  return {
    userId: appUser.id,
    email: normalized,
    name: displayName,
    clientId,
    role: sessionRole,
    mustUpdatePassword: Boolean(appUser.must_update_password),
  }
}

export async function fetchSession(): Promise<SessionData | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user?.email) {
      return null
    }
  return buildSessionFromEmail(session.user.email)
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  if (!email.trim() || !password.trim()) {
    return { success: false, message: "Introduce tu correo y contraseña." }
  }

  const { error, data } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })

  if (error || !data?.user) {
    return { success: false, message: error?.message ?? "No pudimos iniciar sesión. Inténtalo nuevamente." }
  }

  const session = await buildSessionFromEmail(data.user.email!)
  if (!session) {
    await supabase.auth.signOut()
    return { success: false, message: "No tenemos registrado ese acceso en Terrazea." }
  }

  const redirectTo = session.role === "admin" ? "/dashboard" : "/client/dashboard"
  return {
    success: true,
    message: "Acceso concedido. Redirigiendo...",
    redirectTo,
  }
}

export async function loginWithProjectCode(projectCode: string) {
  const trimmed = projectCode.trim()
  if (!trimmed) {
    return { success: false, message: "Introduce tu código de proyecto." }
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, code, clients(email, full_name)")
    .eq("code", trimmed)
    .maybeSingle()

  if (error || !project || !project.clients?.email) {
    return { success: false, message: "Código inválido o no registrado." }
  }

  const normalizedEmail = normalizeEmail(project.clients.email)
  const session = await buildSessionFromEmail(normalizedEmail)
  if (!session) {
    return { success: false, message: "No hemos podido verificar tu proyecto." }
  }

  const redirectTo = `/client/dashboard?project=${encodeURIComponent(trimmed)}&welcome=1`
  return {
    success: true,
    message: "Acceso concedido. Redirigiendo...",
    redirectTo,
  }
}

export async function setupClientPassword(_password: string) {
  return { success: false, message: "Cambia la contraseña desde la app de Terrazea." }
}

export async function logout() {
  await supabase.auth.signOut()
}
