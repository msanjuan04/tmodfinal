"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2, Palette, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  clearAdminDayColor,
  fetchAdminDayColorPalette,
  upsertAdminDayColor,
  type AdminDayColor,
  type AdminDayColorPaletteEntry,
} from "@app/lib/api/admin"

interface DayColorPickerProps {
  /** YYYY-MM-DD */
  date: string
  currentColor?: AdminDayColor | null
  onChanged: (next: AdminDayColor | null) => void
  onClose: () => void
  /** Permite posicionar el popover en la pantalla */
  anchorRect?: DOMRect | null
}

export function DayColorPicker({
  date,
  currentColor,
  onChanged,
  onClose,
  anchorRect,
}: DayColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [palette, setPalette] = useState<AdminDayColorPaletteEntry[]>([])
  const [note, setNote] = useState<string>(currentColor?.note ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAdminDayColorPalette()
      .then(setPalette)
      .catch(() => {
        // Fallback a paleta local mínima si el endpoint no está disponible
        setPalette([
          { value: "#2F4F4F", label: "Terrazea" },
          { value: "#B45309", label: "Ámbar" },
          { value: "#047857", label: "Verde" },
          { value: "#1D4ED8", label: "Azul" },
          { value: "#B91C1C", label: "Rojo" },
        ])
      })
  }, [])

  // Cerrar al hacer click fuera o con Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!popoverRef.current) return
      if (popoverRef.current.contains(e.target as Node)) return
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [onClose])

  const handlePick = async (color: string) => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await upsertAdminDayColor(date, color, note || null)
      onChanged(saved)
      toast.success("Color guardado")
      onClose()
    } catch (error) {
      console.error("No se pudo guardar el color del día", error)
      toast.error("No se pudo guardar el color")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (saving) return
    setSaving(true)
    try {
      await clearAdminDayColor(date)
      onChanged(null)
      toast.success("Color eliminado")
      onClose()
    } catch (error) {
      console.error("No se pudo borrar el color del día", error)
      toast.error("No se pudo borrar el color")
    } finally {
      setSaving(false)
    }
  }

  // Posicionamiento: sobre el anchor pero ajustado para que no se salga de pantalla
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 50,
  }
  if (anchorRect) {
    const estimatedHeight = 260
    const estimatedWidth = 280
    const top = anchorRect.bottom + window.scrollY + 6
    const left = Math.min(
      anchorRect.left + window.scrollX,
      window.innerWidth - estimatedWidth - 12,
    )
    style.top = top + estimatedHeight > window.innerHeight
      ? anchorRect.top + window.scrollY - estimatedHeight - 6
      : top
    style.left = Math.max(12, left)
  } else {
    style.top = "50%"
    style.left = "50%"
    style.transform = "translate(-50%, -50%)"
  }

  return (
    <div
      ref={popoverRef}
      style={style}
      className="w-[280px] rounded-[1.25rem] border border-[#E8E6E0] bg-white p-4 shadow-apple-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-[#2F4F4F]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2F4F4F]">Color del día</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-[#6B7280] transition hover:bg-[#F8F7F4]"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-5 gap-2">
        {palette.map((entry) => {
          const isCurrent = currentColor?.color?.toLowerCase() === entry.value.toLowerCase()
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => handlePick(entry.value)}
              disabled={saving}
              title={entry.label}
              className={cn(
                "group relative flex h-10 items-center justify-center rounded-xl border-2 transition hover:scale-105",
                isCurrent ? "border-[#2F4F4F]" : "border-transparent hover:border-[#E8E6E0]",
              )}
              style={{ backgroundColor: entry.value }}
            >
              <span className="sr-only">{entry.label}</span>
              {isCurrent ? (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#2F4F4F] shadow-apple-sm">
                  ✓
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mb-3">
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
            Nota (opcional)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Visita importante"
            className="h-8 w-full rounded-lg border border-[#E8E6E0] bg-[#F8F7F4] px-2 text-xs text-[#2F4F4F] placeholder:text-[#9CA3AF] focus:border-[#2F4F4F] focus:outline-none focus:ring-2 focus:ring-[#2F4F4F]/20"
          />
        </label>
      </div>

      {currentColor ? (
        <Button
          type="button"
          onClick={handleClear}
          variant="outline"
          size="sm"
          disabled={saving}
          className="w-full rounded-full border-[#FCA5A5] text-xs font-semibold text-[#B91C1C] hover:border-[#DC2626] hover:text-[#DC2626]"
        >
          {saving ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 h-3 w-3" />
          )}
          Quitar color
        </Button>
      ) : null}
    </div>
  )
}
