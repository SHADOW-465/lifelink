"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Heart, ArrowLeft, MapPin, Clock, User } from "lucide-react"
import Link from "next/link"

export default function CreateRequestPage() {
  const [formData, setFormData] = useState({
    patient_name: "",
    blood_type: "",
    units_needed: "1",
    urgency_level: "medium",
    hospital_name: "",
    hospital_address: "",
    hospital_phone: "",
    required_by_date: "",
    description: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const urgencyLevels = [
    { value: "low", label: "Low - Within a week", color: "text-green-600" },
    { value: "medium", label: "Medium - Within 3 days", color: "text-yellow-600" },
    { value: "high", label: "High - Within 24 hours", color: "text-orange-600" },
    { value: "critical", label: "Critical - Immediate", color: "text-red-600" },
  ]

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setUserProfile(profile)

      // Check if user can create requests
      if (profile?.user_type === "donor") {
        setError("Only recipients can create blood requests. Please update your profile if you need to request blood.")
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Validate required by date is in the future
      const requiredByDate = new Date(formData.required_by_date)
      if (requiredByDate <= new Date()) {
        throw new Error("Required by date must be in the future")
      }

      const { data, error } = await supabase
        .from("blood_requests")
        .insert({
          requester_id: user.id,
          patient_name: formData.patient_name,
          blood_type: formData.blood_type,
          units_needed: Number.parseInt(formData.units_needed),
          urgency_level: formData.urgency_level,
          hospital_name: formData.hospital_name,
          hospital_address: formData.hospital_address,
          hospital_phone: formData.hospital_phone || null,
          required_by_date: formData.required_by_date,
          description: formData.description || null,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/requests/${data.id}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0]

  if (userProfile?.user_type === "donor") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Only recipients can create blood requests. If you need to request blood, please update your profile to
              include "Recipient" as your user type.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/requests">View Requests</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/profile/edit">Update Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold text-foreground">Create Blood Request</h1>
            <p className="text-muted-foreground">Fill out the details to request blood donation</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Blood Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patient_name">Patient Name *</Label>
                      <Input
                        id="patient_name"
                        type="text"
                        required
                        value={formData.patient_name}
                        onChange={(e) => updateFormData("patient_name", e.target.value)}
                        placeholder="Enter patient's full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Blood Type *</Label>
                      <Select onValueChange={(value) => updateFormData("blood_type", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloodTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="units_needed">Units Needed *</Label>
                      <Select onValueChange={(value) => updateFormData("units_needed", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={formData.units_needed || "Select units"} />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} unit{num > 1 ? "s" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Urgency Level *</Label>
                      <Select onValueChange={(value) => updateFormData("urgency_level", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          {urgencyLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <span className={level.color}>{level.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="required_by_date">Required By Date *</Label>
                    <Input
                      id="required_by_date"
                      type="datetime-local"
                      required
                      min={today}
                      value={formData.required_by_date}
                      onChange={(e) => updateFormData("required_by_date", e.target.value)}
                    />
                  </div>
                </div>

                {/* Hospital Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Hospital Information
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="hospital_name">Hospital Name *</Label>
                    <Input
                      id="hospital_name"
                      type="text"
                      required
                      value={formData.hospital_name}
                      onChange={(e) => updateFormData("hospital_name", e.target.value)}
                      placeholder="Enter hospital name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospital_address">Hospital Address *</Label>
                    <Textarea
                      id="hospital_address"
                      required
                      value={formData.hospital_address}
                      onChange={(e) => updateFormData("hospital_address", e.target.value)}
                      placeholder="Enter complete hospital address"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospital_phone">Hospital Phone</Label>
                    <Input
                      id="hospital_phone"
                      type="tel"
                      value={formData.hospital_phone}
                      onChange={(e) => updateFormData("hospital_phone", e.target.value)}
                      placeholder="Enter hospital contact number"
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Additional Information
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      placeholder="Any additional information about the request..."
                      rows={4}
                    />
                  </div>
                </div>

                {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

                <div className="flex justify-end gap-4 pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/requests">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Heart className="mr-2 h-4 w-4" />
                    {isLoading ? "Creating Request..." : "Create Request"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
