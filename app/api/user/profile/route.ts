import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Zod schema for validating the updated profile data
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isAvailable: z.boolean().optional(),
})

/**
 * GET - Fetches the current user's full profile from the database.
 */
export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!userProfile) {
      return new NextResponse("User profile not found", { status: 404 })
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

/**
 * PUT - Updates the current user's profile.
 */
export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await request.json()
    const body = profileUpdateSchema.parse(json)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...body,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating profile:", error)
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}