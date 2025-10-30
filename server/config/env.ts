import fs from "node:fs"
import path from "node:path"

import { config as loadEnv } from "dotenv"
import { z } from "zod"

const envFiles = [".env", ".env.local"]

for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file)
  if (fs.existsSync(fullPath)) {
    loadEnv({ path: fullPath, override: true })
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url().or(z.string().length(0)),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY must be provided"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  CLIENT_APP_URL: z.string().url().default("http://localhost:5173"),
})

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CLIENT_APP_URL: process.env.CLIENT_APP_URL ?? "http://localhost:5173",
})

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Environment validation failed")
}

const normalizedSupabaseUrl = parsed.data.SUPABASE_URL || parsed.data.NEXT_PUBLIC_SUPABASE_URL

if (!normalizedSupabaseUrl) {
  throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be provided")
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  supabaseUrl: normalizedSupabaseUrl,
  supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  sessionSecret: parsed.data.SESSION_SECRET,
  clientAppUrl: parsed.data.CLIENT_APP_URL,
}
