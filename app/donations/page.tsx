"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, User, Heart, Clock, Search } from "lucide-react"
import Link from "next/link"

interface Donation {
  id: string
  donor_id: string
  recipient_id: string
  blood_type: string
  quantity: number
  status: "pending" | "confirmed" | "completed" | "cancelled"
  donation_date: string
  location: string
  notes: string
  created_at: string
  donor: {
    full_name: string
    phone: string
  }
  recipient: {
    full_name: string
    phone: string
  }
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [bloodTypeFilter, setBloodTypeFilter] = useState<string>("all")
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchDonations()
    }
  }, [currentUser, statusFilter, bloodTypeFilter])

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchDonations = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("donations")
        .select(`
          *,
          donor:profiles!donations_donor_id_fkey(full_name, phone),
          recipient:profiles!donations_recipient_id_fkey(full_name, phone)
        `)
        .order("created_at", { ascending: false })

      // Filter by user role
      if (currentUser?.user_type === "donor") {
        query = query.eq("donor_id", currentUser.id)
      } else if (currentUser?.user_type === "recipient") {
        query = query.eq("recipient_id", currentUser.id)
      }

      // Apply filters
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      if (bloodTypeFilter !== "all") {
        query = query.eq("blood_type", bloodTypeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setDonations(data || [])
    } catch (error) {
      console.error("Error fetching donations:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateDonationStatus = async (donationId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("donations").update({ status: newStatus }).eq("id", donationId)

      if (error) throw error

      // Refresh donations
      fetchDonations()
    } catch (error) {
      console.error("Error updating donation status:", error)
    }
  }

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch =
      donation.donor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.recipient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.blood_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.location.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "confirmed":
        return "default"
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <Calendar className="h-4 w-4" />
      case "completed":
        return <Heart className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Donation History</h1>
          <p className="text-muted-foreground">Track your donation activities and history</p>
        </div>
        <Link href="/requests/create">
          <Button>
            <Heart className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search donations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bloodTypeFilter} onValueChange={setBloodTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by blood type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Types</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Donations List */}
      <div className="space-y-4">
        {filteredDonations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No donations found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all" || bloodTypeFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Start by creating a blood request or responding to existing requests."}
              </p>
              <Link href="/requests">
                <Button>Browse Requests</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredDonations.map((donation) => (
            <Card key={donation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(donation.status)}
                      <CardTitle className="text-lg">{donation.blood_type} Blood Donation</CardTitle>
                    </div>
                    <Badge variant={getStatusColor(donation.status)}>{donation.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(donation.created_at).toLocaleDateString()}
                  </div>
                </div>
                <CardDescription>Donation ID: {donation.id.slice(0, 8)}...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Donor:</span>
                      <span className="text-sm">{donation.donor.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Recipient:</span>
                      <span className="text-sm">{donation.recipient.full_name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Location:</span>
                      <span className="text-sm">{donation.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Date:</span>
                      <span className="text-sm">{new Date(donation.donation_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {donation.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{donation.notes}</p>
                  </div>
                )}

                {/* Action buttons for different user types and statuses */}
                <div className="flex gap-2 pt-2">
                  {currentUser?.user_type === "donor" && donation.status === "pending" && (
                    <Button size="sm" onClick={() => updateDonationStatus(donation.id, "confirmed")}>
                      Confirm Donation
                    </Button>
                  )}
                  {currentUser?.user_type === "recipient" && donation.status === "confirmed" && (
                    <Button size="sm" onClick={() => updateDonationStatus(donation.id, "completed")}>
                      Mark as Completed
                    </Button>
                  )}
                  {donation.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => updateDonationStatus(donation.id, "cancelled")}>
                      Cancel
                    </Button>
                  )}
                  <Link
                    href={`/messages/${donation.id}/${currentUser?.user_type === "donor" ? donation.recipient_id : donation.donor_id}`}
                  >
                    <Button size="sm" variant="outline">
                      Message
                    </Button>
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
