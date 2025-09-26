import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Users, Activity, MessageCircle, MapPin } from "lucide-react"
import Link from "next/link"
import MapComponent from "@/components/map-component"
import NotificationSystem from "@/components/notification-system"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Get recent blood requests for map markers
  const { data: recentRequests } = await supabase
    .from("blood_requests")
    .select(`
      *,
      profiles!blood_requests_requester_id_fkey(full_name, location_city, location_state)
    `)
    .eq("is_active", true)
    .eq("is_fulfilled", false)
    .limit(10)

  // Convert requests to map markers
  const mapMarkers =
    recentRequests?.map((request, index) => ({
      id: request.id,
      position: {
        lat: 40.7128 + index * 0.01, // Mock coordinates - in real app, use actual coordinates
        lng: -74.006 + index * 0.01,
      },
      title: `${request.blood_type} Blood Needed`,
      description: `${request.patient_name} needs ${request.units_needed} units`,
      type: "recipient" as const,
      bloodType: request.blood_type,
      urgency: request.urgency_level as "low" | "medium" | "high",
    })) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile?.full_name || "User"}!</h1>
            <p className="text-muted-foreground">Ready to save lives today?</p>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <span className="text-2xl font-bold text-foreground">BloodConnect</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Type</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{profile?.blood_type || "Not Set"}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Type</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{profile?.user_type || "Not Set"}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {profile?.is_available ? "Available" : "Unavailable"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {profile?.location_city ? `${profile.location_city}, ${profile.location_state}` : "Not Set"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <NotificationSystem userId={user.id} showInline={true} maxNotifications={5} />
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Nearby Blood Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapComponent markers={mapMarkers} height="300px" showCurrentLocation={true} interactive={true} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.user_type === "donor" || profile?.user_type === "both" ? (
                <Button className="w-full justify-start" size="lg" asChild>
                  <Link href="/requests">
                    <Heart className="mr-2 h-4 w-4" />
                    Find Blood Requests
                  </Link>
                </Button>
              ) : null}

              {profile?.user_type === "recipient" || profile?.user_type === "both" ? (
                <Button className="w-full justify-start bg-transparent" size="lg" variant="outline" asChild>
                  <Link href="/requests/create">
                    <Users className="mr-2 h-4 w-4" />
                    Create Blood Request
                  </Link>
                </Button>
              ) : null}

              <Button className="w-full justify-start bg-transparent" size="lg" variant="outline" asChild>
                <Link href="/messages">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                </Link>
              </Button>

              <Button className="w-full justify-start bg-transparent" size="lg" variant="outline" asChild>
                <Link href="/clubs">
                  <Users className="mr-2 h-4 w-4" />
                  Rotaract Clubs
                </Link>
              </Button>

              <Button className="w-full justify-start bg-transparent" size="lg" variant="outline" asChild>
                <Link href="/profile/edit">
                  <Activity className="mr-2 h-4 w-4" />
                  Update Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Start by creating a blood request or responding to one!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
