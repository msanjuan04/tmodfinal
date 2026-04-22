// @ts-nocheck
import type { SupabaseClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

import { createServerSupabaseClient } from "../../lib/supabase/server"
import { resolveAdminLoginCandidates, resolveAdminSessionEmail, isSuperAdminEmail } from "../../lib/constants/admin"
import type { SessionData, SessionRole } from "./session"
import { matchFallbackCredentials, matchFallbackByEmail, matchFallbackByProjectCode } from "./auth-fallback"

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

  const sanitizedPassword = password.trim()

  if (!sanitizedPassword) {
    return { result: { success: false, message: "Introduce tu contraseña." } }
  }

  const fallbackMatch = matchFallbackCredentials(normalizedEmail, sanitizedPassword)

  if (fallbackMatch) {
    const session = fallbackMatch.session
    const redirectTarget =
      session.role === "admin"
        ? "/dashboard"
        : fallbackMatch.projectSlug
          ? `/client/dashboard?project=${encodeURIComponent(fallbackMatch.projectSlug)}&welcome=1`
          : "/client/dashboard?welcome=1"

    return {
      session,
      result: {
        success: true,
        redirectTo: redirectTarget,
        message: "Acceso concedido. Redirigiendo a tu zona privada...",
      },
    }
  }

  let supabase: SupabaseClient | null = null
  try {
    supabase = createServerSupabaseClient()
  } catch (error) {
    console.error("Error creating Supabase client", error)
  }

  let user:
    | (Record<string, unknown> & {
        password_hash?: string | null
        must_update_password?: boolean | null
        is_active?: boolean | null
      })
    | null = null
  let matchedEmail = normalizedEmail
  // Si encontramos el correo pero la cuenta aún no tiene contraseña, queremos
  // indicarle al cliente que debe activarla primero con su código Terrazea, en
  // lugar de devolver "correo no encontrado".
  let foundEmailWithoutPassword = false

  if (supabase) {
    for (const candidate of resolveAdminLoginCandidates(normalizedEmail)) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("id, email, full_name, role, password_hash, must_update_password, is_active")
          .eq("email", candidate)
          .maybeSingle()

        if (error) {
          console.error("Error fetching user by email", error)
          return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
        }

        if (data && data.is_active !== false) {
          if (!data.password_hash) {
            foundEmailWithoutPassword = true
            continue
          }
          const matches = bcrypt.compareSync(sanitizedPassword, data.password_hash)
          if (matches) {
            user = data as typeof user
            matchedEmail = candidate
            break
          }
        }
      } catch (error) {
        console.error("Unexpected error verifying credentials", error)
        return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
      }
    }
  }

  if (!user) {
    if (!supabase) {
      return { result: { success: false, message: "Servicio no disponible. Inténtalo en unos minutos." } }
    }

    if (foundEmailWithoutPassword) {
      return {
        result: {
          success: false,
          message:
            "Aún no has activado tu cuenta. Entra por primera vez con el código Terrazea que te hemos enviado por correo y crea tu contraseña.",
        },
      }
    }

    return { result: { success: false, message: "No encontramos este correo en Terrazea. ¿Lo has escrito bien?" } }
  }

  if (!supabase) {
    return { result: { success: false, message: "Servicio no disponible. Inténtalo en unos minutos." } }
  }

  const effectiveEmail = isSuperAdminEmail(normalizedEmail) ? resolveAdminSessionEmail(normalizedEmail) : matchedEmail

  const normalizedUser = {
    id: String(user.id ?? ""),
    email: effectiveEmail,
    fullName:
      typeof user.full_name === "string"
        ? (user.full_name as string)
        : typeof user.fullName === "string"
          ? (user.fullName as string)
          : effectiveEmail.split("@")[0],
    role: typeof user.role === "string" ? (user.role as string) : "client",
  }

  const sessionRole = resolveRole(normalizedUser.role, normalizedUser.email)
  const mustUpdatePassword = user?.must_update_password === true

  if (mustUpdatePassword && sessionRole === "client") {
    return {
      result: {
        success: false,
        message: "Activa tu acceso creando una contraseña nueva desde el enlace que aparece al entrar con tu código de proyecto.",
      },
    }
  }

  let clientId: string | null = null
  let displayName = normalizedUser.fullName

  if (sessionRole === "client") {
    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .eq("email", normalizedUser.email)
        .maybeSingle()

      if (clientError) {
        console.error("Error fetching client", clientError)
        return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
      }

      clientId = client?.id ?? null
      displayName = client?.full_name ?? normalizedUser.fullName

      if (!clientId) {
        const { data: insertedClient, error: insertError } = await supabase
          .from("clients")
          .insert({
            full_name: displayName,
            email: normalizedUser.email,
          })
          .select("id")
          .maybeSingle()

        if (insertError || !insertedClient) {
          console.error("Error creating client record", insertError)
          return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
        }

        clientId = insertedClient.id
      }
    } catch (error) {
      console.error("Unexpected error preparing client data", error)
      return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
    }
  }

  const session: SessionData = {
    userId: normalizedUser.id,
    email: normalizedUser.email,
    name: displayName,
    clientId,
    role: sessionRole,
    mustUpdatePassword: false,
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

  const fallback = matchFallbackByProjectCode(trimmedCode)
  if (fallback) {
    const session = fallback.session
    const redirectTarget =
      session.role === "admin"
        ? "/dashboard"
        : fallback.projectSlug
          ? `/client/dashboard?project=${encodeURIComponent(fallback.projectSlug)}&welcome=1`
          : "/client/dashboard?welcome=1"

    return {
      session,
      result: {
        success: true,
        redirectTo: redirectTarget,
        message: "Acceso concedido. Redirigiendo a tu proyecto...",
      },
    }
  }

  let supabase: SupabaseClient | null = null
  try {
    supabase = createServerSupabaseClient()
  } catch (error) {
    console.error("Error creating Supabase client", error)
  }

  if (!supabase) {
    return { result: { success: false, message: "Servicio no disponible. Inténtalo en unos minutos." } }
  }

  let project: any
  try {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(`
        id, slug, code, name, client_id,
        clients!inner(id, full_name, email, password_initialized)
      `)
      .eq("code", trimmedCode)
      .maybeSingle()

    if (projectError) {
      console.error("Error fetching project", projectError)
      return { result: { success: false, message: "No hemos podido verificar el código. Inténtalo de nuevo." } }
    }

    project = projectData
  } catch (error) {
    console.error("Unexpected error fetching project by code", error)
    return { result: { success: false, message: "No hemos podido verificar el código. Inténtalo de nuevo." } }
  }

  if (!project) {
    return { result: { success: false, message: "No encontramos un proyecto con este código. ¿Lo has escrito correctamente?" } }
  }

  const clientEmail = project.clients.email
  const clientNeedsPassword = project.clients.password_initialized === false

  // El código Terrazea solo sirve para la activación inicial. Una vez el cliente
  // ha creado su contraseña, tiene que entrar siempre con correo y contraseña.
  if (!clientNeedsPassword) {
    return {
      result: {
        success: false,
        message:
          "Este código ya se ha utilizado para activar la cuenta. Entra con tu correo y contraseña.",
      },
    }
  }
  let user: {
    id: string
    email: string
    full_name?: string | null
    role?: string | null
    must_update_password?: boolean | null
  } | null = null
  try {
    const { data: userData, error: userError } = await supabase
      .from("app_users")
      .select("id, email, full_name, role, must_update_password")
      .eq("email", clientEmail)
      .eq("is_active", true)
      .maybeSingle()

    if (userError) {
      console.error("Error fetching user", userError)
      return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
    }

    user = userData
  } catch (error) {
    console.error("Unexpected error fetching user by project code", error)
    return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
  }

  if (!user) {
    return { result: { success: false, message: "No tienes acceso a este proyecto. Contacta con Terrazea." } }
  }

  if (clientNeedsPassword && user.must_update_password !== true) {
    const { error: flagError } = await supabase
      .from("app_users")
      .update({ must_update_password: true })
      .eq("id", user.id)
      .select("must_update_password")
      .maybeSingle()
    if (flagError) {
      console.error("No se pudo marcar al usuario para actualización de contraseña", flagError)
    } else {
      user.must_update_password = true
    }
  }

  const sessionRole = resolveRole(user.role, clientEmail)
  const mustUpdatePassword = user?.must_update_password === true

  const session: SessionData = {
    userId: user.id,
    email: clientEmail,
    name: project.clients.full_name,
    clientId: project.client_id,
    role: sessionRole,
    mustUpdatePassword,
  }
  const defaultRedirect =
    session.role === "admin"
      ? "/dashboard"
      : `/client/dashboard?project=${encodeURIComponent(project.slug)}&welcome=1`

  const redirectTarget =
    session.role === "client" && mustUpdatePassword
      ? `/client/setup-password?next=${encodeURIComponent(defaultRedirect)}`
      : defaultRedirect

  const message =
    session.role === "client" && mustUpdatePassword
      ? "Crea tu contraseña personalizada para continuar."
      : "Acceso concedido. Redirigiendo a tu proyecto..."

  return {
    session,
    result: {
      success: true,
      redirectTo: redirectTarget,
      message,
    },
  }
}

export async function loginWithEmail(email: string, projectCode?: string): Promise<AuthSuccess> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { result: { success: false, message: "Introduce un correo electrónico válido." } }
  }

  const fallbackMatch = matchFallbackByEmail(normalizedEmail)

  if (fallbackMatch) {
    const session = fallbackMatch.session
    let redirectTo = session.role === "admin" ? "/dashboard" : "/client/dashboard?welcome=1"

    if (session.role === "client") {
      const targetSlug = fallbackMatch.projectSlug
      const codeMatches = projectCode && fallbackMatch.projectCode && projectCode.trim().toLowerCase() === fallbackMatch.projectCode.toLowerCase()

      if (targetSlug) {
        redirectTo = `/client/dashboard?project=${encodeURIComponent(targetSlug)}&welcome=1`
      } else if (projectCode && !codeMatches) {
        redirectTo = `/client/projects?project=${encodeURIComponent(projectCode.trim())}`
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

  let supabase: SupabaseClient | null = null
  try {
    supabase = createServerSupabaseClient()
  } catch (error) {
    console.error("Error creating Supabase client", error)
  }

  let user:
    | {
        id: string
        email: string
        display_name?: string | null
        role?: string | null
        must_update_password?: boolean | null
      }
    | null = null
  let matchedEmail = normalizedEmail

  if (supabase) {
    for (const candidate of resolveAdminLoginCandidates(normalizedEmail)) {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("id, email, display_name, role, must_update_password")
          .eq("email", candidate)
          .maybeSingle()

        if (error) {
          console.error("Error fetching user", error)
          return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
        }

        if (data) {
          user = data as typeof user
          matchedEmail = candidate
          break
        }
      } catch (error) {
        console.error("Unexpected error fetching user by email", error)
        return { result: { success: false, message: "No hemos podido iniciar sesión. Inténtalo de nuevo." } }
      }
    }
  }

  if (!user) {
    if (!supabase) {
      return { result: { success: false, message: "Servicio no disponible. Inténtalo en unos minutos." } }
    }

    return { result: { success: false, message: "No encontramos este correo en Terrazea. ¿Lo has escrito bien?" } }
  }

  if (!supabase) {
    return { result: { success: false, message: "Servicio no disponible. Inténtalo en unos minutos." } }
  }

  const effectiveEmail = isSuperAdminEmail(normalizedEmail) ? resolveAdminSessionEmail(normalizedEmail) : matchedEmail
  const sessionRole = resolveRole(user.role, effectiveEmail)
  const mustUpdatePassword = user?.must_update_password === true

  if (mustUpdatePassword && sessionRole === "client") {
    return {
      result: {
        success: false,
        message: "Activa tu acceso creando una contraseña nueva desde tu código de proyecto.",
      },
    }
  }

  let clientId: string | null = null
  let displayName = user.display_name ?? effectiveEmail.split("@")[0]

  if (sessionRole === "client") {
    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .eq("email", effectiveEmail)
        .maybeSingle()

      if (clientError) {
        console.error("Error fetching client", clientError)
        return { result: { success: false, message: "Ha ocurrido un problema al validar tu acceso." } }
      }

      clientId = client?.id ?? null
      displayName = client?.full_name ?? displayName

      if (!clientId) {
        const { data: insertedClient, error: insertError } = await supabase
          .from("clients")
          .insert({
            full_name: displayName,
            email: effectiveEmail,
          })
          .select("id")
          .maybeSingle()

        if (insertError || !insertedClient) {
          console.error("Error creating client record", insertError)
          return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
        }

        clientId = insertedClient.id
      }
    } catch (error) {
      console.error("Unexpected error upserting client", error)
      return { result: { success: false, message: "No hemos podido completar el acceso. Por favor, inténtalo más tarde." } }
    }
  }

  const session: SessionData = {
    userId: user.id,
    email: effectiveEmail,
    name: displayName,
    clientId,
    role: sessionRole,
    mustUpdatePassword: false,
  }

  let redirectTo = session.role === "admin" ? "/dashboard" : "/client/dashboard?welcome=1"

  if (projectCode && clientId) {
    const trimmedCode = projectCode.trim()
    if (trimmedCode) {
      try {
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
      } catch (error) {
        console.error("Unexpected error fetching project by code for redirect", error)
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
