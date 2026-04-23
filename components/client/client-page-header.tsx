"use client"

import type { ReactNode } from "react"
import { Loader2, RefreshCcw, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ClientProjectSummary } from "@app/types/client"

interface ClientPageHeaderProps {
  /** Overline en mayúsculas pequeñas (estilo Terrazea). */
  overline: string
  title: string
  description?: string
  /** Icono decorativo opcional para el círculo del overline */
  icon?: LucideIcon
  /** Variante oscura con gradiente teal (como el admin project detail). */
  variant?: "default" | "dark"
  /** Proyectos disponibles para el selector. */
  projects?: ClientProjectSummary[]
  selectedSlug?: string | null
  onSelectedSlugChange?: (slug: string | null) => void
  /** Acción refrescar opcional. */
  onRefresh?: () => void
  refreshing?: boolean
  /** Contenido adicional custom (chips de info, stats, etc.) */
  children?: ReactNode
}

/**
 * Header reutilizable para todas las páginas del portal cliente.
 * Usa la misma estética que el admin (overline + título + selector + refresh).
 * Con `variant="dark"` se obtiene el hero con gradiente teal estilo admin project detail.
 */
export function ClientPageHeader({
  overline,
  title,
  description,
  icon: Icon,
  variant = "default",
  projects,
  selectedSlug,
  onSelectedSlugChange,
  onRefresh,
  refreshing = false,
  children,
}: ClientPageHeaderProps) {
  const isDark = variant === "dark"

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.75rem] border p-6 shadow-apple-md lg:p-8",
        isDark
          ? "border-[#1F3535] bg-gradient-to-br from-[#2F4F4F] via-[#243B3B] to-[#1F3535] text-white"
          : "border-[#E8E6E0] bg-white/95 text-[#2F4F4F]",
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {Icon ? (
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isDark ? "bg-white/10 text-white" : "bg-[#F4F1EA] text-[#2F4F4F]",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.3em]",
                isDark ? "text-white/60" : "text-[#C6B89E]",
              )}
            >
              {overline}
            </p>
          </div>
          <h1
            className={cn(
              "font-heading text-3xl font-semibold leading-tight sm:text-4xl",
              isDark ? "text-white" : "text-[#2F4F4F]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "max-w-2xl text-sm leading-relaxed",
                isDark ? "text-white/70" : "text-[#6B7280]",
              )}
            >
              {description}
            </p>
          ) : null}
          {children}
        </div>

        {/* Selector de proyecto + refresh */}
        {(projects && projects.length > 0) || onRefresh ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {projects && projects.length > 0 ? (
              <select
                value={selectedSlug ?? ""}
                onChange={(event) => onSelectedSlugChange?.(event.target.value || null)}
                className={cn(
                  "h-10 min-w-[220px] rounded-full border px-4 text-sm focus:outline-none",
                  isDark
                    ? "border-white/20 bg-white/10 text-white backdrop-blur focus:ring-2 focus:ring-white/20"
                    : "border-[#E8E6E0] bg-[#F8F7F4] text-[#2F4F4F] focus:ring-2 focus:ring-[#2F4F4F]/20",
                )}
              >
                {projects.map((project) => (
                  <option key={project.slug} value={project.slug} className="text-[#2F4F4F]">
                    {project.name}
                  </option>
                ))}
              </select>
            ) : null}
            {onRefresh ? (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={refreshing}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold",
                  isDark
                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                    : "border-[#E8E6E0] bg-white text-[#2F4F4F] hover:bg-[#F4F1EA]",
                )}
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                {refreshing ? "Actualizando" : "Actualizar"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
