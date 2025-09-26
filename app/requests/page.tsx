import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MapPin, Clock, User, Plus, Filter } from "lucide-react"
import Link from "next/link"
import MapComponent from "@/components/map-component"

export default async function RequestsPage() {
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

  // Get active blood requests
  const { data: requests } = await supabase
    .from("blood_requests")
    .select(`
      *,
      profiles!blood_requests_requester_id_fkey(full_name, location_city, location_state)
    `)
    .eq("is_active", true)
    .eq("is_fulfilled", false)
    .order("created_at", { ascending: false })

  const mapMarkers =
    requests?.map((request, index) => ({
      id: request.id,
      position: {
        lat: 40.7128 + index * 0.01, // Mock coordinates - in real app, use actual coordinates
        lng: -74.006 + index * 0.01,
      },
      title: `${request.blood_type} Blood Needed`,
      description: `${request.patient_name} needs ${request.units_needed} units at ${request.hospital_name}`,
      type: "recipient" as const,
      bloodType: request.blood_type,
      urgency: request.urgency_level as "low" | "medium" | "high",
    })) || []

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-600"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const isCompatibleBloodType = (donorType: string, requestedType: string) => {
    const compatibility: Record<string, string[]> = {
      "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      "O+": ["O+", "A+", "B+", "AB+"],
      "A-": ["A-", "A+", "AB-", "AB+"],
      "A+": ["A+", "AB+"],
      "B-": ["B-", "B+", "AB-", "AB+"],
      "B+": ["B+", "AB+"],
      "AB-": ["AB-", "AB+"],
      "AB+": ["AB+"],
    }

    return compatibility[donorType]?.includes(requestedType) || false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Requests</h1>
            <p className="text-muted-foreground">
              {profile?.user_type === "donor" || profile?.user_type === "both"
                ? "Find people who need your help"
                : "View active blood requests"}
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            {(profile?.user_type === "recipient" || profile?.user_type === "both") && (
              <Button asChild>
                <Link href="/requests/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Request
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{requests?.length || 0}</p>
                </div>
                <Heart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">
                    {requests?.filter((r) => r.urgency_level === "critical").length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compatible</p>
                  <p className="text-2xl font-bold text-green-600">
                    {profile?.blood_type
                      ? requests?.filter((r) => isCompatibleBloodType(profile.blood_type, r.blood_type)).length || 0
                      : 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Near You</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {profile?.location_city
                      ? requests?.filter((r) => r.profiles?.location_city === profile.location_city).length || 0
                      : 0}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {mapMarkers.length > 0 && (
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Request Locations
              </h2>
              <MapComponent markers={mapMarkers} height="400px" showCurrentLocation={true} interactive={true} />
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        <div className="space-y-6">
          {requests && requests.length > 0 ? (
            requests.map((request) => {
              const isCompatible = profile?.blood_type
                ? isCompatibleBloodType(profile.blood_type, request.blood_type)
                : false
              const isNearby = profile?.location_city === request.profiles?.location_city

              return (
                <Card
                  key={request.id}
                  className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-full p-3">
                          <Heart className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{request.patient_name}</h3>
                          <p className="text-muted-foreground">Requested by {request.profiles?.full_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getUrgencyColor(request.urgency_level)} text-white`}>
                          {request.urgency_level.toUpperCase()}
                        </Badge>
                        {isCompatible && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            Compatible
                          </Badge>
                        )}
                        {isNearby && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">
                            Nearby
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Blood Type</p>
                          <p className="font-semibold text-lg">{request.blood_type}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Units Needed</p>
                          <p className="font-semibold">{request.units_needed}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-semibold">
                            {request.profiles?.location_city}, {request.profiles?.location_state}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Required By</p>
                          <p className="font-semibold">{formatDate(request.required_by_date)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Hospital</p>
                      <p className="font-semibold">{request.hospital_name}</p>
                      <p className="text-sm text-muted-foreground">{request.hospital_address}</p>
                    </div>

                    {request.description && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">Additional Information</p>
                        <p className="text-sm">{request.description}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Posted {formatDate(request.created_at)} at {formatTime(request.created_at)}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" asChild>
                          <Link href={`/requests/${request.id}`}>View Details</Link>
                        </Button>
                        {(profile?.user_type === "donor" || profile?.user_type === "both") && (
                          <Button asChild>
                            <Link href={`/requests/${request.id}/respond`}>
                              <Heart className="mr-2 h-4 w-4" />
                              Respond
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Active Requests</h3>
                <p className="text-muted-foreground mb-6">
                  There are currently no active blood requests in the system.
                </p>
                {(profile?.user_type === "recipient" || profile?.user_type === "both") && (
                  <Button asChild>
                    <Link href="/requests/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Request
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
