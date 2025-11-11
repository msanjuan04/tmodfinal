"use client"

import type React from "react"
import { useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import type { ProjectCalendarSummary } from "@app/types/events"

interface AdminProjectPickerProps {
  projects: ProjectCalendarSummary[]
  activeSlug: string | null
  allowGlobalOption?: boolean
}

export function AdminProjectPicker({ projects, activeSlug, allowGlobalOption = false }: AdminProjectPickerProps) {
  const searchParams = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const baseOptions = useMemo(
    () =>
      projects.map((project) => ({
        label: project.clientName ? `${project.name} · ${project.clientName}` : project.name,
        value: project.slug,
      })),
    [projects],
  )

  const options = useMemo(() => {
    if (!allowGlobalOption) return baseOptions
    return [
      {
        label: "Calendario global Terrazea",
        value: "",
      },
      ...baseOptions,
    ]
  }, [allowGlobalOption, baseOptions])

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const slug = event.target.value
    const next = new URLSearchParams(searchParams.toString())
    if (slug) {
      next.set("project", slug)
    } else {
      next.delete("project")
    }
    const nextUrl = next.size > 0 ? `${location.pathname}?${next.toString()}` : location.pathname
    navigate(nextUrl)
  }

  if (options.length === 0) {
    return (
      <div className="rounded-full border border-dashed border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-sm text-[#6B7280]">
        Aún no hay proyectos activos
      </div>
    )
  }

  const effectiveValueCandidate = activeSlug ?? ""
  const effectiveValue = options.some((option) => option.value === effectiveValueCandidate)
    ? effectiveValueCandidate
    : options[0]?.value ?? ""

  return (
    <label className="flex flex-col gap-1 text-sm text-[#2F4F4F]">
      <span className="text-xs uppercase tracking-[0.35em] text-[#C6B89E]">Proyecto</span>
      <select
        className="rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-2 text-sm font-medium text-[#2F4F4F] outline-none transition focus:border-[#2F4F4F]"
        value={effectiveValue}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
