import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { request_id, receiver_id, message_text, message_type = "text" } = body

    if (!request_id || !receiver_id || !message_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        request_id,
        sender_id: user.id,
        receiver_id,
        message_text,
        message_type,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("request_id")
    const otherUserId = searchParams.get("other_user_id")

    if (!requestId || !otherUserId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get messages between current user and other user for this request
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, profile_image_url),
        receiver:profiles!messages_receiver_id_fkey(full_name, profile_image_url)
      `)
      .eq("request_id", requestId)
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
