"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { User } from "@prisma/client"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function EditProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    isAvailable: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsFetching(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push("/auth/login")
        return
      }

      try {
        // In a real app, we'd fetch this from our own API to use Prisma
        // For now, we'll just get the auth user's email as a placeholder
        // This will be replaced when we build the API route to fetch user data.

        // Let's assume we have an API to get the full profile
        const response = await fetch('/api/user/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const profileData: User = await response.json();

        setUser(profileData)
        setFormData({
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          isAvailable: profileData.isAvailable,
        })
      } catch (err) {
        setError("Could not load user profile. Please try again.")
      } finally {
        setIsFetching(false)
      }
    }

    fetchUserProfile()
  }, [router, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
        const response = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile.');
        }

        // Redirect to the main dashboard on success
        router.push('/dashboard');

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred while saving.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isFetching) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading profile...</p></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4 flex justify-center">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
                <p className="text-muted-foreground">Update your personal information.</p>
            </div>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Keep your details up to date to ensure the best experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={formData.firstName} onChange={(e) => updateFormData("firstName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={formData.lastName} onChange={(e) => updateFormData("lastName", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => updateFormData("phone", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateFormData("address", e.target.value)} />
                <p className="text-xs text-muted-foreground pt-1">Your exact address is never shown to others.</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <Label htmlFor="isAvailable" className="font-semibold">Available for Donations</Label>
                    <p className="text-xs text-muted-foreground">Turn this off if you are temporarily unable to donate.</p>
                </div>
                <Switch
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => updateFormData("isAvailable", checked)}
                />
              </div>

              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}