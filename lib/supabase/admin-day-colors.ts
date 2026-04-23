import { createServerSupabaseClient } from "./server"

/** Colores canónicos permitidos. Si quieres añadir más paletas, amplía aquí y en el picker frontend. */
export const DAY_COLOR_PALETTE = [
  { value: "#2F4F4F", label: "Terrazea" },
  { value: "#758C84", label: "Salvia" },
  { value: "#B45309", label: "Ámbar" },
  { value: "#047857", label: "Verde" },
  { value: "#0D9488", label: "Turquesa" },
  { value: "#5B21B6", label: "Lavanda" },
  { value: "#BE185D", label: "Magenta" },
  { value: "#B91C1C", label: "Rojo" },
  { value: "#1D4ED8", label: "Azul" },
  { value: "#C6B89E", label: "Arena" },
] as const

const VALID_COLORS = new Set(DAY_COLOR_PALETTE.map((c) => c.value.toLowerCase()))

export function isValidDayColor(value: unknown): value is string {
  return typeof value === "string" && VALID_COLORS.has(value.toLowerCase())
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export interface AdminDayColor {
  date: string
  color: string
  note: string | null
  updatedAt: string
}

type Row = {
  date: string
  color: string
  note: string | null
  updated_at: string
}

function mapRow(row: Row): AdminDayColor {
  return {
    date: row.date,
    color: row.color,
    note: row.note ?? null,
    updatedAt: row.updated_at,
  }
}

/**
 * Devuelve los colores de día dentro del rango [from, to] (ambos inclusivos, formato YYYY-MM-DD).
 */
export async function listDayColors(from: string, to: string): Promise<AdminDayColor[]> {
  if (!isValidDate(from) || !isValidDate(to)) {
    throw new Error("Formato de fecha inválido")
  }
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("admin_calendar_day_colors")
    .select("date, color, note, updated_at")
    .gte("date", from)
    .lte("date", to)

  if (error) {
    // Si la tabla no existe todavía, devolvemos lista vacía para no romper el calendario
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.warn("[day-colors] Tabla `admin_calendar_day_colors` no encontrada. Ejecuta la migración SQL.")
      return []
    }
    throw error
  }

  return (data ?? []).map(mapRow)
}

/**
 * Crea/actualiza un color para el día indicado.
 */
export async function upsertDayColor(input: {
  date: string
  color: string
  note?: string | null
  actorId: string | null
}): Promise<AdminDayColor> {
  if (!isValidDate(input.date)) {
    const error = new Error("Fecha inválida. Usa formato YYYY-MM-DD.") as Error & { status?: number }
    error.status = 400
    throw error
  }
  if (!isValidDayColor(input.color)) {
    const error = new Error("Color no permitido. Usa uno de la paleta definida.") as Error & { status?: number }
    error.status = 400
    throw error
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("admin_calendar_day_colors")
    .upsert(
      {
        date: input.date,
        color: input.color.toLowerCase(),
        note: input.note?.trim() ? input.note.trim() : null,
        updated_by: input.actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "date" },
    )
    .select("date, color, note, updated_at")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("No se pudo guardar el color del día")
  return mapRow(data as Row)
}

/**
 * Elimina el color para un día concreto.
 */
export async function clearDayColor(date: string): Promise<void> {
  if (!isValidDate(date)) {
    const error = new Error("Fecha inválida") as Error & { status?: number }
    error.status = 400
    throw error
  }
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("admin_calendar_day_colors").delete().eq("date", date)
  if (error && error.code !== "PGRST116") {
    throw error
  }
}
