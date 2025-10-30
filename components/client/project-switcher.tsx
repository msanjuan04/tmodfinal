"use client"

import { useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronDown } from "lucide-react"

import type { ClientProjectSummary } from "@app/types/client"

interface ProjectSwitcherProps {
  projects: ClientProjectSummary[]
  activeProjectSlug: string | null
}

export function ProjectSwitcher({ projects, activeProjectSlug }: ProjectSwitcherProps) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const options = useMemo(() => {
    return projects.map((project) => ({
      label: project.name,
      value: project.slug,
    }))
  }, [projects])

  const active = options.find((option) => option.value === activeProjectSlug) ?? options[0]

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSlug = event.target.value
    const nextSearch = new URLSearchParams(searchParams.toString())
    nextSearch.delete("welcome")
    if (newSlug) {
      nextSearch.set("project", newSlug)
    } else {
      nextSearch.delete("project")
    }
    const queryString = nextSearch.toString()
    navigate(queryString ? `${location.pathname}?${queryString}` : location.pathname)
  }

  if (options.length === 0) {
    return (
      <div className="rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#6B7280]">
        Aún no hay proyectos
      </div>
    )
  }

  return (
    <label className="relative inline-flex min-w-[220px] items-center gap-2 rounded-full border border-[#E8E6E0] bg-white px-4 py-2 text-sm text-[#2F4F4F] shadow-apple-md">
      <span className="text-xs uppercase tracking-[0.2em] text-[#C6B89E]">Proyecto</span>
      <select
        className="w-full appearance-none border-none bg-transparent text-sm font-medium text-[#2F4F4F] focus:outline-none"
        value={active?.value ?? ""}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
    </label>
  )
}
