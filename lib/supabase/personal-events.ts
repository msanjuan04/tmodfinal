import { z } from "zod"

import { createServerSupabaseClient } from "./server"

const personalEventRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  event_type: z.string(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  is_all_day: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

const personalEventRangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .optional()

export interface PersonalEvent {
  id: string
  userId: string
  title: string
  description: string | null
  eventType: string
  startsAt: string
  endsAt: string | null
  isAllDay: boolean
  createdAt: string
  updatedAt: string
}

export const personalEventWriteSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(4000).optional().nullable(),
  eventType: z.string().min(2).max(64).default("personal"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  isAllDay: z.boolean().optional().default(false),
})

export type PersonalEventWriteInput = z.input<typeof personalEventWriteSchema>

function mapRowToPersonalEvent(row: z.infer<typeof personalEventRowSchema>): PersonalEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isAllDay: row.is_all_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listAdminPersonalEvents(
  userId: string,
  rangeInput?: z.infer<typeof personalEventRangeSchema>,
): Promise<PersonalEvent[]> {
  const supabase = createServerSupabaseClient()
  const range = personalEventRangeSchema.parse(rangeInput)

  let query = supabase
    .from("personal_events")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at", { ascending: true })

  if (range?.from) {
    query = query.gte("starts_at", range.from)
  }

  if (range?.to) {
    query = query.lte("starts_at", range.to)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRowToPersonalEvent(personalEventRowSchema.parse(row)))
}

export async function createPersonalEvent(input: PersonalEventWriteInput, userId: string) {
  const payload = personalEventWriteSchema.parse(input)
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("personal_events")
    .insert({
      user_id: userId,
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.eventType,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt ?? null,
      is_all_day: payload.isAllDay ?? false,
    })
    .select("*")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo crear el evento personal")
  }

  return mapRowToPersonalEvent(personalEventRowSchema.parse(data))
}

export async function updatePersonalEvent(eventId: string, input: PersonalEventWriteInput, userId: string) {
  const payload = personalEventWriteSchema.parse(input)
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("personal_events")
    .update({
      title: payload.title,
      description: payload.description ?? null,
      event_type: payload.eventType,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt ?? null,
      is_all_day: payload.isAllDay ?? false,
    })
    .eq("id", eventId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    throw error ?? new Error("No se pudo actualizar el evento personal")
  }

  return mapRowToPersonalEvent(personalEventRowSchema.parse(data))
}

export async function deletePersonalEvent(eventId: string, userId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("personal_events").delete().eq("id", eventId).eq("user_id", userId)
  if (error) {
    throw error
  }
}


