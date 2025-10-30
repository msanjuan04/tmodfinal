"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createProjectEvent, deleteProjectEvent, updateProjectEvent } from "@app/lib/api/events"
import type { ProjectEvent, ProjectEventWriteInput } from "@app/types/events"
import { Plus, Trash2, Calendar } from "lucide-react"

interface EventFormModalProps {
  projectId: string
  event?: ProjectEvent
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function EventFormModal({ projectId, event, trigger, onSuccess }: EventFormModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [formData, setFormData] = useState<ProjectEventWriteInput>({
    projectId,
    title: event?.title ?? "",
    description: event?.description ?? "",
    eventType: event?.eventType ?? "general",
    startsAt: event?.startsAt ? format(new Date(event.startsAt), "yyyy-MM-dd'T'HH:mm") : "",
    endsAt: event?.endsAt ? format(new Date(event.endsAt), "yyyy-MM-dd'T'HH:mm") : null,
    isAllDay: event?.isAllDay ?? false,
    visibility: event?.visibility ?? "client_visible",
  })

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
    
    if (confirm("¿Estás seguro de que quieres eliminar este evento?")) {
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
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Nuevo evento
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? "Editar evento" : "Crear evento"}
          </SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título del evento</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Visita de obra, Entrega de materiales..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description ?? ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalles adicionales del evento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventType">Tipo de evento</Label>
            <select
              id="eventType"
              value={formData.eventType}
              onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="general">General</option>
              <option value="visita_obra">Visita de obra</option>
              <option value="logistica">Logística</option>
              <option value="administrativo">Administrativo</option>
              <option value="interno">Interno</option>
              <option value="entrega">Entrega</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startsAt">Fecha y hora de inicio</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endsAt">Fecha y hora de fin (opcional)</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAtValue}
              onChange={(e) => setFormData(prev => ({ ...prev, endsAt: e.target.value || null }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData(prev => ({ ...prev, isAllDay: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isAllDay">Evento de todo el día</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilidad</Label>
            <select
              id="visibility"
              value={formData.visibility}
              onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as "client_visible" | "internal" }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="client_visible">Visible para cliente</option>
              <option value="internal">Solo equipo interno</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando..." : isEditing ? "Actualizar evento" : "Crear evento"}
            </Button>
            
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
