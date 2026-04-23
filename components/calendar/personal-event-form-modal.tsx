"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"
import { CalendarClock, CalendarDays, FileText, Plus, Tag, User } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  createPersonalEvent,
  deletePersonalEvent,
  type PersonalEvent,
  type PersonalEventWriteInput,
  updatePersonalEvent,
} from "@app/lib/api/events"

import {
  CalendarCheckboxRow,
  CalendarField,
  CalendarFormFooter,
  CalendarFormHeader,
  CalendarFormSection,
  CALENDAR_INPUT_CLASS,
  CALENDAR_TEXTAREA_CLASS,
} from "./calendar-form-primitives"

interface PersonalEventFormModalProps {
  event?: PersonalEvent
  trigger?: React.ReactNode
  onSuccess?: () => void
  defaultDate?: Date
}

export function PersonalEventFormModal({ event, trigger, onSuccess, defaultDate }: PersonalEventFormModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [formData, setFormData] = useState<PersonalEventWriteInput>(() => {
    const baseStart = event?.startsAt ? new Date(event.startsAt) : defaultDate
    return {
      title: event?.title ?? "",
      description: event?.description ?? "",
      eventType: event?.eventType ?? "personal",
      startsAt: baseStart ? format(baseStart, "yyyy-MM-dd'T'HH:mm") : "",
      endsAt: event?.endsAt ? format(new Date(event.endsAt), "yyyy-MM-dd'T'HH:mm") : null,
      isAllDay: event?.isAllDay ?? false,
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
            await updatePersonalEvent(event.id, formData)
          } else {
            await createPersonalEvent(formData)
          }
          setIsOpen(false)
          onSuccess?.()
        } catch (error) {
          console.error("Error saving personal event:", error)
        }
      })()
    })
  }

  const handleDelete = () => {
    if (!event) return
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea personal?")) return
    startTransition(() => {
      void (async () => {
        try {
          await deletePersonalEvent(event.id)
          setIsOpen(false)
          onSuccess?.()
        } catch (error) {
          console.error("Error deleting personal event:", error)
        }
      })()
    })
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Nueva tarea personal
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <CalendarFormHeader
            icon={User}
            overline="Mi agenda"
            title={isEditing ? event?.title ?? "Tarea personal" : "Nueva tarea personal"}
            description={
              isEditing
                ? "Solo tú ves esta tarea. Cambios se guardan en tu agenda personal."
                : "Añade un bloque personal, recordatorio o reunión interna. No es visible para ningún cliente."
            }
          />

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
            <CalendarFormSection title="Información" icon={FileText}>
              <CalendarField label="Título" required>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Llamar a proveedor, revisar contrato…"
                  required
                  className={CALENDAR_INPUT_CLASS}
                />
              </CalendarField>
              <CalendarField label="Descripción (opcional)">
                <Textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles adicionales de la tarea…"
                  rows={3}
                  className={CALENDAR_TEXTAREA_CLASS}
                />
              </CalendarField>
            </CalendarFormSection>

            <CalendarFormSection title="Tipo" icon={Tag}>
              <CalendarField label="Tipo de tarea">
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, eventType: e.target.value }))}
                  className={CALENDAR_INPUT_CLASS}
                >
                  <option value="personal">Personal</option>
                  <option value="foco">Bloque de foco</option>
                  <option value="reunion">Reunión interna</option>
                  <option value="recordatorio">Recordatorio</option>
                </select>
              </CalendarField>
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
                title="Tarea de todo el día"
                description="Reserva el día completo sin una hora concreta."
              />
            </CalendarFormSection>

            <CalendarFormFooter
              onCancel={() => setIsOpen(false)}
              submitting={pending}
              isEditing={isEditing}
              createLabel="Crear tarea"
              updateLabel="Guardar cambios"
              onDelete={isEditing ? handleDelete : undefined}
            />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
