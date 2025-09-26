"use client"

import type React from "react"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RegisterClubPage() {
  const [formData, setFormData] = useState({
    name: "",
    district: "",
    location: "",
    description: "",
    president_name: "",
    president_contact: "",
    president_email: "",
    member_count: "",
    website_url: "",
    meeting_schedule: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const validateForm = () => {
    if (!formData.name.trim()) return "Club name is required"
    if (!formData.district.trim()) return "District is required"
    if (!formData.location.trim()) return "Location is required"
    if (!formData.description.trim()) return "Description is required"
    if (!formData.president_name.trim()) return "President name is required"
    if (!formData.president_contact.trim()) return "President contact is required"
    if (!formData.president_email.trim()) return "President email is required"
    if (!formData.member_count || Number.parseInt(formData.member_count) < 1) return "Valid member count is required"

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.president_email)) return "Valid email is required"

    // Phone validation (basic)
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(formData.president_contact.replace(/\s/g, ""))) return "Valid phone number is required"

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError("")

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("You must be logged in to register a club")
        return
      }

      // Insert club data
      const { data, error: insertError } = await supabase
        .from("rotaract_clubs")
        .insert({
          name: formData.name.trim(),
          district: formData.district.trim(),
          location: formData.location.trim(),
          description: formData.description.trim(),
          president_name: formData.president_name.trim(),
          president_contact: formData.president_contact.trim(),
          president_email: formData.president_email.trim(),
          member_count: Number.parseInt(formData.member_count),
          website_url: formData.website_url.trim() || null,
          meeting_schedule: formData.meeting_schedule.trim() || null,
          registered_by: user.id,
          is_verified: false,
          total_donations: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/clubs/${data.id}`)
      }, 2000)
    } catch (error: any) {
      console.error("Error registering club:", error)
      setError(error.message || "Failed to register club. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Club Registered Successfully!</h2>
            <p className="text-muted-foreground text-center mb-6">
              Your Rotaract club has been registered and is pending verification. You'll be redirected to your club page
              shortly.
            </p>
            <div className="flex gap-4">
              <Link href="/clubs">
                <Button variant="outline">Browse Clubs</Button>
              </Link>
              <Button onClick={() => router.push("/clubs")}>View All Clubs</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clubs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clubs
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-balance">Register Rotaract Club</h1>
          <p className="text-muted-foreground">Add your club to the blood donation network</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Club Information
          </CardTitle>
          <CardDescription>
            Provide details about your Rotaract club to join our blood donation platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Club Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Rotaract Club of..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => handleInputChange("district", e.target.value)}
                    placeholder="e.g., District 3190"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="City, State, Country"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of your club's activities and mission..."
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* President Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">President Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="president_name">President Name *</Label>
                  <Input
                    id="president_name"
                    value={formData.president_name}
                    onChange={(e) => handleInputChange("president_name", e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="president_contact">President Phone *</Label>
                  <Input
                    id="president_contact"
                    value={formData.president_contact}
                    onChange={(e) => handleInputChange("president_contact", e.target.value)}
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="president_email">President Email *</Label>
                <Input
                  id="president_email"
                  type="email"
                  value={formData.president_email}
                  onChange={(e) => handleInputChange("president_email", e.target.value)}
                  placeholder="president@example.com"
                  required
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member_count">Member Count *</Label>
                  <Input
                    id="member_count"
                    type="number"
                    min="1"
                    value={formData.member_count}
                    onChange={(e) => handleInputChange("member_count", e.target.value)}
                    placeholder="25"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange("website_url", e.target.value)}
                    placeholder="https://yourclub.org"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_schedule">Meeting Schedule</Label>
                <Input
                  id="meeting_schedule"
                  value={formData.meeting_schedule}
                  onChange={(e) => handleInputChange("meeting_schedule", e.target.value)}
                  placeholder="e.g., Every Tuesday 7:00 PM"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Link href="/clubs" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Registering..." : "Register Club"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
