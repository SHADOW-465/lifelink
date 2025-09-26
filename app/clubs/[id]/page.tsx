"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, MapPin, Calendar, Heart, Star, Globe, Clock, ArrowLeft, UserPlus, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface ClubDetails {
  id: string
  name: string
  district: string
  location: string
  description: string
  president_name: string
  president_contact: string
  president_email: string
  member_count: number
  total_donations: number
  is_verified: boolean
  website_url?: string
  meeting_schedule?: string
  created_at: string
  logo_url?: string
}

interface ClubMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
  profile: {
    full_name: string
    avatar_url?: string
  }
}

interface ClubCampaign {
  id: string
  title: string
  description: string
  target_donations: number
  current_donations: number
  start_date: string
  end_date: string
  status: string
}

export default function ClubDetailsPage() {
  const params = useParams()
  const clubId = params.id as string

  const [club, setClub] = useState<ClubDetails | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [campaigns, setCampaigns] = useState<ClubCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (clubId) {
      fetchCurrentUser()
      fetchClubDetails()
      fetchClubMembers()
      fetchClubCampaigns()
    }
  }, [clubId])

  useEffect(() => {
    if (currentUser && members.length > 0) {
      checkMembership()
    }
  }, [currentUser, members])

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchClubDetails = async () => {
    try {
      const { data, error } = await supabase.from("rotaract_clubs").select("*").eq("id", clubId).single()

      if (error) throw error
      setClub(data)
    } catch (error) {
      console.error("Error fetching club details:", error)
    }
  }

  const fetchClubMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("club_members")
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("club_id", clubId)
        .eq("is_active", true)
        .order("joined_at", { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error("Error fetching club members:", error)
    }
  }

  const fetchClubCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("donation_campaigns")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error("Error fetching club campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkMembership = () => {
    const membership = members.find((member) => member.user_id === currentUser?.id)
    setIsMember(!!membership)
  }

  const joinClub = async () => {
    if (!currentUser) return

    try {
      const { error } = await supabase.from("club_members").insert({
        club_id: clubId,
        user_id: currentUser.id,
        role: "member",
        is_active: true,
      })

      if (error) throw error

      // Refresh members list
      fetchClubMembers()
    } catch (error) {
      console.error("Error joining club:", error)
    }
  }

  const leaveClub = async () => {
    if (!currentUser) return

    try {
      const { error } = await supabase
        .from("club_members")
        .update({ is_active: false })
        .eq("club_id", clubId)
        .eq("user_id", currentUser.id)

      if (error) throw error

      // Refresh members list
      fetchClubMembers()
    } catch (error) {
      console.error("Error leaving club:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Club not found</h3>
            <p className="text-muted-foreground text-center mb-4">
              The club you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/clubs">
              <Button>Browse Clubs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clubs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clubs
          </Button>
        </Link>
      </div>

      {/* Club Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {club.logo_url && (
                <img
                  src={club.logo_url || "/placeholder.svg"}
                  alt={`${club.name} logo`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl text-balance">{club.name}</CardTitle>
                  {club.is_verified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-lg">{club.district}</CardDescription>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {club.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {club.member_count} members
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {club.total_donations} donations
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {currentUser && (
                <>
                  {isMember ? (
                    <Button variant="outline" onClick={leaveClub}>
                      Leave Club
                    </Button>
                  ) : (
                    <Button onClick={joinClub}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Club
                    </Button>
                  )}
                  <Button variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{club.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Club Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Founded: {new Date(club.created_at).toLocaleDateString()}</span>
                </div>
                {club.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={club.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
                {club.meeting_schedule && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{club.meeting_schedule}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">President</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{club.president_name}</p>
                <p className="text-muted-foreground">{club.president_email}</p>
                <p className="text-muted-foreground">{club.president_contact}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Club Members</CardTitle>
              <CardDescription>Active members of {club.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar>
                      <AvatarImage src={member.profile.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{member.profile.full_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profile.full_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Donation Campaigns</CardTitle>
              <CardDescription>Blood donation drives organized by {club.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No campaigns yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        <Badge
                          variant={
                            campaign.status === "active"
                              ? "default"
                              : campaign.status === "completed"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {campaign.current_donations} / {campaign.target_donations} donations
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(campaign.start_date).toLocaleDateString()} -{" "}
                          {new Date(campaign.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.min((campaign.current_donations / campaign.target_donations) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from {club.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
