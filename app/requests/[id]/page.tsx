import { redirect, notFound } from "next/navigation"
import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, CheckCircle, Droplets, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface PageProps {
  params: { id: string }
}

export default async function RequestDetailsPage({ params }: PageProps) {
  const { id } = params
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login")
  }

  const request = await prisma.bloodRequest.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      donations: {
        include: {
          donor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!request) {
    notFound()
  }

  const isRequester = request.requesterId === authUser.id
  const progressPercentage = (request.unitsFulfilled / request.unitsRequired) * 100

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
            <h1 className="text-2xl font-bold text-foreground">Request Details</h1>
            <p className="text-muted-foreground">
              For {request.bloodType.replace("_", " ")} blood
            </p>
          </div>
        </div>

        {/* Request Status Card */}
        <Card className="mb-6 bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
            <CardDescription>
              Requested by {request.requester.firstName} {request.requester.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <p className="font-bold text-4xl text-primary">{request.unitsFulfilled}</p>
              <p className="text-muted-foreground">/ {request.unitsRequired} units fulfilled</p>
            </div>
            <Progress value={progressPercentage} />
            <div className="flex justify-between items-center text-sm">
                <Badge variant={request.status === "OPEN" ? "default" : "secondary"}>
                    {request.status}
                </Badge>
                <span className="text-muted-foreground">Urgency: {request.urgency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Button for Requester */}
        {isRequester && request.status === 'OPEN' && (
            <Card className="mb-6 bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Manage Request</CardTitle>
                    <CardDescription>A donor has arrived? Confirm their donation here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* This will eventually link to the OTP generation flow */}
                    <Button size="lg" className="w-full">
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Confirm a Donation
                    </Button>
                </CardContent>
            </Card>
        )}

        {/* Confirmed Donations */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Confirmed Donations</CardTitle>
            <CardDescription>
              List of all verified donations for this request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {request.donations.length > 0 ? (
              <ul className="space-y-4">
                {request.donations.map((donation) => (
                  <li key={donation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500"/>
                        <div>
                            <p className="font-semibold">{donation.donor.firstName} {donation.donor.lastName?.charAt(0)}.</p>
                            <p className="text-sm text-muted-foreground">
                                Donated {donation.unitsDonated} unit(s)
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(donation.donationDate), "MMM d, yyyy")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No confirmed donations yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}