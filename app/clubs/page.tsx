"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, MapPin, Heart, Search, Plus, Star } from "lucide-react"
import Link from "next/link"

interface RotaractClub {
  id: string
  name: string
  district: string
  location: string
  description: string
  president_name: string
  president_contact: string
  member_count: number
  total_donations: number
  is_verified: boolean
  created_at: string
  logo_url?: string
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<RotaractClub[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [districtFilter, setDistrictFilter] = useState("all")
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchCurrentUser()
    fetchClubs()
  }, [])

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchClubs = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("rotaract_clubs")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setClubs(data || [])
    } catch (error) {
      console.error("Error fetching clubs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.district.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDistrict = districtFilter === "all" || club.district === districtFilter

    return matchesSearch && matchesDistrict
  })

  const uniqueDistricts = Array.from(new Set(clubs.map((club) => club.district))).sort()

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Rotaract Clubs</h1>
          <p className="text-muted-foreground">Connect with Rotaract clubs and join blood donation campaigns</p>
        </div>
        <Link href="/clubs/register">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Club
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find Clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clubs by name, location, or district..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {uniqueDistricts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClubs.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No clubs found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || districtFilter !== "all"
                    ? "Try adjusting your search filters."
                    : "Be the first to register your Rotaract club!"}
                </p>
                <Link href="/clubs/register">
                  <Button>Register Your Club</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredClubs.map((club) => (
            <Card key={club.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg text-balance">{club.name}</CardTitle>
                      {club.is_verified && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{club.district}</CardDescription>
                  </div>
                  {club.logo_url && (
                    <img
                      src={club.logo_url || "/placeholder.svg"}
                      alt={`${club.name} logo`}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{club.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{club.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{club.member_count} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>{club.total_donations} donations organized</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">President</p>
                  <p className="text-sm text-muted-foreground">{club.president_name}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/clubs/${club.id}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/clubs/${club.id}/join`}>
                    <Button className="flex-1">Join Club</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
