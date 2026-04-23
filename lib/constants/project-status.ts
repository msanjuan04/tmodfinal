import {
  Sparkles,
  Palette,
  Receipt,
  Calendar,
  Hammer,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

/**
 * Estados canónicos de un proyecto.
 * Son los únicos 6 estados válidos en la aplicación.
 */
export type ProjectStatus =
  | "inicial"
  | "diseno"
  | "presupuesto"
  | "planificacion"
  | "obra_ejecucion"
  | "cierre"

export interface ProjectStatusMeta {
  value: ProjectStatus
  label: string
  /** Tailwind classes aplicadas a los badges de estado. */
  badgeClass: string
  /** Icono representativo (lucide-react). */
  icon: LucideIcon
}

export const PROJECT_STATUSES: readonly ProjectStatusMeta[] = [
  {
    value: "inicial",
    label: "Inicial",
    badgeClass: "bg-[#E8E6E0] text-[#4B5563]",
    icon: Sparkles,
  },
  {
    value: "diseno",
    label: "Diseño",
    badgeClass: "bg-[#EDE9FE] text-[#5B21B6]",
    icon: Palette,
  },
  {
    value: "presupuesto",
    label: "Presupuesto",
    badgeClass: "bg-[#FEF3C7] text-[#B45309]",
    icon: Receipt,
  },
  {
    value: "planificacion",
    label: "Planificación",
    badgeClass: "bg-[#DBEAFE] text-[#1D4ED8]",
    icon: Calendar,
  },
  {
    value: "obra_ejecucion",
    label: "Obra/Ejecución",
    badgeClass: "bg-[#DCFCE7] text-[#047857]",
    icon: Hammer,
  },
  {
    value: "cierre",
    label: "Cierre",
    badgeClass: "bg-[#C7F9CC] text-[#166534]",
    icon: CheckCircle2,
  },
] as const

export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> =
  PROJECT_STATUSES.map(({ value, label }) => ({ value, label }))

export const PROJECT_STATUS_DEFAULT: ProjectStatus = "inicial"

const STATUS_META_MAP: Record<string, ProjectStatusMeta> = PROJECT_STATUSES.reduce(
  (acc, meta) => {
    acc[meta.value] = meta
    return acc
  },
  {} as Record<string, ProjectStatusMeta>,
)

/**
 * Mapa de estados "antiguos" (y variantes con acento o barra) al estado canónico.
 * Permite que registros históricos en la BD sigan funcionando en la UI.
 */
const LEGACY_STATUS_MAP: Record<string, ProjectStatus> = {
  // Nuevos slugs con acento o variantes de escritura
  "diseño": "diseno",
  "planificación": "planificacion",
  "obra/ejecucion": "obra_ejecucion",
  "obra/ejecución": "obra_ejecucion",
  "obra-ejecucion": "obra_ejecucion",
  ejecucion: "obra_ejecucion",
  "ejecución": "obra_ejecucion",
  obra: "obra_ejecucion",

  // Slugs antiguos
  borrador: "inicial",
  activo: "obra_ejecucion",
  en_progreso: "obra_ejecucion",
  pausado: "planificacion",
  finalizado: "cierre",
  completado: "cierre",
  archivado: "cierre",
  cancelado: "cierre",
}

/**
 * Normaliza cualquier string de estado (canónico, con acento, variante antigua)
 * al estado canónico más cercano. Por defecto `inicial` si no coincide con nada.
 */
export function normalizeProjectStatus(raw: string | null | undefined): ProjectStatus {
  if (!raw) return PROJECT_STATUS_DEFAULT
  const key = raw.trim().toLowerCase()
  if (STATUS_META_MAP[key]) return STATUS_META_MAP[key].value
  if (LEGACY_STATUS_MAP[key]) return LEGACY_STATUS_MAP[key]
  return PROJECT_STATUS_DEFAULT
}

export function getProjectStatusMeta(raw: string | null | undefined): ProjectStatusMeta {
  return STATUS_META_MAP[normalizeProjectStatus(raw)]
}

export function getProjectStatusLabel(raw: string | null | undefined): string {
  return getProjectStatusMeta(raw).label
}

export function getProjectStatusBadgeClass(raw: string | null | undefined): string {
  return getProjectStatusMeta(raw).badgeClass
}

export function getProjectStatusIcon(raw: string | null | undefined): LucideIcon {
  return getProjectStatusMeta(raw).icon
}

export function isActiveProjectStatus(raw: string | null | undefined): boolean {
  return normalizeProjectStatus(raw) === "obra_ejecucion"
}

export function isCompletedProjectStatus(raw: string | null | undefined): boolean {
  return normalizeProjectStatus(raw) === "cierre"
}

export function isPendingProjectStatus(raw: string | null | undefined): boolean {
  const normalized = normalizeProjectStatus(raw)
  return normalized !== "obra_ejecucion" && normalized !== "cierre"
}
