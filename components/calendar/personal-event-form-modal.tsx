"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  createPersonalEvent,
  deletePersonalEvent,
  type PersonalEvent,
  type PersonalEventWriteInput,
  updatePersonalEvent,
} from "@app/lib/api/events"
import { Calendar, Plus, Trash2 } from "lucide-react"

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

    if (confirm("¿Estás seguro de que quieres eliminar esta tarea personal?")) {
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
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Nueva tarea personal
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? "Editar tarea personal" : "Crear tarea personal"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="personal-title">Título de la tarea</Label>
            <Input
              id="personal-title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Llamar a proveedor, revisar contrato..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-description">Descripción (opcional)</Label>
            <Textarea
              id="personal-description"
              value={formData.description ?? ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Detalles adicionales de la tarea..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-type">Tipo de tarea</Label>
            <select
              id="personal-type"
              value={formData.eventType}
              onChange={(e) => setFormData((prev) => ({ ...prev, eventType: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="personal">Personal</option>
              <option value="foco">Bloque de foco</option>
              <option value="reunion">Reunión interna</option>
              <option value="recordatorio">Recordatorio</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-startsAt">Fecha y hora de inicio</Label>
            <Input
              id="personal-startsAt"
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, startsAt: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal-endsAt">Fecha y hora de fin (opcional)</Label>
            <Input
              id="personal-endsAt"
              type="datetime-local"
              value={endsAtValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, endsAt: e.target.value || null }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="personal-isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData((prev) => ({ ...prev, isAllDay: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="personal-isAllDay">Tarea de todo el día</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando..." : isEditing ? "Actualizar tarea" : "Crear tarea"}
            </Button>

            {isEditing && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}


