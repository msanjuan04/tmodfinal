"use client"

import { useEffect, useState } from "react"

interface WelcomeOverlayProps {
  name: string
  duration?: number
}

export function WelcomeOverlay({ name, duration = 1600 }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timeout)
  }, [duration])

  if (!visible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F4F4F]/80 backdrop-blur-md transition-opacity animate-fade-in">
      <div className="rounded-[2rem] border border-white/30 bg-white/20 px-10 py-8 text-center text-white shadow-apple-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-[#C6B89E]">Zona Cliente Terrazea</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold">Bienvenido, {name}</h2>
        <p className="mt-2 text-sm text-[#E8E6E0]">Preparamos tus proyectos con acabado liquid glass...</p>
      </div>
    </div>
  )
}
