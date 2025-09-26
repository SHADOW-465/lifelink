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
    const { request_id, sender_id } = body

    if (!request_id || !sender_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Mark messages as read
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("request_id", request_id)
      .eq("receiver_id", user.id)
      .eq("sender_id", sender_id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 })
  }
}
