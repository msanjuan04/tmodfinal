"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { AlertTriangle, Archive, Loader2, PlayCircle } from "lucide-react"
import { toast } from "sonner"
import axios from "axios"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { finalizeAdminProject, reactivateAdminProject } from "@app/lib/api/admin"
import { cn } from "@/lib/utils"

interface BaseDialogProps {
  projectId: string
  projectName: string
  /** Trigger para uso no controlado. Si pasas `open`/`onOpenChange`, el trigger es opcional. */
  trigger?: ReactNode
  onDone?: () => void
  /** Modo controlado: controla el open/close desde fuera (útil desde un DropdownMenuItem). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Normaliza igual que el backend: colapsa espacios, trim, uppercase.
 * Así lo que escribe el usuario y lo esperado se comparan de forma determinista.
 */
function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase()
}

// ===========================================================================
//  FinalizeProjectDialog
// ===========================================================================

export function FinalizeProjectDialog({
  projectId,
  projectName,
  trigger,
  onDone,
  open: controlledOpen,
  onOpenChange,
}: BaseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [confirmText, setConfirmText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setConfirmText("")
      setSubmitting(false)
    }
  }, [open])

  const expected = normalize(`FINALIZAR ${projectName}`)
  const provided = normalize(confirmText)
  const matches = provided === expected

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !matches) return

    setSubmitting(true)
    try {
      await finalizeAdminProject(projectId, confirmText)
      toast.success("Proyecto finalizado correctamente")
      setOpen(false)
      onDone?.()
    } catch (error) {
      console.error("Error finalizando proyecto", error)
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error(error.response.data?.message ?? "La confirmación no coincide")
      } else {
        toast.error("No se pudo finalizar el proyecto. Revisa la conexión.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <SheetHeader className="border-b border-[#E8E6E0] bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#B91C1C]">Finalizar proyecto</p>
            </div>
            <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
              {projectName}
            </SheetTitle>
            <SheetDescription className="text-sm text-[#6B7280]">
              El proyecto pasará al estado <strong>Cierre</strong> y dejará de aparecer en la lista de proyectos en curso.
              Podrás reactivarlo más tarde desde la pestaña "Finalizados".
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
            <div className="rounded-[1.25rem] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
              <p className="font-semibold">Acción sensible</p>
              <p className="mt-1 text-xs text-[#B91C1C]">
                Para confirmar, escribe exactamente el texto siguiente en el campo. Esto ayuda a
                evitar finalizar un proyecto por accidente.
              </p>
            </div>

            <div className="space-y-2">
              <div className="rounded-[1rem] border border-[#E8E6E0] bg-white px-3 py-2 font-mono text-sm text-[#2F4F4F]">
                FINALIZAR {projectName}
              </div>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`FINALIZAR ${projectName}`}
                autoFocus
                className={cn(
                  "h-11 rounded-[1rem] border-[#E8E6E0] bg-white font-mono",
                  provided.length > 0 && matches && "border-[#047857] focus-visible:ring-[#047857]",
                  provided.length > 0 && !matches && "border-[#FCA5A5]",
                )}
              />
              {provided.length > 0 && !matches ? (
                <p className="text-xs text-[#B91C1C]">El texto debe coincidir exactamente (no importa mayúsculas/minúsculas).</p>
              ) : null}
              {matches ? (
                <p className="text-xs font-semibold text-[#047857]">✓ Confirmación válida</p>
              ) : null}
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex justify-end gap-2 border-t border-[#E8E6E0] bg-white px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-full border-[#E8E6E0] px-4 text-sm font-medium text-[#4B5563]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!matches || submitting}
                className={cn(
                  "rounded-full px-5 text-sm font-semibold text-white",
                  matches ? "bg-[#B91C1C] hover:bg-[#991B1B]" : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando…
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" /> Finalizar proyecto
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ===========================================================================
//  ReactivateProjectDialog
// ===========================================================================

const REACTIVATE_STATUSES = [
  { value: "obra_ejecucion" as const, label: "Obra/Ejecución" },
  { value: "planificacion" as const, label: "Planificación" },
  { value: "presupuesto" as const, label: "Presupuesto" },
  { value: "diseno" as const, label: "Diseño" },
  { value: "inicial" as const, label: "Inicial" },
]

type ReactivateStatus = (typeof REACTIVATE_STATUSES)[number]["value"]

export function ReactivateProjectDialog({
  projectId,
  projectName,
  trigger,
  onDone,
  open: controlledOpen,
  onOpenChange,
}: BaseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [confirmText, setConfirmText] = useState("")
  const [newStatus, setNewStatus] = useState<ReactivateStatus>("obra_ejecucion")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setConfirmText("")
      setSubmitting(false)
      setNewStatus("obra_ejecucion")
    }
  }, [open])

  const expected = normalize(`REACTIVAR ${projectName}`)
  const provided = normalize(confirmText)
  const matches = provided === expected

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !matches) return

    setSubmitting(true)
    try {
      await reactivateAdminProject(projectId, confirmText, newStatus)
      toast.success("Proyecto reactivado correctamente")
      setOpen(false)
      onDone?.()
    } catch (error) {
      console.error("Error reactivando proyecto", error)
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error(error.response.data?.message ?? "La confirmación no coincide")
      } else {
        toast.error("No se pudo reactivar el proyecto. Revisa la conexión.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <SheetHeader className="border-b border-[#E8E6E0] bg-white px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCFCE7] text-[#047857]">
                <PlayCircle className="h-4 w-4" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#047857]">Reactivar proyecto</p>
            </div>
            <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
              {projectName}
            </SheetTitle>
            <SheetDescription className="text-sm text-[#6B7280]">
              El proyecto volverá a la lista de proyectos en curso con el estado que elijas.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2F4F4F]">Nuevo estado</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ReactivateStatus)}
                className="h-11 w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
              >
                {REACTIVATE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6B7280]">
                Normalmente querrás volver a <strong>Obra/Ejecución</strong>, pero puedes elegir cualquier estado no-final.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2F4F4F]">Confirmación</label>
              <div className="rounded-[1rem] border border-[#E8E6E0] bg-white px-3 py-2 font-mono text-sm text-[#2F4F4F]">
                REACTIVAR {projectName}
              </div>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`REACTIVAR ${projectName}`}
                autoFocus
                className={cn(
                  "h-11 rounded-[1rem] border-[#E8E6E0] bg-white font-mono",
                  provided.length > 0 && matches && "border-[#047857] focus-visible:ring-[#047857]",
                  provided.length > 0 && !matches && "border-[#FCA5A5]",
                )}
              />
              {provided.length > 0 && !matches ? (
                <p className="text-xs text-[#B91C1C]">El texto debe coincidir exactamente.</p>
              ) : null}
              {matches ? (
                <p className="text-xs font-semibold text-[#047857]">✓ Confirmación válida</p>
              ) : null}
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex justify-end gap-2 border-t border-[#E8E6E0] bg-white px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-full border-[#E8E6E0] px-4 text-sm font-medium text-[#4B5563]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!matches || submitting}
                className={cn(
                  "rounded-full px-5 text-sm font-semibold text-white",
                  matches ? "bg-[#047857] hover:bg-[#065F46]" : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reactivando…
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" /> Reactivar proyecto
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
