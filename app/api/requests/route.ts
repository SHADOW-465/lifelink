import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BloodType, UrgencyLevel } from "@prisma/client"

// Zod schema for validating the new request data
const createRequestSchema = z.object({
  bloodType: z.nativeEnum(BloodType),
  unitsRequired: z.number().int().min(1),
  urgency: z.nativeEnum(UrgencyLevel),
})

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // 1. Get the current user from Supabase
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Fetch the user's profile from our DB to get their location
    const userProfile = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!userProfile || userProfile.latitude === null || userProfile.longitude === null) {
      return new NextResponse("User profile is incomplete or missing location data.", { status: 400 })
    }

    // 3. Parse and validate the request body
    const json = await request.json()
    const body = createRequestSchema.parse(json)

    // 4. Create the new BloodRequest record
    const newBloodRequest = await prisma.bloodRequest.create({
      data: {
        requesterId: authUser.id,
        bloodType: body.bloodType,
        unitsRequired: body.unitsRequired,
        urgency: body.urgency,
        latitude: userProfile.latitude,
        longitude: userProfile.longitude,
        status: "OPEN",
      },
    })

    // 5. Return a success response
    return NextResponse.json(newBloodRequest)
  } catch (error) {
    console.error("Error creating blood request:", error)
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}