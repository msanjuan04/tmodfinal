import {
  CalendarDays,
  CheckCircle2,
  Flag,
  Hammer,
  MessageCircle,
  StickyNote,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface EventStyle {
  /** Clase Tailwind del "punto" indicador (bg-...) */
  dotClass: string
  /** Classes para el chip compacto dentro del día del calendario */
  pillClass: string
  /** Classes para la tarjeta de detalle en el panel lateral */
  cardClass: string
  /** Etiqueta legible del tipo de evento */
  label: string
  /** Icono representativo */
  icon: LucideIcon
}

const DEFAULT_STYLE: EventStyle = {
  dotClass: "bg-[#2F4F4F]",
  pillClass: "bg-[#F8F7F4] text-[#2F4F4F] border border-[#E8E6E0]",
  cardClass: "bg-[#F8F7F4] border border-[#E8E6E0]",
  label: "Evento",
  icon: CalendarDays,
}

// Estilo reutilizable para cualquier evento de tarea ya completada.
// Verde con tachado y icono de check.
const DONE_EVENT_STYLE: Omit<EventStyle, "label"> = {
  dotClass: "bg-[#047857]",
  pillClass: "bg-[#DCFCE7] text-[#065F46] border border-[#BBF7D0] line-through",
  cardClass: "bg-[#F0FDF4] border border-[#BBF7D0]",
  icon: CheckCircle2,
}

const STYLE_MAP: Record<string, EventStyle> = {
  // Hitos (tareas marcadas como hito)
  task_milestone_start: {
    dotClass: "bg-[#B45309]",
    pillClass: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
    cardClass: "bg-[#FFFBEB] border border-[#FDE68A]",
    label: "Hito · Inicio",
    icon: Flag,
  },
  task_milestone_due: {
    dotClass: "bg-[#B45309]",
    pillClass: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
    cardClass: "bg-[#FFFBEB] border border-[#FDE68A]",
    label: "Hito · Entrega",
    icon: Flag,
  },
  // Versiones "done" de los hitos
  task_milestone_start_done: { ...DONE_EVENT_STYLE, label: "Hito · Inicio (hecho)" },
  task_milestone_due_done: { ...DONE_EVENT_STYLE, label: "Hito · Entrega (hecho)" },

  // Tareas normales de proyecto
  task_start: {
    dotClass: "bg-[#2F4F4F]",
    pillClass: "bg-[#E6EDEA] text-[#2F4F4F] border border-[#C6D4CE]",
    cardClass: "bg-[#F1F6F3] border border-[#CFDDD7]",
    label: "Inicio tarea",
    icon: Hammer,
  },
  task_due: {
    dotClass: "bg-[#2F4F4F]",
    pillClass: "bg-[#E6EDEA] text-[#2F4F4F] border border-[#C6D4CE]",
    cardClass: "bg-[#F1F6F3] border border-[#CFDDD7]",
    label: "Entrega tarea",
    icon: Hammer,
  },
  // Versiones "done" de las tareas normales
  task_start_done: { ...DONE_EVENT_STYLE, label: "Inicio tarea (hecha)" },
  task_due_done: { ...DONE_EVENT_STYLE, label: "Entrega tarea (hecha)" },

  // Eventos manuales
  visita: {
    dotClass: "bg-[#758C84]",
    pillClass: "bg-[#EFF3F1] text-[#3F5A52] border border-[#D4DED9]",
    cardClass: "bg-[#F4F7F5] border border-[#D4DED9]",
    label: "Visita",
    icon: Users,
  },
  entrega: {
    dotClass: "bg-[#0D9488]",
    pillClass: "bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]",
    cardClass: "bg-[#ECFDF5] border border-[#A7F3D0]",
    label: "Entrega",
    icon: Truck,
  },
  reunion: {
    dotClass: "bg-[#5B21B6]",
    pillClass: "bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]",
    cardClass: "bg-[#F5F3FF] border border-[#DDD6FE]",
    label: "Reunión",
    icon: MessageCircle,
  },
  completada: {
    dotClass: "bg-[#047857]",
    pillClass: "bg-[#DCFCE7] text-[#065F46] border border-[#BBF7D0] line-through",
    cardClass: "bg-[#F0FDF4] border border-[#BBF7D0]",
    label: "Completada",
    icon: CheckCircle2,
  },
  nota_interna: {
    dotClass: "bg-[#BE185D]",
    pillClass: "bg-[#FCE7F3] text-[#9D174D] border border-[#FBCFE8]",
    cardClass: "bg-[#FDF2F8] border border-[#FBCFE8]",
    label: "Nota interna",
    icon: StickyNote,
  },
}

export function getEventStyle(eventType: string): EventStyle {
  return STYLE_MAP[eventType] ?? DEFAULT_STYLE
}

export function isMilestoneEventType(eventType: string): boolean {
  return eventType.startsWith("task_milestone_")
}

/** Detecta si un event_type corresponde a una tarea ya completada (_done). */
export function isDoneTaskEventType(eventType: string): boolean {
  return eventType.startsWith("task_") && eventType.endsWith("_done")
}

/** Detecta cualquier evento originado desde una tarea (incluidas las completadas). */
export function isTaskEventType(eventType: string): boolean {
  return eventType.startsWith("task_")
}
