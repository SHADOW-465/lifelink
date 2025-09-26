"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, X, Check, Heart, Users, MessageCircle } from "lucide-react"
import { toast } from "sonner"

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "donation" | "message" | "club" | "system" | "urgent"
  is_read: boolean
  action_url?: string
  created_at: string
}

interface NotificationSystemProps {
  userId?: string
  showInline?: boolean
  maxNotifications?: number
}

export default function NotificationSystem({
  userId,
  showInline = false,
  maxNotifications = 10,
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchNotifications()
      setupRealtimeSubscription()
    }
  }, [currentUser])

  const fetchCurrentUser = async () => {
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setCurrentUser(profile)
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setCurrentUser(profile)
      }
    }
  }

  const fetchNotifications = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(maxNotifications)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!currentUser) return

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev.slice(0, maxNotifications - 1)])

          // Show toast notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url
              ? {
                  label: "View",
                  onClick: () => (window.location.href = newNotification.action_url!),
                }
              : undefined,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false)

      if (error) throw error

      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "donation":
        return <Heart className="h-4 w-4" />
      case "message":
        return <MessageCircle className="h-4 w-4" />
      case "club":
        return <Users className="h-4 w-4" />
      case "urgent":
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "donation":
        return "default"
      case "message":
        return "secondary"
      case "club":
        return "outline"
      case "urgent":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (showInline) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
          <CardDescription>Stay updated with your blood donation activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    notification.is_read ? "bg-muted/50" : "bg-background"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`p-2 rounded-full ${
                        notification.type === "urgent"
                          ? "bg-red-100 text-red-600"
                          : notification.type === "donation"
                            ? "bg-green-100 text-green-600"
                            : notification.type === "message"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getNotificationColor(notification.type)} className="text-xs">
                            {notification.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {notification.action_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => (window.location.href = notification.action_url!)}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Return notification count for navigation
  return unreadCount
}
