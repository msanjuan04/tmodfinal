"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Loader2, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Cabecera estándar para los modales del calendario.
 * Fondo blanco con borde inferior, overline en salvia, título heading,
 * descripción en gris.
 */
export function CalendarFormHeader({
  icon: Icon,
  overline,
  title,
  description,
  accent = "teal",
}: {
  icon: LucideIcon
  overline: string
  title: string
  description: string
  accent?: "teal" | "amber" | "salvia"
}) {
  const accentMap = {
    teal: { bg: "bg-[#2F4F4F]", text: "text-white" },
    amber: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
    salvia: { bg: "bg-[#F4F1EA]", text: "text-[#2F4F4F]" },
  }
  const accentStyle = accentMap[accent]
  return (
    <header className="border-b border-[#E8E6E0] bg-white px-6 py-5">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            accentStyle.bg,
            accentStyle.text,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">{overline}</p>
      </div>
      <h2 className="mt-2 font-heading text-2xl font-semibold text-[#2F4F4F]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
    </header>
  )
}

/**
 * Sección del formulario con fondo blanco, icono y título.
 */
export function CalendarFormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border border-[#E8E6E0] bg-white p-4 shadow-apple-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="font-heading text-sm font-semibold text-[#2F4F4F]">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/**
 * Campo de formulario con label en negrita, required y hint.
 */
export function CalendarField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1 text-xs font-semibold text-[#2F4F4F]">
        {label}
        {required ? <span className="text-[#B91C1C]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-[#9CA3AF]">{hint}</span> : null}
    </label>
  )
}

/**
 * Fila tipo checkbox con icono, título y descripción.
 */
export function CalendarCheckboxRow({
  checked,
  onChange,
  icon,
  title,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[1.25rem] border p-3 transition",
        checked
          ? "border-[#2F4F4F]/40 bg-[#F4F1EA]"
          : "border-[#E8E6E0] bg-[#FAFAF8] hover:border-[#2F4F4F]/40",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[#C6B89E] text-[#2F4F4F] focus:ring-[#2F4F4F]/30"
      />
      <div className="flex-1 space-y-0.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#2F4F4F]">
          {icon}
          {title}
        </span>
        {description ? (
          <span className="block text-xs text-[#6B7280]">{description}</span>
        ) : null}
      </div>
    </label>
  )
}

/**
 * Footer sticky con Cancelar / Submit y eliminación opcional.
 */
export function CalendarFormFooter({
  onCancel,
  submitting,
  isEditing,
  createLabel = "Crear",
  updateLabel = "Guardar cambios",
  onDelete,
}: {
  onCancel: () => void
  submitting: boolean
  isEditing: boolean
  createLabel?: string
  updateLabel?: string
  onDelete?: () => void
}) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex items-center justify-between gap-2 border-t border-[#E8E6E0] bg-white px-6 py-4">
      {isEditing && onDelete ? (
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          disabled={submitting}
          className="rounded-full border-[#FCA5A5] px-3 text-[11px] font-semibold text-[#B91C1C] hover:border-[#DC2626] hover:text-[#DC2626]"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
        </Button>
      ) : (
        <div />
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-full border-[#E8E6E0] px-4 text-sm font-medium text-[#4B5563]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#2F4F4F] px-5 text-sm font-semibold text-white hover:bg-[#1F3535]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? updateLabel : createLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** Clase base para inputs/selects/textareas del calendario (consistente con Clients/Projects). */
export const CALENDAR_INPUT_CLASS =
  "h-11 w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
export const CALENDAR_TEXTAREA_CLASS =
  "min-h-[90px] w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-3 py-2 text-sm text-[#2F4F4F] focus:border-[#2F4F4F] focus:ring-[#2F4F4F]/20"
