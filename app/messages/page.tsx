import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Heart, User, Search } from "lucide-react"
import Link from "next/link"

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get conversations (grouped messages)
  const { data: conversations } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, full_name, profile_image_url),
      receiver:profiles!messages_receiver_id_fkey(id, full_name, profile_image_url),
      blood_requests!messages_request_id_fkey(id, patient_name, blood_type, urgency_level)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  // Group conversations by request and other participant
  const groupedConversations = conversations?.reduce(
    (acc, message) => {
      const otherParticipant = message.sender_id === user.id ? message.receiver : message.sender
      const key = `${message.request_id}-${otherParticipant.id}`

      if (!acc[key]) {
        acc[key] = {
          request_id: message.request_id,
          request: message.blood_requests,
          other_participant: otherParticipant,
          last_message: message,
          unread_count: 0,
          messages: [],
        }
      }

      acc[key].messages.push(message)

      // Update last message if this one is newer
      if (new Date(message.created_at) > new Date(acc[key].last_message.created_at)) {
        acc[key].last_message = message
      }

      // Count unread messages
      if (!message.is_read && message.receiver_id === user.id) {
        acc[key].unread_count++
      }

      return acc
    },
    {} as Record<string, any>,
  )

  const conversationList = Object.values(groupedConversations || {}).sort(
    (a: any, b: any) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime(),
  )

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      // Less than a week
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with donors and recipients</p>
          </div>
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                  <p className="text-2xl font-bold">{conversationList.length}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread Messages</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {conversationList.reduce((sum: number, conv: any) => sum + conv.unread_count, 0)}
                  </p>
                </div>
                <Badge className="bg-blue-600 text-white">
                  {conversationList.filter((conv: any) => conv.unread_count > 0).length}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Requests</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(conversationList.map((conv: any) => conv.request_id)).size}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversations List */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {conversationList.length > 0 ? (
              <div className="space-y-4">
                {conversationList.map((conversation: any) => (
                  <Link
                    key={`${conversation.request_id}-${conversation.other_participant.id}`}
                    href={`/messages/${conversation.request_id}/${conversation.other_participant.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={conversation.other_participant.profile_image_url || "/placeholder.svg"}
                          alt={conversation.other_participant.full_name}
                        />
                        <AvatarFallback>{getInitials(conversation.other_participant.full_name)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">{conversation.other_participant.full_name}</h3>
                          <div className="flex items-center gap-2">
                            {conversation.request && (
                              <Badge
                                className={`${getUrgencyColor(conversation.request.urgency_level)} text-white text-xs`}
                              >
                                {conversation.request.urgency_level}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.last_message.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {conversation.request && (
                              <p className="text-sm text-muted-foreground mb-1">
                                Request: {conversation.request.patient_name} ({conversation.request.blood_type})
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message.sender_id === user.id ? "You: " : ""}
                              {conversation.last_message.message_text}
                            </p>
                          </div>
                          {conversation.unread_count > 0 && (
                            <Badge className="bg-blue-600 text-white ml-2">{conversation.unread_count}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Messages Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start a conversation by responding to a blood request or creating one.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button asChild>
                    <Link href="/requests">
                      <Heart className="mr-2 h-4 w-4" />
                      View Requests
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/requests/create">
                      <User className="mr-2 h-4 w-4" />
                      Create Request
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
