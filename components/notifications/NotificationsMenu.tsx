"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/useNotifications"
import type { NotificationAudience, ProjectNotification } from "@app/types/notifications"

interface NotificationsMenuProps {
  audience: NotificationAudience
  buttonVariant?: "ghost" | "outline"
  className?: string
}

export function NotificationsMenu({ audience, buttonVariant = "ghost", className }: NotificationsMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markAsRead, refresh } = useNotifications(audience, { limit: 10 })

  const handleNavigate = async (notification: ProjectNotification) => {
    await markAsRead(notification.id)
    if (!notification.linkUrl) {
      return
    }

    if (notification.linkUrl.startsWith("http")) {
      window.location.href = notification.linkUrl
    } else {
      navigate(notification.linkUrl)
    }
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          void refresh()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
          <span className="sr-only">Abrir notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#2F4F4F]">
          Notificaciones
          {unreadCount > 0 ? <span className="text-xs font-normal text-[#9CA3AF]">{unreadCount} sin leer</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-[#6B7280]">Cargando…</div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[#6B7280]">No tienes notificaciones recientes.</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col px-3 py-3"
                onSelect={(event) => {
                  event.preventDefault()
                  void handleNavigate(notification)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2F4F4F]">{notification.title}</p>
                    {notification.description ? (
                      <p className="text-xs text-[#6B7280]">{notification.description}</p>
                    ) : null}
                  </div>
                  {!notification.readAt ? <span className="mt-1 h-2 w-2 rounded-full bg-[#10B981]" /> : null}
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#C6B89E]">
                  {formatRelative(notification.createdAt)}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatRelative(value: string) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute))
    return minutes === 1 ? "Hace 1 minuto" : `Hace ${minutes} minutos`
  }
  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour))
    return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`
  }
  const days = Math.max(1, Math.round(diff / day))
  if (days < 7) {
    return days === 1 ? "Ayer" : `Hace ${days} días`
  }
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
