import { useCallback, useEffect, useRef, useState } from "react"

import type { NotificationAudience, ProjectNotification } from "@app/types/notifications"
import { fetchAdminNotifications, markAdminNotificationRead } from "@app/lib/api/admin"
import { fetchClientNotifications, markClientNotificationRead } from "@app/lib/api/client"

interface UseNotificationsOptions {
  pollInterval?: number
  limit?: number
}

interface UseNotificationsResult {
  notifications: ProjectNotification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
}

export function useNotifications(audience: NotificationAudience, options?: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<ProjectNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFeed = useCallback(async () => {
    try {
      const limit = options?.limit
      const feed =
        audience === "admin"
          ? await fetchAdminNotifications({ limit })
          : await fetchClientNotifications({ limit })
      setNotifications(feed.notifications)
      setUnreadCount(feed.unreadCount)
    } finally {
      setLoading(false)
    }
  }, [audience, options?.limit])

  useEffect(() => {
    void fetchFeed()
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      void fetchFeed()
    }, options?.pollInterval ?? 30000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchFeed, options?.pollInterval])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        if (audience === "admin") {
          await markAdminNotificationRead(notificationId)
        } else {
          await markClientNotificationRead(notificationId)
        }
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId ? { ...notification, readAt: new Date().toISOString() } : notification,
          ),
        )
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch (error) {
        console.error("Mark notification read failed", error)
      }
    },
    [audience],
  )

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchFeed,
    markAsRead,
  }
}
