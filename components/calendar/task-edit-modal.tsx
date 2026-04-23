"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { CalendarClock, Flag, Loader2, Save } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { AdminProjectTask, AdminProjectTeamMember } from "@app/types/admin"
import {
  fetchAdminProjectTask,
  fetchAdminProjectTasks,
  fetchAdminTaskFromCalendarEvent,
  fetchAdminTeamMembers,
  updateAdminProjectTask,
} from "@app/lib/api/admin"
import { PROJECT_TASK_STATUSES, type ProjectTaskStatus } from "@/types/project-tasks"

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "Pendiente",
  in_progress: "En curso",
  blocked: "Bloqueada",
  review: "Revisión",
  done: "Hecho",
}

interface TaskEditModalProps {
  /** Identificación directa de la tarea */
  projectId?: string
  taskId?: string
  /** Alternativa: resolver la tarea desde un eventId del calendario */
  eventId?: string
  /** Si quieres prerrellenar sin hacer GET de nuevo. */
  initialTask?: AdminProjectTask
  /** Disparador; debe aceptar asChild */
  trigger: ReactNode
  onSaved?: (task: AdminProjectTask) => void
  onDeleted?: () => void
}

interface FormState {
  title: string
  description: string
  status: ProjectTaskStatus
  weight: number
  assigneeId: string
  startDate: string
  dueDate: string
  isMilestone: boolean
  showInCalendar: boolean
}

function toFormState(task: AdminProjectTask): FormState {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    status: (task.status as ProjectTaskStatus) ?? "todo",
    weight: typeof task.weight === "number" && !Number.isNaN(task.weight) ? task.weight : 1,
    assigneeId: task.assigneeId ?? "",
    startDate: task.startDate ?? "",
    dueDate: task.dueDate ?? "",
    isMilestone: task.isMilestone ?? false,
    showInCalendar: task.showInCalendar ?? true,
  }
}

export function TaskEditModal({
  projectId: initialProjectId,
  taskId: initialTaskId,
  eventId,
  initialTask,
  trigger,
  onSaved,
}: TaskEditModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<AdminProjectTask | null>(initialTask ?? null)
  // Estos pueden resolverse dinámicamente si se usa eventId
  const [projectId, setProjectId] = useState<string | undefined>(
    initialProjectId ?? initialTask?.projectId,
  )
  const [taskId, setTaskId] = useState<string | undefined>(initialTaskId ?? initialTask?.id)
  const [form, setForm] = useState<FormState>(() =>
    initialTask ? toFormState(initialTask) : {
      title: "",
      description: "",
      status: "todo",
      weight: 1,
      assigneeId: "",
      startDate: "",
      dueDate: "",
      isMilestone: false,
      showInCalendar: true,
    },
  )
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([])

  // Al abrir, cargamos la tarea fresca de la BD (siempre datos actualizados)
  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // Resolver projectId + taskId
        let resolvedProjectId = initialProjectId ?? initialTask?.projectId
        let resolvedTaskId = initialTaskId ?? initialTask?.id
        let freshTask: AdminProjectTask | null = null

        if (!resolvedTaskId && eventId) {
          freshTask = await fetchAdminTaskFromCalendarEvent(eventId)
          if (!freshTask) {
            if (!cancelled) setError("Este evento no está vinculado a una tarea del proyecto.")
            return
          }
          resolvedProjectId = freshTask.projectId
          resolvedTaskId = freshTask.id
        }

        if (!resolvedProjectId || !resolvedTaskId) {
          if (!cancelled) setError("Faltan datos para cargar la tarea.")
          return
        }

        if (!freshTask) {
          freshTask = await fetchAdminProjectTask(resolvedProjectId, resolvedTaskId)
        }

        if (cancelled) return
        setProjectId(resolvedProjectId)
        setTaskId(resolvedTaskId)
        setTask(freshTask)
        setForm(toFormState(freshTask))

        // Cargar miembros de equipo (no bloqueante)
        const [members, tasksList] = await Promise.all([
          fetchAdminTeamMembers().catch(() => [] as AdminProjectTeamMember[]),
          fetchAdminProjectTasks(resolvedProjectId).catch(() => null),
        ])
        const memberMap = new Map<string, string>()
        members.forEach((m) => memberMap.set(m.id, m.name ?? "Responsable"))
        tasksList?.assignees.forEach((a) => {
          if (!memberMap.has(a.id)) memberMap.set(a.id, a.name)
        })
        if (freshTask.assigneeId && freshTask.assigneeName && !memberMap.has(freshTask.assigneeId)) {
          memberMap.set(freshTask.assigneeId, freshTask.assigneeName)
        }
        if (!cancelled) {
          setAssignees(Array.from(memberMap.entries()).map(([id, name]) => ({ id, name })))
        }
      } catch (err) {
        console.error("No se pudo cargar la tarea", err)
        if (!cancelled) setError("No se pudo cargar la tarea. Intenta cerrar y abrir de nuevo.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, initialProjectId, initialTaskId, eventId, initialTask])

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    if (!projectId || !taskId) {
      toast.error("No se ha podido resolver la tarea")
      return
    }

    if (!form.title.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    setSaving(true)
    try {
      await updateAdminProjectTask(projectId, taskId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        weight: Number(form.weight) || 1,
        assigneeId: form.assigneeId ? form.assigneeId : null,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
        isMilestone: form.isMilestone,
        showInCalendar: form.showInCalendar,
      })
      toast.success("Cambios guardados")

      // Refrescamos la tarea para asegurar que el estado local refleja la BD
      const fresh = await fetchAdminProjectTask(projectId, taskId).catch(() => null)
      if (fresh) {
        setTask(fresh)
        setForm(toFormState(fresh))
        onSaved?.(fresh)
      } else if (task) {
        onSaved?.({
          ...task,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          weight: Number(form.weight) || 1,
          assigneeId: form.assigneeId || null,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          isMilestone: form.isMilestone,
          showInCalendar: form.showInCalendar,
        })
      }
      setOpen(false)
    } catch (err) {
      console.error("Error guardando la tarea", err)
      toast.error("No se pudo guardar. Revisa la conexión.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex h-full flex-col bg-[#F8F7F4]">
          <SheetHeader className="border-b border-[#E8E6E0] bg-white px-6 py-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C6B89E]">Editar tarea</p>
            <SheetTitle className="font-heading text-2xl text-[#2F4F4F]">
              {task?.title ?? form.title ?? "Tarea"}
            </SheetTitle>
            <SheetDescription className="text-sm text-[#6B7280]">
              Los cambios se guardan en la base de datos y se sincronizan con el calendario.
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-12 text-sm text-[#6B7280]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando tarea…
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#B91C1C]">{error}</div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-6 py-6">
              <Section title="Información principal" subtitle="Describe la tarea para que el equipo la identifique rápido.">
                <Field label="Título" required>
                  <Input
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="h-11 rounded-[1rem] border-[#E8E6E0] bg-white"
                    required
                  />
                </Field>
                <Field label="Descripción">
                  <Textarea
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                    className="min-h-[96px] rounded-[1rem] border-[#E8E6E0] bg-white"
                  />
                </Field>
              </Section>

              <Section title="Seguimiento" subtitle="Estado, fechas y responsable.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Estado">
                    <select
                      value={form.status}
                      onChange={(e) => handleChange("status", e.target.value as ProjectTaskStatus)}
                      className="h-11 w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                    >
                      {PROJECT_TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Peso">
                    <Input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={form.weight}
                      onChange={(e) => handleChange("weight", Number(e.target.value))}
                      className="h-11 rounded-[1rem] border-[#E8E6E0] bg-white"
                    />
                  </Field>
                  <Field label="Inicio">
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      className="h-11 rounded-[1rem] border-[#E8E6E0] bg-white"
                    />
                  </Field>
                  <Field label="Fecha límite">
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => handleChange("dueDate", e.target.value)}
                      className="h-11 rounded-[1rem] border-[#E8E6E0] bg-white"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Responsable">
                      <select
                        value={form.assigneeId}
                        onChange={(e) => handleChange("assigneeId", e.target.value)}
                        className="h-11 w-full rounded-[1rem] border border-[#E8E6E0] bg-white px-3 text-sm text-[#2F4F4F]"
                      >
                        <option value="">Sin responsable</option>
                        {assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </Section>

              <Section title="Visibilidad" subtitle="Controla si es un hito y si aparece en el calendario.">
                <CheckboxRow
                  checked={form.isMilestone}
                  onChange={(value) => handleChange("isMilestone", value)}
                  icon={<Flag className="h-4 w-4 text-[#B45309]" />}
                  title="Marcar como hito"
                  description="Los hitos se destacan en el calendario con un estilo ámbar."
                />
                <CheckboxRow
                  checked={form.showInCalendar}
                  onChange={(value) => handleChange("showInCalendar", value)}
                  icon={<CalendarClock className="h-4 w-4 text-[#2F4F4F]" />}
                  title="Mostrar en el calendario"
                  description="Si lo desactivas, la tarea solo será visible dentro del proyecto."
                />
              </Section>

              <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-[#E8E6E0] bg-white px-6 py-4">
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
                  disabled={saving}
                  className="rounded-full bg-[#2F4F4F] px-5 text-sm font-semibold text-white hover:bg-[#1F3535]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border border-[#E8E6E0] bg-white p-4 shadow-apple-sm">
      <div>
        <h4 className="font-heading text-sm font-semibold text-[#2F4F4F]">{title}</h4>
        {subtitle ? <p className="text-xs text-[#6B7280]">{subtitle}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#2F4F4F]">
        {label}
        {required ? <span className="ml-0.5 text-[#B91C1C]">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function CheckboxRow({
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
  description: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[1.25rem] border p-3 transition",
        checked ? "border-[#2F4F4F]/40 bg-[#F4F1EA]" : "border-[#E8E6E0] bg-[#FAFAF8] hover:border-[#2F4F4F]/40",
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
        <span className="block text-xs text-[#6B7280]">{description}</span>
      </div>
    </label>
  )
}
