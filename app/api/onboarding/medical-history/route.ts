import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

// We expect a JSON object with answers.
// A more specific Zod schema could be used for stricter validation if needed.
const medicalHistorySchema = z.object({
  answers: z.record(z.union([z.string(), z.boolean()])),
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
    const body = medicalHistorySchema.parse(json)

    // 3. Create a new MedicalHistory record in the database
    const medicalHistory = await prisma.medicalHistory.create({
      data: {
        userId: user.id,
        answers: body.answers, // Storing the answers as a JSON blob
      },
    })

    // 4. Return a success response
    return NextResponse.json(medicalHistory)
  } catch (error) {
    console.error("Error saving medical history:", error)

    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }

    // This could happen if a user tries to submit twice, for example.
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        return new NextResponse("Medical history already exists for this user.", { status: 409 });
    }

    return new NextResponse("Internal Server Error", { status: 500 })
  }
}