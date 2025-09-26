"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Send, Heart, Phone, Video, MoreVertical } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ requestId: string; userId: string }>
}

export default function ChatPage({ params }: PageProps) {
  const [requestId, setRequestId] = useState<string>("")
  const [otherUserId, setOtherUserId] = useState<string>("")
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setRequestId(resolvedParams.requestId)
      setOtherUserId(resolvedParams.userId)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (requestId && otherUserId) {
      loadData()
      setupRealtimeSubscription()
    }
  }, [requestId, otherUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadData = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setCurrentUser(user)

      // Load other user profile
      const { data: otherUserProfile } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()

      setOtherUser(otherUserProfile)

      // Load request details
      const { data: requestData } = await supabase.from("blood_requests").select("*").eq("id", requestId).single()

      setRequest(requestData)

      // Load messages
      await loadMessages()

      // Mark messages as read
      await markMessagesAsRead(user.id)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const loadMessages = async () => {
    const supabase = createClient()

    const { data: messagesData } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, profile_image_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, profile_image_url)
      `)
      .eq("request_id", requestId)
      .or(
        `and(sender_id.eq.${currentUser?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser?.id})`,
      )
      .order("created_at", { ascending: true })

    setMessages(messagesData || [])
  }

  const markMessagesAsRead = async (userId: string) => {
    const supabase = createClient()

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("request_id", requestId)
      .eq("receiver_id", userId)
      .eq("sender_id", otherUserId)
  }

  const setupRealtimeSubscription = () => {
    const supabase = createClient()

    const subscription = supabase
      .channel(`messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          // Only add message if it's part of this conversation
          if (
            (payload.new.sender_id === currentUser?.id && payload.new.receiver_id === otherUserId) ||
            (payload.new.sender_id === otherUserId && payload.new.receiver_id === currentUser?.id)
          ) {
            loadMessages() // Reload to get full message with profile data
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        message_text: newMessage.trim(),
        message_type: "text",
      })

      if (error) throw error

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-600"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    },
    {} as Record<string, any[]>,
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex flex-col">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/messages">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>

              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={otherUser?.profile_image_url || "/placeholder.svg"} />
                  <AvatarFallback>{otherUser?.full_name ? getInitials(otherUser.full_name) : "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{otherUser?.full_name}</h2>
                  {request && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {request.patient_name} ({request.blood_type})
                      </span>
                      <Badge className={`${getUrgencyColor(request.urgency_level)} text-white text-xs`}>
                        {request.urgency_level}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Context */}
      {request && (
        <div className="bg-primary/5 border-b border-border">
          <div className="container mx-auto p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Blood Request: {request.patient_name}</p>
                <p className="text-sm text-muted-foreground">
                  {request.blood_type} • {request.units_needed} unit(s) • {request.hospital_name}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/requests/${requestId}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 container mx-auto p-4">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {formatDate(date)}
                  </div>
                </div>

                {/* Messages for this date */}
                {dayMessages.map((message, index) => {
                  const isCurrentUser = message.sender_id === currentUser?.id
                  const showAvatar =
                    !isCurrentUser && (index === 0 || dayMessages[index - 1]?.sender_id !== message.sender_id)

                  return (
                    <div key={message.id} className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      {!isCurrentUser && (
                        <div className="w-8">
                          {showAvatar && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={message.sender.profile_image_url || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs">
                                {getInitials(message.sender.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? "order-1" : ""}`}>
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="text-sm">{message.message_text}</p>
                        </div>
                        <p className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? "text-right" : ""}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="bg-card/80 backdrop-blur-sm border-t border-border">
        <div className="container mx-auto p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
