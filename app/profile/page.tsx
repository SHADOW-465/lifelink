import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MapPin, Phone, Mail, Calendar, User, Shield, Edit, Activity } from "lucide-react"
import Link from "next/link"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: donationHistory } = await supabase
    .from("donation_history")
    .select("*")
    .eq("donor_id", user.id)
    .order("donation_date", { ascending: false })
    .limit(5)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your information and donation preferences</p>
          </div>
          <Button asChild>
            <Link href="/profile/edit">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={profile?.profile_image_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl">
                    {profile?.full_name ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant={profile?.is_verified ? "default" : "secondary"}>
                    <Shield className="mr-1 h-3 w-3" />
                    {profile?.is_verified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge
                    variant={profile?.is_available ? "default" : "destructive"}
                    className={profile?.is_available ? "bg-green-600" : ""}
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    {profile?.is_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Blood Type</p>
                    <p className="text-2xl font-bold text-primary">{profile?.blood_type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">User Type</p>
                    <p className="text-muted-foreground capitalize">{profile?.user_type}</p>
                  </div>
                </div>

                {profile?.location_city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Location</p>
                      <p className="text-muted-foreground">
                        {profile.location_city}, {profile.location_state}
                      </p>
                    </div>
                  </div>
                )}

                {profile?.last_donation_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Last Donation</p>
                      <p className="text-muted-foreground">{formatDate(profile.last_donation_date)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Details and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>

                {profile?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Phone</p>
                      <p className="text-muted-foreground">{profile.phone}</p>
                    </div>
                  </div>
                )}

                {profile?.emergency_contact_name && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Emergency Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{profile.emergency_contact_name}</span>
                      </div>
                      {profile.emergency_contact_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{profile.emergency_contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Blood Type</p>
                    <p className="text-2xl font-bold text-primary">{profile?.blood_type}</p>
                  </div>

                  {profile?.date_of_birth && (
                    <div>
                      <p className="font-semibold">Date of Birth</p>
                      <p className="text-muted-foreground">{formatDate(profile.date_of_birth)}</p>
                    </div>
                  )}

                  {profile?.gender && (
                    <div>
                      <p className="font-semibold">Gender</p>
                      <p className="text-muted-foreground capitalize">{profile.gender}</p>
                    </div>
                  )}
                </div>

                {profile?.medical_conditions && profile.medical_conditions.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">Medical Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.medical_conditions.map((condition, index) => (
                        <Badge key={index} variant="outline">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donation History */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Donation History</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/donations/history">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {donationHistory && donationHistory.length > 0 ? (
                  <div className="space-y-4">
                    {donationHistory.map((donation) => (
                      <div
                        key={donation.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 rounded-full p-2">
                            <Heart className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {donation.blood_type} - {donation.units_donated} unit(s)
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {donation.hospital_name || "Blood Drive Event"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDate(donation.donation_date)}</p>
                          <Badge variant="outline" className="text-xs">
                            {donation.donation_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No donation history yet</p>
                    <p className="text-sm">Start by responding to blood requests!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
