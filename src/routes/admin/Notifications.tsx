import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import { BellRing, CheckCheck, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "@app/lib/api/admin"
import type { ProjectNotification } from "@app/types/notifications"

// Listado completo de notificaciones admin con filtros y paginación.
// Reutiliza los endpoints que ya usa el badge de la campana, pero en modo
// "página" para navegar el histórico.

const PAGE_SIZE = 20

type Filter = "all" | "unread"

export function AdminNotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>("all")
  const [offset, setOffset] = useState(0)
  const [notifications, setNotifications] = useState<ProjectNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const loadPage = useCallback(
    async (currentOffset: number, currentFilter: Filter) => {
      setLoading(true)
      try {
        const feed = await fetchAdminNotifications({
          limit: PAGE_SIZE,
          offset: currentOffset,
          unreadOnly: currentFilter === "unread",
        })
        setNotifications(feed.notifications)
        setUnreadCount(feed.unreadCount)
        setTotalCount(feed.totalCount ?? feed.notifications.length)
      } catch (error) {
        console.error("Error fetching admin notifications", error)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadPage(offset, filter)
  }, [loadPage, offset, filter])

  const handleMarkRead = (notification: ProjectNotification) => {
    if (notification.readAt) return
    startTransition(() => {
      void (async () => {
        try {
          await markAdminNotificationRead(notification.id)
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
            ),
          )
          setUnreadCount((count) => Math.max(0, count - 1))
        } catch (error) {
          console.error("Error marking notification read", error)
        }
      })()
    })
  }

  const handleOpen = async (notification: ProjectNotification) => {
    if (!notification.readAt) {
      try {
        await markAdminNotificationRead(notification.id)
      } catch (error) {
        console.error("Error marking notification read on open", error)
      }
    }
    if (notification.linkUrl) {
      if (notification.linkUrl.startsWith("http")) {
        window.location.href = notification.linkUrl
      } else {
        navigate(notification.linkUrl)
      }
    }
  }

  const handleMarkAll = () => {
    if (unreadCount === 0) return
    startTransition(() => {
      void (async () => {
        try {
          await markAllAdminNotificationsRead()
          await loadPage(offset, filter)
        } catch (error) {
          console.error("Error marking all read", error)
        }
      })()
    })
  }

  const handleChangeFilter = (next: Filter) => {
    if (next === filter) return
    setFilter(next)
    setOffset(0)
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount])
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-6 pb-16">
      <section className="rounded-[1.75rem] border border-[#E8E6E0] bg-white/95 p-6 shadow-apple-md lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F1EA] text-[#2F4F4F]">
                <BellRing className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6B89E]">
                Mi cuenta · Notificaciones
              </p>
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-[#2F4F4F] sm:text-4xl">
              Notificaciones
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#6B7280]">
              Histórico completo de alertas administrativas: mensajes nuevos de clientes, fallos de envío de correo,
              creaciones e invitaciones. Haz click en cualquiera para abrirla.
            </p>
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8E6E0] bg-[#F8F7F4] px-4 py-1.5 text-xs text-[#4B5563]">
              <span className="font-semibold text-[#2F4F4F]">{unreadCount}</span>
              <span>sin leer</span>
              <span className="text-[#C6B89E]">·</span>
              <span>{totalCount} en total{filter === "unread" ? " (filtradas)" : ""}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-full border border-[#E8E6E0] bg-[#F8F7F4] p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleChangeFilter("all")}
                className={`rounded-full px-4 py-1.5 transition ${
                  filter === "all" ? "bg-white text-[#2F4F4F] shadow-apple-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleChangeFilter("unread")}
                className={`rounded-full px-4 py-1.5 transition ${
                  filter === "unread" ? "bg-white text-[#2F4F4F] shadow-apple-sm" : "text-[#6B7280] hover:text-[#2F4F4F]"
                }`}
              >
                Sin leer
              </button>
            </div>

            <Button
              variant="outline"
              className="inline-flex h-10 items-center gap-2 rounded-full border-[#E8E6E0] bg-white px-4 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA]"
              onClick={() => loadPage(offset, filter)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualizar
            </Button>

            <Button
              variant="outline"
              className="inline-flex h-10 items-center gap-2 rounded-full border-[#E8E6E0] bg-white px-4 text-xs font-semibold text-[#2F4F4F] hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleMarkAll}
              disabled={pending || unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-12 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Cargando notificaciones…
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-[1.25rem] border border-[#E8E6E0] bg-white p-12 text-center text-sm text-[#6B7280]">
          {filter === "unread" ? "No tienes notificaciones sin leer." : "Aún no hay notificaciones."}
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt
            return (
              <li
                key={notification.id}
                className={`rounded-[1.25rem] border transition ${
                  isUnread
                    ? "border-[#2F4F4F]/20 bg-white shadow-apple-sm"
                    : "border-[#E8E6E0] bg-white/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className="flex w-full items-start gap-4 p-4 text-left transition hover:bg-[#F4F1EA]/50 sm:p-5"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-[#10B981]" : "bg-[#E8E6E0]"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#2F4F4F]">{notification.title}</p>
                      <span className="inline-flex items-center rounded-full bg-[#F4F1EA] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                        {notification.type.replaceAll("_", " ")}
                      </span>
                    </div>
                    {notification.description ? (
                      <p className="mt-1 text-sm text-[#6B7280]">{notification.description}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#C6B89E]">
                      {formatAbsolute(notification.createdAt)}
                    </p>
                  </div>
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleMarkRead(notification)
                      }}
                      className="hidden rounded-full border border-[#E8E6E0] bg-white px-3 py-1 text-[11px] font-semibold text-[#2F4F4F] transition hover:bg-[#F4F1EA] sm:inline-flex"
                    >
                      Marcar leída
                    </button>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between rounded-[1.25rem] border border-[#E8E6E0] bg-white px-5 py-3 text-sm text-[#4B5563]">
          <span>
            Página <strong className="text-[#2F4F4F]">{currentPage}</strong> de{" "}
            <strong className="text-[#2F4F4F]">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full border-[#E8E6E0] bg-white text-xs"
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              disabled={offset === 0 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[#E8E6E0] bg-white text-xs"
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
              disabled={currentPage >= totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  )
}

function formatAbsolute(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
