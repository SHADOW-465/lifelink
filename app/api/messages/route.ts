import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

/**
 * GET - Fetches the message history for a specific conversation.
 */
export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { searchParams } = new URL(request.url)
  const otherUserId = searchParams.get("otherUserId")

  if (!otherUserId) {
    return new NextResponse("otherUserId is required", { status: 400 })
  }

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fetch the other user's basic info
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, firstName: true },
    })

    if (!otherUser) {
      return new NextResponse("Conversation partner not found", { status: 404 })
    }

    // Fetch the messages between the two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: authUser.id, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: authUser.id },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json({ messages, otherUser })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

/**
 * POST - Sends a new message.
 */
const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1, "Message content cannot be empty."),
})

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await request.json()
    const body = sendMessageSchema.parse(json)

    const newMessage = await prisma.message.create({
      data: {
        senderId: authUser.id,
        recipientId: body.recipientId,
        content: body.content,
      },
    })

    return NextResponse.json(newMessage)
  } catch (error) {
    console.error("Error sending message:", error)
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}