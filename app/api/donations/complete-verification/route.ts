import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Zod schema for input validation
const completeSchema = z.object({
  verificationId: z.string().cuid(),
  otp: z.string().length(6, "OTP must be 6 digits"),
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
    const body = completeSchema.parse(json)

    // 3. Find the pending verification record
    const verification = await prisma.donationVerification.findFirst({
      where: {
        id: body.verificationId,
        recipientId: authUser.id,
        status: "PENDING",
      },
      include: {
        donation: {
          include: {
            bloodRequest: true,
          },
        },
      },
    })

    if (!verification) {
      return new NextResponse("Verification not found or already completed.", { status: 404 })
    }

    // 4. Check if OTP has expired
    if (new Date() > verification.expiresAt) {
      await prisma.donationVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      })
      return new NextResponse("OTP has expired.", { status: 410 })
    }

    // 5. Check if OTP is correct
    if (verification.otp !== body.otp) {
      // Optional: Implement a retry limit here
      return new NextResponse("Invalid OTP.", { status: 400 })
    }

    // --- OTP is valid, perform final updates in a transaction ---
    await prisma.$transaction(async (tx) => {
      // a. Update the verification status
      await tx.donationVerification.update({
        where: { id: verification.id },
        data: { status: "VERIFIED" },
      })

      // b. Finalize the donation date
      await tx.donation.update({
        where: { id: verification.donationId },
        data: { donationDate: new Date() },
      })

      // c. Update the blood request's fulfilled units
      const updatedUnits = verification.donation.bloodRequest.unitsFulfilled + verification.donation.unitsDonated
      const isRequestComplete = updatedUnits >= verification.donation.bloodRequest.unitsRequired

      await tx.bloodRequest.update({
        where: { id: verification.donation.bloodRequestId },
        data: {
          unitsFulfilled: updatedUnits,
          // d. Close the request if it's fully fulfilled
          status: isRequestComplete ? "CLOSED" : "OPEN",
        },
      })

      // e. Update the donor's last donation date
      await tx.user.update({
        where: { id: verification.donation.donorId },
        data: { lastDonation: new Date() },
      })
    })

    return NextResponse.json({ message: "Donation successfully verified!" })

  } catch (error) {
    console.error("Error completing verification:", error)
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}