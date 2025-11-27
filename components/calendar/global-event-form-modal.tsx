"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createProjectEvent } from "@app/lib/api/events"
import type { ProjectCalendarSummary, ProjectEventWriteInput } from "@app/types/events"
import { Calendar, Plus } from "lucide-react"

interface GlobalEventFormModalProps {
  projects: ProjectCalendarSummary[]
  trigger?: React.ReactNode
  defaultDate?: Date
  onSuccess?: () => void
}

export function GlobalEventFormModal({ projects, trigger, defaultDate, onSuccess }: GlobalEventFormModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const initialProjectId = projects[0]?.id

  const [formData, setFormData] = useState<ProjectEventWriteInput>(() => ({
    projectId: initialProjectId ?? "",
    title: "",
    description: "",
    eventType: "general",
    startsAt: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : "",
    endsAt: null,
    isAllDay: false,
    visibility: "client_visible",
  }))

  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current && defaultDate) {
      setFormData((prev) => ({
        ...prev,
        startsAt: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
      }))
    }
    wasOpenRef.current = isOpen
  }, [isOpen, defaultDate])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(() => {
      void (async () => {
        try {
          await createProjectEvent(formData)
          setIsOpen(false)
          onSuccess?.()
        } catch (error) {
          console.error("Error creating global event:", error)
        }
      })()
    })
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Añadir tarea
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[560px] border-none bg-white/95 p-0 sm:rounded-[1.75rem] sm:shadow-apple-xl"
      >
        <SheetHeader>
          <div className="flex items-center gap-2 rounded-t-[1.75rem] border-b border-[#E8E6E0] bg-[#F8F7F4]/70 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-apple-md">
              <Calendar className="h-5 w-5 text-[#0D9488]" />
            </div>
            <SheetTitle className="font-heading text-lg font-semibold text-[#2F4F4F]">
              Nueva tarea en proyecto
            </SheetTitle>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-5 pt-4">
          <div className="space-y-4 rounded-[1.5rem] border border-[#E8E6E0] bg-[#F8F7F4] p-5 shadow-apple-md">
            <div className="space-y-2">
              <Label htmlFor="global-project">Proyecto</Label>
              <select
                id="global-project"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.projectId}
                onChange={(e) => setFormData((prev) => ({ ...prev, projectId: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Selecciona un proyecto…
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.clientName ? `${project.name} · ${project.clientName}` : project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-title">Título</Label>
              <Input
                id="global-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Visita de obra, Reunión interna…"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-description">Descripción (opcional)</Label>
              <Textarea
                id="global-description"
                value={formData.description ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Detalles adicionales…"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-event-type">Tipo</Label>
              <select
                id="global-event-type"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.eventType}
                onChange={(e) => setFormData((prev) => ({ ...prev, eventType: e.target.value }))}
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
              <Label htmlFor="global-startsAt">Fecha y hora de inicio</Label>
              <Input
                id="global-startsAt"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, startsAt: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-endsAt">Fecha y hora de fin (opcional)</Label>
              <Input
                id="global-endsAt"
                type="datetime-local"
                value={formData.endsAt ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, endsAt: e.target.value || null }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="global-isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, isAllDay: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="global-isAllDay">Evento de todo el día</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-visibility">Visibilidad</Label>
              <select
                id="global-visibility"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.visibility}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, visibility: e.target.value as "client_visible" | "internal" }))
                }
              >
                <option value="client_visible">Visible para cliente</option>
                <option value="internal">Solo equipo interno</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={pending || !formData.projectId}
              className="flex-1 rounded-full bg-[#0D9488] text-white shadow-apple-md hover:bg-[#0B766C]"
            >
              {pending ? "Guardando..." : "Crear tarea"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}


