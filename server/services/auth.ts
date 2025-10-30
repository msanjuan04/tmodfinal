// @ts-nocheck
import { createServerSupabaseClient } from "../../lib/supabase/server"
import type { SessionData, SessionRole } from "./session"
import { isSuperAdminEmail } from "./session"

export interface LoginResult {
  success: boolean
  message?: string
  redirectTo?: string
}

interface AuthSuccess {
  result: LoginResult
  session?: SessionData
}

function resolveRole(rawRole: unknown, email: string): SessionRole {
  if (isSuperAdminEmail(email)) {
    return "admin"
  }
  return rawRole === "admin" ? "admin" : "client"
}

export async function loginWithEmailAndPassword(email: string, password: string): Promise<AuthSuccess> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { result: { success: false, message: "Introduce un correo electrónico válido." } }
  }

  if (!password.trim()) {
    return { result: { success: false, message: "Introduce tu contraseña." } }
  }

  const supabase = createServerSupabaseClient()

  const { data: authData, error: authError } = await supabase.rpc("login_user_with_password", {
    email_input: normalizedEmail,
    password_input: password.trim(),
  })

  if (authError) {
    console.error("Error verifying credentials", authError)
    return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
  }

  const user = Array.isArray(authData) ? authData[0] : authData

  if (!user) {
    return { result: { success: false, message: "No encontramos este correo en Terrazea. ¿Lo has escrito bien?" } }
  }

  const normalizedUser = {
    id: String((user as Record<string, unknown>).id ?? ""),
    email: String((user as Record<string, unknown>).email ?? normalizedEmail),
    fullName:
      typeof (user as Record<string, unknown>).full_name === "string"
        ? ((user as Record<string, unknown>).full_name as string)
        : typeof (user as Record<string, unknown>).fullName === "string"
          ? ((user as Record<string, unknown>).fullName as string)
          : normalizedEmail.split("@")[0],
    role:
      typeof (user as Record<string, unknown>).role === "string"
        ? ((user as Record<string, unknown>).role as string)
        : "client",
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (clientError) {
    console.error("Error fetching client", clientError)
    return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
  }

  let clientId = client?.id ?? null
  let displayName = client?.full_name ?? normalizedUser.fullName

  if (!clientId) {
    const { data: insertedClient, error: insertError } = await supabase
      .from("clients")
      .insert({
        full_name: displayName,
        email: normalizedEmail,
      })
      .select("id")
      .maybeSingle()

    if (insertError || !insertedClient) {
      console.error("Error creating client record", insertError)
      return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
    }

    clientId = insertedClient.id
  }

  const session: SessionData = {
    userId: normalizedUser.id,
    email: normalizedUser.email,
    name: displayName,
    clientId,
    role: resolveRole(normalizedUser.role, normalizedUser.email),
  }
  const redirectTarget = session.role === "admin" ? "/dashboard" : "/client/dashboard?welcome=1"

  return {
    session,
    result: {
      success: true,
      redirectTo: redirectTarget,
      message: "Acceso concedido. Redirigiendo a tu zona privada...",
    },
  }
}

export async function loginWithProjectCode(projectCode: string): Promise<AuthSuccess> {
  const trimmedCode = projectCode.trim()
  if (!trimmedCode) {
    return { result: { success: false, message: "Introduce tu código de proyecto." } }
  }

  const supabase = createServerSupabaseClient()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      id, slug, code, name, client_id,
      clients!inner(id, full_name, email)
    `)
    .eq("code", trimmedCode)
    .maybeSingle()

  if (projectError) {
    console.error("Error fetching project", projectError)
    return { result: { success: false, message: "No hemos podido verificar el código. Inténtalo de nuevo." } }
  }

  if (!project) {
    return { result: { success: false, message: "No encontramos un proyecto con este código. ¿Lo has escrito correctamente?" } }
  }

  const clientEmail = project.clients.email
  const { data: user, error: userError } = await supabase
    .from("app_users")
    .select("id, email, full_name, role")
    .eq("email", clientEmail)
    .eq("is_active", true)
    .maybeSingle()

  if (userError) {
    console.error("Error fetching user", userError)
    return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
  }

  if (!user) {
    return { result: { success: false, message: "No tienes acceso a este proyecto. Contacta con Terrazea." } }
  }

  const session: SessionData = {
    userId: user.id,
    email: clientEmail,
    name: project.clients.full_name,
    clientId: project.client_id,
    role: resolveRole(user.role, clientEmail),
  }
  const redirectTarget =
    session.role === "admin"
      ? "/dashboard"
      : `/client/dashboard?project=${encodeURIComponent(project.slug)}&welcome=1`

  return {
    session,
    result: {
      success: true,
      redirectTo: redirectTarget,
      message: "Acceso concedido. Redirigiendo a tu proyecto...",
    },
  }
}

export async function loginWithEmail(email: string, projectCode?: string): Promise<AuthSuccess> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { result: { success: false, message: "Introduce un correo electrónico válido." } }
  }

  const supabase = createServerSupabaseClient()

  const { data: user, error: userError } = await supabase
    .from("app_users")
    .select("id, email, display_name, role")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (userError) {
    console.error("Error fetching user", userError)
    return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
  }

  if (!user) {
    return { result: { success: false, message: "No encontramos este correo en Terrazea. ¿Lo has escrito bien?" } }
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, full_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (clientError) {
    console.error("Error fetching client", clientError)
    return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
  }

  let clientId = client?.id ?? null
  let displayName = client?.full_name ?? user.display_name ?? normalizedEmail.split("@")[0]

  if (!clientId) {
    const { data: insertedClient, error: insertError } = await supabase
      .from("clients")
      .insert({
        full_name: displayName,
        email: normalizedEmail,
      })
      .select("id")
      .maybeSingle()

    if (insertError || !insertedClient) {
      console.error("Error creating client record", insertError)
      return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
    }

    clientId = insertedClient.id
  }

  const session: SessionData = {
    userId: user.id,
    email: normalizedEmail,
    name: displayName,
    clientId,
    role: resolveRole(user.role, normalizedEmail),
  }

  let redirectTo = session.role === "admin" ? "/dashboard" : "/client/dashboard?welcome=1"

  if (projectCode && clientId) {
    const trimmedCode = projectCode.trim()
    if (trimmedCode) {
      const { data: projectByCode, error: projectError } = await supabase
        .from("projects")
        .select("slug, code, client_id")
        .eq("code", trimmedCode)
        .eq("client_id", clientId)
        .maybeSingle()

      if (!projectError && projectByCode?.slug) {
        redirectTo = `/client/dashboard?project=${encodeURIComponent(projectByCode.slug)}&welcome=1`
      } else {
        redirectTo = `/client/projects?project=${encodeURIComponent(trimmedCode)}`
      }
    }
  }

  return {
    session,
    result: {
      success: true,
      redirectTo,
      message: "Acceso concedido. Redirigiendo a tu zona privada...",
    },
  }
}
