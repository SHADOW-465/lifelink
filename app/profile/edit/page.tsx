"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Heart, Upload, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/lib/types/database"

export default function EditProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    blood_type: "",
    user_type: "",
    location_city: "",
    location_state: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    is_available: true,
  })
  const [medicalConditions, setMedicalConditions] = useState<string[]>([])
  const [newCondition, setNewCondition] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const router = useRouter()

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const userTypes = [
    { value: "donor", label: "Blood Donor" },
    { value: "recipient", label: "Blood Recipient" },
    { value: "both", label: "Both Donor & Recipient" },
  ]
  const genders = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error

      setProfile(profileData)
      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        date_of_birth: profileData.date_of_birth || "",
        gender: profileData.gender || "",
        blood_type: profileData.blood_type || "",
        user_type: profileData.user_type || "",
        location_city: profileData.location_city || "",
        location_state: profileData.location_state || "",
        emergency_contact_name: profileData.emergency_contact_name || "",
        emergency_contact_phone: profileData.emergency_contact_phone || "",
        is_available: profileData.is_available ?? true,
      })
      setMedicalConditions(profileData.medical_conditions || [])
    } catch (error) {
      console.error("Error loading profile:", error)
      setError("Failed to load profile")
    } finally {
      setIsLoadingProfile(false)
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

      const { error } = await supabase
        .from("profiles")
        .update({
          ...formData,
          medical_conditions: medicalConditions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      router.push("/profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addMedicalCondition = () => {
    if (newCondition.trim() && !medicalConditions.includes(newCondition.trim())) {
      setMedicalConditions((prev) => [...prev, newCondition.trim()])
      setNewCondition("")
    }
  }

  const removeMedicalCondition = (condition: string) => {
    setMedicalConditions((prev) => prev.filter((c) => c !== condition))
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground">Update your information and preferences</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Picture */}
            <div className="lg:col-span-1">
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <Avatar className="w-32 h-32 mx-auto">
                    <AvatarImage src={profile?.profile_image_url || "/placeholder.svg"} />
                    <AvatarFallback className="text-3xl">
                      {formData.full_name ? getInitials(formData.full_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" className="w-full bg-transparent">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
                </CardContent>
              </Card>
            </div>

            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => updateFormData("full_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateFormData("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => updateFormData("date_of_birth", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={formData.gender} onValueChange={(value) => updateFormData("gender", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genders.map((gender) => (
                            <SelectItem key={gender.value} value={gender.value}>
                              {gender.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Type *</Label>
                      <Select
                        value={formData.blood_type}
                        onValueChange={(value) => updateFormData("blood_type", value)}
                      >
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

                  <div className="space-y-2">
                    <Label>I am a *</Label>
                    <Select value={formData.user_type} onValueChange={(value) => updateFormData("user_type", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        {userTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location_city">City</Label>
                      <Input
                        id="location_city"
                        type="text"
                        value={formData.location_city}
                        onChange={(e) => updateFormData("location_city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location_state">State</Label>
                      <Input
                        id="location_state"
                        type="text"
                        value={formData.location_state}
                        onChange={(e) => updateFormData("location_state", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        type="text"
                        value={formData.emergency_contact_name}
                        onChange={(e) => updateFormData("emergency_contact_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                      <Input
                        id="emergency_contact_phone"
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => updateFormData("emergency_contact_phone", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Conditions */}
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Medical Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add medical condition"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMedicalCondition())}
                    />
                    <Button type="button" onClick={addMedicalCondition}>
                      Add
                    </Button>
                  </div>

                  {medicalConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {medicalConditions.map((condition, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-sm"
                        >
                          <span>{condition}</span>
                          <button
                            type="button"
                            onClick={() => removeMedicalCondition(condition)}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Availability */}
              <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => updateFormData("is_available", checked as boolean)}
                    />
                    <Label htmlFor="is_available">I am currently available for blood donation/requests</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/profile">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
