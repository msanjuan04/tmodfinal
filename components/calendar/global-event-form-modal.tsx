"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { format } from "date-fns"
import { Briefcase, CalendarClock, CalendarDays, Eye, FileText, Plus, Tag } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { createProjectEvent } from "@app/lib/api/events"
import type { ProjectCalendarSummary, ProjectEventWriteInput } from "@app/types/events"

import {
  CalendarCheckboxRow,
  CalendarField,
  CalendarFormFooter,
  CalendarFormHeader,
  CalendarFormSection,
  CALENDAR_INPUT_CLASS,
  CALENDAR_TEXTAREA_CLASS,
} from "./calendar-form-primitives"

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
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <CalendarFormHeader
            icon={CalendarDays}
            overline="Calendario global"
            title="Nueva tarea en proyecto"
            description="Añade un evento, visita, entrega o reunión asociada a uno de tus proyectos."
          />

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
            <CalendarFormSection title="Proyecto y detalles" icon={Briefcase}>
              <CalendarField label="Proyecto" required>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, projectId: e.target.value }))}
                  required
                  className={CALENDAR_INPUT_CLASS}
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
              </CalendarField>

              <CalendarField label="Título" required>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Visita de obra, Reunión interna…"
                  required
                  className={CALENDAR_INPUT_CLASS}
                />
              </CalendarField>

              <CalendarField label="Descripción (opcional)">
                <Textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles adicionales…"
                  rows={3}
                  className={CALENDAR_TEXTAREA_CLASS}
                />
              </CalendarField>
            </CalendarFormSection>

            <CalendarFormSection title="Tipo y visibilidad" icon={Tag}>
              <div className="grid gap-3 sm:grid-cols-2">
                <CalendarField label="Tipo">
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, eventType: e.target.value }))}
                    className={CALENDAR_INPUT_CLASS}
                  >
                    <option value="general">General</option>
                    <option value="visita_obra">Visita de obra</option>
                    <option value="logistica">Logística</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="interno">Interno</option>
                    <option value="entrega">Entrega</option>
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
                    value={formData.endsAt ?? ""}
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
                description="Ignora la hora y marca el evento como reserva de día completo."
              />
            </CalendarFormSection>

            <CalendarFormFooter
              onCancel={() => setIsOpen(false)}
              submitting={pending}
              isEditing={false}
              createLabel="Crear tarea"
            />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
