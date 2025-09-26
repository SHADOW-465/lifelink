import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MapPin, Clock, User, Phone, Mail, ArrowLeft, MessageCircle } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RequestDetailsPage({ params }: PageProps) {
  const { id } = await params
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

  // Get blood request with requester details
  const { data: request } = await supabase
    .from("blood_requests")
    .select(`
      *,
      profiles!blood_requests_requester_id_fkey(
        full_name, 
        phone, 
        email, 
        location_city, 
        location_state,
        profile_image_url
      )
    `)
    .eq("id", id)
    .single()

  if (!request) {
    notFound()
  }

  // Get donation responses for this request
  const { data: responses } = await supabase
    .from("donation_responses")
    .select(`
      *,
      profiles!donation_responses_donor_id_fkey(
        full_name,
        phone,
        email,
        blood_type,
        profile_image_url
      )
    `)
    .eq("request_id", id)
    .order("created_at", { ascending: false })

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600"
      case "accepted":
        return "bg-blue-600"
      case "pending":
        return "bg-yellow-500"
      case "declined":
        return "bg-red-600"
      case "cancelled":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
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

  const canRespond =
    (profile?.user_type === "donor" || profile?.user_type === "both") &&
    request.requester_id !== user.id &&
    request.is_active &&
    !request.is_fulfilled

  const isRequester = request.requester_id === user.id
  const hasResponded = responses?.some((r) => r.donor_id === user.id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link href="/requests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blood Request Details</h1>
            <p className="text-muted-foreground">Request ID: {request.id.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Request Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Overview */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    {request.patient_name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={`${getUrgencyColor(request.urgency_level)} text-white`}>
                      {request.urgency_level.toUpperCase()}
                    </Badge>
                    {request.is_fulfilled && <Badge className="bg-green-600 text-white">FULFILLED</Badge>}
                    {!request.is_active && <Badge variant="secondary">INACTIVE</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Type</p>
                      <p className="text-2xl font-bold text-primary">{request.blood_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-full p-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Units Needed</p>
                      <p className="text-xl font-semibold">{request.units_needed}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-full p-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Required By</p>
                      <p className="text-lg font-semibold">{formatDateTime(request.required_by_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-full p-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-lg font-semibold">
                        {request.profiles?.location_city}, {request.profiles?.location_state}
                      </p>
                    </div>
                  </div>
                </div>

                {request.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional Information</h4>
                    <p className="text-muted-foreground">{request.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Hospital Details</h4>
                  <div className="space-y-2">
                    <p className="font-medium">{request.hospital_name}</p>
                    <p className="text-muted-foreground">{request.hospital_address}</p>
                    {request.hospital_phone && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {request.hospital_phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">Posted on {formatDateTime(request.created_at)}</div>
              </CardContent>
            </Card>

            {/* Responses */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Donor Responses ({responses?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {responses && responses.length > 0 ? (
                  <div className="space-y-4">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={response.profiles?.profile_image_url || "/placeholder.svg"} />
                            <AvatarFallback>
                              {response.profiles?.full_name ? getInitials(response.profiles.full_name) : "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{response.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">Blood Type: {response.profiles?.blood_type}</p>
                            {response.response_message && (
                              <p className="text-sm text-muted-foreground mt-1">"{response.response_message}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`${getStatusColor(response.status)} text-white mb-2`}>
                            {response.status.toUpperCase()}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{formatDateTime(response.created_at)}</p>
                          {isRequester && response.status === "pending" && (
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" variant="outline">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No responses yet</p>
                    <p className="text-sm">Be the first to respond to this request!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requester Info */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Requester Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.profiles?.profile_image_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      {request.profiles?.full_name ? getInitials(request.profiles.full_name) : "R"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{request.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.profiles?.location_city}, {request.profiles?.location_state}
                    </p>
                  </div>
                </div>

                {!isRequester && (
                  <div className="space-y-2">
                    {request.profiles?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.profiles.phone}</span>
                      </div>
                    )}
                    {request.profiles?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{request.profiles.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                {canRespond && !hasResponded && (
                  <>
                    <Button className="w-full" asChild>
                      <Link href={`/requests/${request.id}/respond`}>
                        <Heart className="mr-2 h-4 w-4" />
                        Respond to Request
                      </Link>
                    </Button>
                    {profile?.blood_type && isCompatibleBloodType(profile.blood_type, request.blood_type) && (
                      <div className="text-center">
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          Your blood type is compatible!
                        </Badge>
                      </div>
                    )}
                  </>
                )}

                {hasResponded && (
                  <div className="text-center">
                    <Badge className="bg-blue-600 text-white mb-2">You have responded to this request</Badge>
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href={`/messages/${request.id}/${request.requester_id}`}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat with Requester
                      </Link>
                    </Button>
                  </div>
                )}

                {isRequester && responses && responses.length > 0 && (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full bg-transparent">
                      Edit Request
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href={`/messages/${request.id}`}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        View All Chats
                      </Link>
                    </Button>
                    <Button variant="destructive" className="w-full">
                      Cancel Request
                    </Button>
                  </div>
                )}

                <Button variant="outline" className="w-full bg-transparent">
                  <MapPin className="mr-2 h-4 w-4" />
                  View on Map
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
