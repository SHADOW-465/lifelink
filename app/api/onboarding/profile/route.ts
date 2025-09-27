import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma" // I'll need to create this lib file next.
import { BloodType } from "@prisma/client"

// Define the schema for input validation using Zod
const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  bloodType: z.nativeEnum(BloodType),
  address: z.string().min(1, "Address is required"),
  // TODO: Add latitude and longitude from a geocoding service in the future
})

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // 1. Get the current user from Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Parse and validate the request body
    const json = await request.json()
    const body = profileUpdateSchema.parse(json)

    // 3. Update the user's record in the database using Prisma
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        bloodType: body.bloodType,
        address: body.address,
        // For now, using placeholder coordinates.
        // In a real implementation, we would geocode the address.
        latitude: 0,
        longitude: 0,
      },
    })

    // 4. Return a success response
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating profile:", error)

    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }

    // Check for Prisma-specific errors or other database errors if needed

    return new NextResponse("Internal Server Error", { status: 500 })
  }
}