"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"
import { CalendarClock, CalendarDays, FileText, Plus, Tag } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { createProjectEvent, deleteProjectEvent, updateProjectEvent } from "@app/lib/api/events"
import type { ProjectEvent, ProjectEventWriteInput } from "@app/types/events"

import {
  CalendarCheckboxRow,
  CalendarField,
  CalendarFormFooter,
  CalendarFormHeader,
  CalendarFormSection,
  CALENDAR_INPUT_CLASS,
  CALENDAR_TEXTAREA_CLASS,
} from "./calendar-form-primitives"

interface EventFormModalProps {
  projectId: string
  event?: ProjectEvent
  trigger?: React.ReactNode
  onSuccess?: () => void
  defaultDate?: Date
}

export function EventFormModal({ projectId, event, trigger, onSuccess, defaultDate }: EventFormModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [formData, setFormData] = useState<ProjectEventWriteInput>(() => {
    const baseStart = event?.startsAt ? new Date(event.startsAt) : defaultDate
    return {
      projectId,
      title: event?.title ?? "",
      description: event?.description ?? "",
      eventType: event?.eventType ?? "general",
      startsAt: baseStart ? format(baseStart, "yyyy-MM-dd'T'HH:mm") : "",
      endsAt: event?.endsAt ? format(new Date(event.endsAt), "yyyy-MM-dd'T'HH:mm") : null,
      isAllDay: event?.isAllDay ?? false,
      visibility: event?.visibility ?? "client_visible",
    }
  })

  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!event && isOpen && !wasOpenRef.current && defaultDate) {
      setFormData((prev) => ({
        ...prev,
        startsAt: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
      }))
    }
    wasOpenRef.current = isOpen
  }, [isOpen, event, defaultDate])

  const isEditing = Boolean(event)
  const endsAtValue = formData.endsAt ?? ""

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(() => {
      void (async () => {
        try {
          if (isEditing && event) {
            await updateProjectEvent(event.id, formData)
          } else {
            await createProjectEvent(formData)
          }
          setIsOpen(false)
          onSuccess?.()
        } catch (error) {
          console.error("Error saving event:", error)
        }
      })()
    })
  }

  const handleDelete = () => {
    if (!event) return
    if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) return
    startTransition(() => {
      void (async () => {
        try {
          await deleteProjectEvent(event.id)
          setIsOpen(false)
          onSuccess?.()
        } catch (error) {
          console.error("Error deleting event:", error)
        }
      })()
    })
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Nuevo evento
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <CalendarFormHeader
            icon={CalendarDays}
            overline={isEditing ? "Editar evento" : "Calendario de proyecto"}
            title={isEditing ? event?.title ?? "Evento" : "Nuevo evento"}
            description={
              isEditing
                ? "Modifica los datos del evento. Los cambios se sincronizan con el cliente si es visible."
                : "Añade una visita, entrega, reunión o nota interna para este proyecto."
            }
          />

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
            <CalendarFormSection title="Información" icon={FileText}>
              <CalendarField label="Título" required>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Visita de obra, Entrega de materiales…"
                  required
                  className={CALENDAR_INPUT_CLASS}
                />
              </CalendarField>
              <CalendarField label="Descripción (opcional)">
                <Textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles adicionales del evento…"
                  rows={3}
                  className={CALENDAR_TEXTAREA_CLASS}
                />
              </CalendarField>
            </CalendarFormSection>

            <CalendarFormSection title="Tipo y visibilidad" icon={Tag}>
              <div className="grid gap-3 sm:grid-cols-2">
                <CalendarField label="Tipo de evento">
                  <select
                    value={formData.eventType}
                    onChange={(e) =>
                      setFormData((prev) => {
                        const nextType = e.target.value
                        if (nextType === "nota_interna" && prev.visibility !== "internal") {
                          return { ...prev, eventType: nextType, visibility: "internal" }
                        }
                        return { ...prev, eventType: nextType }
                      })
                    }
                    className={CALENDAR_INPUT_CLASS}
                  >
                    <option value="general">General</option>
                    <option value="visita_obra">Visita de obra</option>
                    <option value="logistica">Logística</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="interno">Interno</option>
                    <option value="entrega">Entrega</option>
                    <option value="nota_interna">Nota interna (solo equipo)</option>
                  </select>
                </CalendarField>
                <CalendarField label="Visibilidad">
                  <select
                    value={formData.visibility}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        visibility: e.target.value as "client_visible" | "internal",
                      }))
                    }
                    className={CALENDAR_INPUT_CLASS}
                  >
                    <option value="client_visible">Visible para cliente</option>
                    <option value="internal">Solo equipo interno</option>
                  </select>
                </CalendarField>
              </div>
            </CalendarFormSection>

            <CalendarFormSection title="Fechas y hora" icon={CalendarClock}>
              <div className="grid gap-3 sm:grid-cols-2">
                <CalendarField label="Inicio" required>
                  <Input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startsAt: e.target.value }))}
                    required
                    className={CALENDAR_INPUT_CLASS}
                  />
                </CalendarField>
                <CalendarField label="Fin (opcional)">
                  <Input
                    type="datetime-local"
                    value={endsAtValue}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endsAt: e.target.value || null }))
                    }
                    className={CALENDAR_INPUT_CLASS}
                  />
                </CalendarField>
              </div>
              <CalendarCheckboxRow
                checked={Boolean(formData.isAllDay)}
                onChange={(value) => setFormData((prev) => ({ ...prev, isAllDay: value }))}
                icon={<CalendarDays className="h-4 w-4 text-[#2F4F4F]" />}
                title="Evento de todo el día"
                description="Reserva el día completo sin hora específica."
              />
            </CalendarFormSection>

            <CalendarFormFooter
              onCancel={() => setIsOpen(false)}
              submitting={pending}
              isEditing={isEditing}
              createLabel="Crear evento"
              updateLabel="Guardar cambios"
              onDelete={isEditing ? handleDelete : undefined}
            />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
