import { redirect } from "next/navigation"
import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default async function MessagesPage() {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  // 1. Fetch all messages involving the current user
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: authUser.id },
        { recipientId: authUser.id },
      ],
    },
    include: {
      sender: { select: { id: true, firstName: true } },
      recipient: { select: { id: true, firstName: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // 2. Group messages into conversations
  const conversations = messages.reduce((acc, msg) => {
    const otherUserId = msg.senderId === authUser.id ? msg.recipientId : msg.senderId
    const otherUser = msg.senderId === authUser.id ? msg.recipient : msg.sender

    if (!acc[otherUserId]) {
      acc[otherUserId] = {
        otherUser,
        lastMessage: msg,
        unreadCount: 0, // Simplified for now
      }
    }
    // Since we ordered by date, the first message we see is the latest one.
    return acc
  }, {} as Record<string, { otherUser: any; lastMessage: any; unreadCount: number }>)

  const conversationList = Object.values(conversations)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4 flex justify-center">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
            <p className="text-muted-foreground">Your recent chats with other users.</p>
          </div>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>All Chats</CardTitle>
          </CardHeader>
          <CardContent>
            {conversationList.length > 0 ? (
              <ul className="space-y-2">
                {conversationList.map(({ otherUser, lastMessage }) => (
                  <li key={otherUser.id}>
                    <Link href={`/messages/${otherUser.id}`} className="block p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{otherUser.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold truncate">{otherUser.firstName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMessage.senderId === authUser.id && "You: "}
                            {lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold">No messages yet</h3>
                <p className="text-sm">Start a conversation by responding to a request.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}