"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { User as AuthUser } from "@supabase/supabase-js"

interface Message {
  id: string
  senderId: string
  content: string
  createdAt: string
}

interface OtherUser {
  id: string
  firstName: string | null
}

interface PageProps {
  params: { otherUserId: string }
}

export default function ConversationPage({ params }: PageProps) {
  const { otherUserId } = params
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Redirect or handle unauthenticated state
        return
      }
      setCurrentUser(user)

      // Fetch message history and other user's info from our API
      try {
        const response = await fetch(`/api/messages?otherUserId=${otherUserId}`)
        if (!response.ok) throw new Error("Failed to fetch conversation.")
        const data = await response.json()
        setMessages(data.messages)
        setOtherUser(data.otherUser)
      } catch (error) {
        console.error(error)
      }
    }
    fetchInitialData()
  }, [otherUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return

    setIsLoading(true)
    const tempMessageId = Date.now().toString() // For optimistic UI update

    // Optimistic UI update
    const optimisticMessage: Message = {
      id: tempMessageId,
      senderId: currentUser.id,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: otherUserId,
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
        throw new Error("Failed to send message.")
      }

      // Optionally, replace optimistic message with real one from server
      const actualMessage = await response.json()
      setMessages((prev) => prev.map(msg => msg.id === tempMessageId ? actualMessage : msg))

    } catch (error) {
      console.error(error)
      // Revert on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b bg-card z-10">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{otherUser?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="font-semibold text-lg">{otherUser?.firstName}</h2>
        </div>
      </header>

      {/* Message Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUser?.id
          return (
            <div key={message.id} className={`flex items-end gap-2 ${isCurrentUser ? "justify-end" : ""}`}>
              <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p>{message.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Form */}
      <footer className="p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  )
}