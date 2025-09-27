"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Heart, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { BloodType, UrgencyLevel } from "@prisma/client"

export default function CreateRequestPage() {
  const [formData, setFormData] = useState({
    bloodType: "",
    unitsRequired: 1,
    urgency: "NORMAL",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const bloodTypes = Object.values(BloodType)
  const urgencyLevels = Object.values(UrgencyLevel)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!formData.bloodType) {
      setError("Please select a blood type.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create blood request.")
      }

      const newRequest = await response.json();
      // Redirect to the main dashboard or the new request's page
      router.push("/dashboard")

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4 flex justify-center">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Blood Request</h1>
            <p className="text-muted-foreground">Enter the details for your request.</p>
          </div>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Your current location will be used for the request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Blood Type *</Label>
                <Select required onValueChange={(value) => updateFormData("bloodType", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Units Needed *</Label>
                <Select required defaultValue="1" onValueChange={(value) => updateFormData("unitsRequired", parseInt(value))}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select units" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} unit{num > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urgency Level *</Label>
                <Select required defaultValue="NORMAL" onValueChange={(value) => updateFormData("urgency", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  <Heart className="mr-2 h-4 w-4" />
                  {isLoading ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}