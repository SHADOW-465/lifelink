"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Heart, TrendingUp, MapPin, Clock, Download } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface AnalyticsData {
  totalDonations: number
  activeDonors: number
  successfulMatches: number
  averageResponseTime: number
  donationsByMonth: Array<{ month: string; donations: number; requests: number }>
  donationsByBloodType: Array<{ bloodType: string; count: number; percentage: number }>
  donationsByLocation: Array<{ city: string; count: number }>
  recentActivity: Array<{
    id: string
    type: "donation" | "request" | "match"
    description: string
    timestamp: string
    status: string
  }>
}

const COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899"]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
      startDate.setDate(endDate.getDate() - days)

      // Fetch donations data
      const { data: donations } = await supabase
        .from("donations")
        .select(
          "*, donor:profiles!donations_donor_id_fkey(full_name), recipient:profiles!donations_recipient_id_fkey(full_name)",
        )
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      // Fetch blood requests data
      const { data: requests } = await supabase
        .from("blood_requests")
        .select("*, requester:profiles!blood_requests_requester_id_fkey(full_name)")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      // Fetch active donors
      const { data: activeDonors } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_type", "donor")
        .eq("is_available", true)

      // Process data for charts
      const donationsByMonth = processMonthlyData(donations || [], requests || [])
      const donationsByBloodType = processBloodTypeData(donations || [])
      const donationsByLocation = processLocationData(donations || [])
      const recentActivity = processRecentActivity(donations || [], requests || [])

      // Calculate metrics
      const totalDonations = donations?.length || 0
      const successfulMatches = donations?.filter((d) => d.status === "completed").length || 0
      const averageResponseTime = calculateAverageResponseTime(donations || [])

      setData({
        totalDonations,
        activeDonors: activeDonors?.length || 0,
        successfulMatches,
        averageResponseTime,
        donationsByMonth,
        donationsByBloodType,
        donationsByLocation,
        recentActivity,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const processMonthlyData = (donations: any[], requests: any[]) => {
    const monthlyData: { [key: string]: { donations: number; requests: number } } = {}

    // Process donations
    donations.forEach((donation) => {
      const month = new Date(donation.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthlyData[month]) monthlyData[month] = { donations: 0, requests: 0 }
      monthlyData[month].donations++
    })

    // Process requests
    requests.forEach((request) => {
      const month = new Date(request.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthlyData[month]) monthlyData[month] = { donations: 0, requests: 0 }
      monthlyData[month].requests++
    })

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      donations: data.donations,
      requests: data.requests,
    }))
  }

  const processBloodTypeData = (donations: any[]) => {
    const bloodTypeCounts: { [key: string]: number } = {}
    const total = donations.length

    donations.forEach((donation) => {
      const bloodType = donation.blood_type || "Unknown"
      bloodTypeCounts[bloodType] = (bloodTypeCounts[bloodType] || 0) + 1
    })

    return Object.entries(bloodTypeCounts).map(([bloodType, count]) => ({
      bloodType,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }

  const processLocationData = (donations: any[]) => {
    const locationCounts: { [key: string]: number } = {}

    donations.forEach((donation) => {
      const city = donation.location?.split(",")[0] || "Unknown"
      locationCounts[city] = (locationCounts[city] || 0) + 1
    })

    return Object.entries(locationCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const processRecentActivity = (donations: any[], requests: any[]) => {
    const activities: any[] = []

    donations.forEach((donation) => {
      activities.push({
        id: donation.id,
        type: "donation",
        description: `${donation.donor?.full_name || "Anonymous"} donated ${donation.blood_type} blood`,
        timestamp: donation.created_at,
        status: donation.status,
      })
    })

    requests.forEach((request) => {
      activities.push({
        id: request.id,
        type: "request",
        description: `${request.requester?.full_name || "Anonymous"} requested ${request.blood_type} blood`,
        timestamp: request.created_at,
        status: request.status,
      })
    })

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20)
  }

  const calculateAverageResponseTime = (donations: any[]) => {
    const completedDonations = donations.filter((d) => d.status === "completed" && d.response_time)
    if (completedDonations.length === 0) return 0

    const totalTime = completedDonations.reduce((sum, d) => sum + (d.response_time || 0), 0)
    return Math.round(totalTime / completedDonations.length)
  }

  const exportData = () => {
    if (!data) return

    const csvContent = [
      ["Metric", "Value"],
      ["Total Donations", data.totalDonations],
      ["Active Donors", data.activeDonors],
      ["Successful Matches", data.successfulMatches],
      ["Average Response Time (hours)", data.averageResponseTime],
      [""],
      ["Blood Type", "Count", "Percentage"],
      ...data.donationsByBloodType.map((item) => [item.bloodType, item.count, `${item.percentage}%`]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `blood-donation-analytics-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track donation performance and platform metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant={timeRange === "7d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("7d")}>
              7 Days
            </Button>
            <Button variant={timeRange === "30d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("30d")}>
              30 Days
            </Button>
            <Button variant={timeRange === "90d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("90d")}>
              90 Days
            </Button>
          </div>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDonations}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "90 days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeDonors}</div>
            <p className="text-xs text-muted-foreground">Available for donation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Matches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.successfulMatches}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalDonations > 0 ? Math.round((data.successfulMatches / data.totalDonations) * 100) : 0}% success
              rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageResponseTime}h</div>
            <p className="text-xs text-muted-foreground">From request to match</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Donations vs Requests</CardTitle>
                <CardDescription>Monthly comparison of donations and requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.donationsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="donations"
                      stackId="1"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stackId="1"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Blood Type Distribution</CardTitle>
                <CardDescription>Donations by blood type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.donationsByBloodType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ bloodType, percentage }) => `${bloodType} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.donationsByBloodType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Donation Locations</CardTitle>
              <CardDescription>Cities with the most donation activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.donationsByLocation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Blood Type Breakdown</CardTitle>
                <CardDescription>Detailed statistics by blood type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.donationsByBloodType.map((item, index) => (
                    <div key={item.bloodType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{item.bloodType}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{item.count} donations</span>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Donation activity by location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.donationsByLocation.slice(0, 8).map((item, index) => (
                    <div key={item.city} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.city}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(item.count / data.donationsByLocation[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest donations and requests on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "donation"
                            ? "bg-green-500"
                            : activity.type === "request"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()} at{" "}
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        activity.status === "completed"
                          ? "default"
                          : activity.status === "pending"
                            ? "secondary"
                            : activity.status === "urgent"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
