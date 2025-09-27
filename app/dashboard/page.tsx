import { redirect } from "next/navigation"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Users, Activity, MessageCircle, MapPin, PlusCircle, Droplets, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatDistanceToNow } from "date-fns"

// Helper function to determine donation eligibility
const getEligibilityStatus = (lastDonation: Date | null) => {
  if (!lastDonation) {
    return { eligible: true, nextDonationDate: null }
  }
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  if (lastDonation < threeMonthsAgo) {
    return { eligible: true, nextDonationDate: null }
  } else {
    const nextDonationDate = new Date(lastDonation)
    nextDonationDate.setMonth(nextDonationDate.getMonth() + 3)
    return { eligible: false, nextDonationDate }
  }
}

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser()

  if (error || !authUser) {
    redirect("/auth/login")
  }

  // Fetch user profile and their active blood requests from our database using Prisma
  const userProfile = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      bloodRequests: {
        where: {
          status: "OPEN",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  // If the user profile doesn't exist yet, they need to complete onboarding
  if (!userProfile?.firstName) {
    redirect("/onboarding/profile")
  }

  const eligibility = getEligibilityStatus(userProfile.lastDonation)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4 flex justify-center">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome, {userProfile.firstName}!</h1>
          <p className="text-muted-foreground">Ready to make a difference today?</p>
        </div>

        {/* Profile & Status Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Droplets className="h-4 w-4" />Blood Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{userProfile.bloodType?.replace("_", " ")}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Donation Status</CardTitle>
            </CardHeader>
            <CardContent>
              {eligibility.eligible ? (
                <div className="text-2xl font-bold text-green-500 flex items-center gap-2"><CheckCircle className="h-6 w-6" />Eligible</div>
              ) : (
                <div className="text-sm font-bold text-amber-500">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" />Next Donation</div>
                  {eligibility.nextDonationDate ? formatDistanceToNow(eligibility.nextDonationDate, { addSuffix: true }) : "Soon"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6 bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
                <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Button asChild size="lg" className="h-20 flex-col gap-2">
                    <Link href="/requests/create">
                        <PlusCircle className="h-6 w-6"/>
                        <span>Request Blood</span>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-20 flex-col gap-2">
                    <Link href="/map">
                        <MapPin className="h-6 w-6"/>
                        <span>Find Requests</span>
                    </Link>
                </Button>
            </CardContent>
        </Card>

        {/* My Active Requests */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>My Active Blood Requests</CardTitle>
            <CardDescription>Requests you have created that are still open.</CardDescription>
          </CardHeader>
          <CardContent>
            {userProfile.bloodRequests.length > 0 ? (
              <ul className="space-y-4">
                {userProfile.bloodRequests.map((request) => (
                  <li key={request.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{request.bloodType.replace("_", " ")} - {request.urgency}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.unitsFulfilled} / {request.unitsRequired} units fulfilled
                      </p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/requests/${request.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You have no active blood requests.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Navigation Placeholder */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>Profile | Messages | Settings</p>
        </div>
      </div>
    </div>
  )
}