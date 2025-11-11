"use client"

import { cn } from "@/lib/utils"
import { TERRAZEA_BRAND_ICON_URL } from "@/lib/constants/brand"

interface TerrazeaBrandProps {
  subtitle?: string | null
  className?: string
  collapseSubtitleOnMobile?: boolean
}

export function TerrazeaBrand({ subtitle = null, className, collapseSubtitleOnMobile = false }: TerrazeaBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={TERRAZEA_BRAND_ICON_URL}
        alt="Logotipo Terrazea"
        width={40}
        height={40}
        className="h-10 w-10"
        loading="lazy"
      />
      <div className={cn("leading-tight", collapseSubtitleOnMobile ? "max-sm:hidden" : undefined)}>
        <p className="font-serif text-lg font-semibold text-[#2f4f4f]">Terrazea</p>
        {subtitle ? <p className="text-xs text-[#6b7280]">{subtitle}</p> : null}
      </div>
      {collapseSubtitleOnMobile && (
        <span className="font-serif text-lg font-semibold text-[#2f4f4f] sm:hidden">Terrazea</span>
      )}
    </div>
  )
}
