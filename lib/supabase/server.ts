import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const APPLICATION_NAME_HEADER = "terrazea-clientzone"

export function createServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable")
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": APPLICATION_NAME_HEADER,
      },
    },
  })
}

export function resolveDefaultProjectSlug(): string {
  const slug = process.env.SUPABASE_DEFAULT_PROJECT_SLUG

  if (!slug) {
    throw new Error("Missing SUPABASE_DEFAULT_PROJECT_SLUG environment variable")
  }

  return slug
}
