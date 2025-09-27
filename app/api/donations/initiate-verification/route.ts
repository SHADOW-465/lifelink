import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { randomInt } from "crypto"

// Zod schema for input validation
const initiateSchema = z.object({
  bloodRequestId: z.string().cuid(),
  donorId: z.string().uuid(),
  unitsDonated: z.number().int().min(1),
})

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // 1. Authenticate the user (must be the recipient)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Validate input
    const json = await request.json()
    const body = initiateSchema.parse(json)

    // 3. Verify that the authenticated user is the owner of the blood request
    const bloodRequest = await prisma.bloodRequest.findFirst({
      where: {
        id: body.bloodRequestId,
        requesterId: authUser.id,
      },
    })

    if (!bloodRequest) {
      return new NextResponse("Blood request not found or you are not the owner.", { status: 404 })
    }

    if (bloodRequest.status !== 'OPEN') {
        return new NextResponse("This blood request is no longer open.", { status: 400 });
    }

    // --- Start a transaction to ensure atomicity ---
    const { donation, verification } = await prisma.$transaction(async (tx) => {
      // 4. Create a temporary Donation record
      const tempDonation = await tx.donation.create({
        data: {
          donorId: body.donorId,
          bloodRequestId: body.bloodRequestId,
          unitsDonated: body.unitsDonated,
          // Donation date will be set on confirmation
        },
      })

      // 5. Generate a 6-digit OTP and set an expiration time (e.g., 10 minutes)
      const otp = randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

      // 6. Create the DonationVerification record
      const newVerification = await tx.donationVerification.create({
        data: {
          donationId: tempDonation.id,
          recipientId: authUser.id,
          otp,
          expiresAt,
        },
      })

      return { donation: tempDonation, verification: newVerification }
    })

    // In a real app, you would now send the OTP via SMS to the donor.
    // For this prototype, we will return the OTP in the response for testing.
    console.log(`Generated OTP for donor ${body.donorId}: ${verification.otp}`)

    // 7. Return the verification ID to the client to use in the next step
    return NextResponse.json({
      message: "Verification initiated. Please ask the donor for the OTP.",
      verificationId: verification.id,
      // NOTE: Returning OTP for simulation purposes. Remove in production.
      otpForSimulation: verification.otp
    })

  } catch (error) {
    console.error("Error initiating verification:", error)
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}