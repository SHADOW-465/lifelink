"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Users, Heart, TrendingUp, Shield, Search, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface AdminStats {
  totalUsers: number
  totalDonations: number
  pendingRequests: number
  flaggedUsers: number
  recentUsers: any[]
  recentDonations: any[]
  flaggedContent: any[]
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [userFilter, setUserFilter] = useState("all")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetchAdminStats()
    }
  }, [currentUser])

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchAdminStats = async () => {
    try {
      setLoading(true)

      // Fetch total users
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true })

      // Fetch total donations
      const { count: totalDonations } = await supabase.from("donations").select("*", { count: "exact", head: true })

      // Fetch pending requests
      const { count: pendingRequests } = await supabase
        .from("blood_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")

      // Fetch flagged users (users with reports)
      const { count: flaggedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_flagged", true)

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      // Fetch recent donations
      const { data: recentDonations } = await supabase
        .from("donations")
        .select(`
          *,
          donor:profiles!donations_donor_id_fkey(full_name),
          recipient:profiles!donations_recipient_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      // Fetch flagged content (for now, just flagged users)
      const { data: flaggedContent } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_flagged", true)
        .order("updated_at", { ascending: false })
        .limit(10)

      setStats({
        totalUsers: totalUsers || 0,
        totalDonations: totalDonations || 0,
        pendingRequests: pendingRequests || 0,
        flaggedUsers: flaggedUsers || 0,
        recentUsers: recentUsers || [],
        recentDonations: recentDonations || [],
        flaggedContent: flaggedContent || [],
      })
    } catch (error) {
      console.error("Error fetching admin stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", userId)

      if (error) throw error
      fetchAdminStats() // Refresh data
    } catch (error) {
      console.error("Error updating user status:", error)
    }
  }

  const toggleUserFlag = async (userId: string, currentFlag: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_flagged: !currentFlag }).eq("id", userId)

      if (error) throw error
      fetchAdminStats() // Refresh data
    } catch (error) {
      console.error("Error updating user flag:", error)
    }
  }

  // Check if user is admin
  if (!currentUser?.is_admin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              You don't have permission to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    )
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

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No admin data available</p>
        </div>
      </div>
    )
  }

  const filteredUsers = stats.recentUsers.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)

    const matchesFilter =
      userFilter === "all" ||
      (userFilter === "donors" && user.user_type === "donor") ||
      (userFilter === "recipients" && user.user_type === "recipient") ||
      (userFilter === "flagged" && user.is_flagged) ||
      (userFilter === "inactive" && !user.is_active)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, donations, and platform operations</p>
        </div>
        <Link href="/analytics">
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered on platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDonations}</div>
            <p className="text-xs text-muted-foreground">All time donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting donors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flaggedUsers}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="donations">Recent Donations</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="donors">Donors</SelectItem>
                    <SelectItem value="recipients">Recipients</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.full_name || "No name"}</p>
                          <Badge variant={user.user_type === "donor" ? "default" : "secondary"}>{user.user_type}</Badge>
                          {user.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                          {!user.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.id, user.is_active)}>
                          {user.is_active ? "Deactivate" : "Activate"} User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleUserFlag(user.id, user.is_flagged)}>
                          {user.is_flagged ? "Unflag" : "Flag"} User
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Monitor donation activities and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentDonations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{donation.blood_type} Blood Donation</p>
                        <Badge
                          variant={
                            donation.status === "completed"
                              ? "default"
                              : donation.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {donation.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {donation.donor?.full_name} → {donation.recipient?.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Content</CardTitle>
              <CardDescription>Review and moderate flagged users and content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.flaggedContent.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No flagged content to review</p>
                  </div>
                ) : (
                  stats.flaggedContent.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <p className="font-medium">{item.full_name}</p>
                          <Badge variant="destructive">Flagged User</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Flagged on {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleUserFlag(item.id, true)}>
                          Unflag
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => toggleUserStatus(item.id, true)}>
                          Suspend
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
