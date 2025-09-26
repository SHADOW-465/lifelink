"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Heart, ArrowLeft, User, Clock, MapPin } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function RespondToRequestPage({ params }: PageProps) {
  const [requestId, setRequestId] = useState<string>("")
  const [request, setRequest] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setRequestId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (requestId) {
      loadData()
    }
  }, [requestId])

  const loadData = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Load user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setUserProfile(profile)

      // Check if user can respond
      if (profile?.user_type === "recipient") {
        setError("Only donors can respond to blood requests. Please update your profile if you want to donate blood.")
        return
      }

      // Load request details
      const { data: requestData } = await supabase
        .from("blood_requests")
        .select(`
          *,
          profiles!blood_requests_requester_id_fkey(full_name, location_city, location_state)
        `)
        .eq("id", requestId)
        .single()

      if (!requestData) {
        setError("Request not found")
        return
      }

      if (requestData.requester_id === user.id) {
        setError("You cannot respond to your own request")
        return
      }

      if (!requestData.is_active || requestData.is_fulfilled) {
        setError("This request is no longer active")
        return
      }

      // Check if user has already responded
      const { data: existingResponse } = await supabase
        .from("donation_responses")
        .select("*")
        .eq("request_id", requestId)
        .eq("donor_id", user.id)
        .single()

      if (existingResponse) {
        setError("You have already responded to this request")
        return
      }

      setRequest(requestData)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load request details")
    } finally {
      setIsLoadingData(false)
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

      const { error } = await supabase.from("donation_responses").insert({
        request_id: requestId,
        donor_id: user.id,
        status: "pending",
        response_message: responseMessage.trim() || null,
      })

      if (error) throw error

      router.push(`/requests/${requestId}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const isCompatibleBloodType = (donorType: string, requestedType: string) => {
    const compatibility: Record<string, string[]> = {
      "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      "O+": ["O+", "A+", "B+", "AB+"],
      "A-": ["A-", "A+", "AB-", "AB+"],
      "A+": ["A+", "AB+"],
      "B-": ["B-", "B+", "AB-", "AB+"],
      "B+": ["B+", "AB+"],
      "AB-": ["AB-", "AB+"],
      "AB+": ["AB+"],
    }

    return compatibility[donorType]?.includes(requestedType) || false
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Unable to Respond</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/requests">View Requests</Link>
              </Button>
              {error.includes("profile") && (
                <Button asChild className="flex-1">
                  <Link href="/profile/edit">Update Profile</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCompatible =
    userProfile?.blood_type && request?.blood_type
      ? isCompatibleBloodType(userProfile.blood_type, request.blood_type)
      : false

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/requests/${requestId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Respond to Blood Request</h1>
            <p className="text-muted-foreground">Help save a life by donating blood</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Request Summary */}
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Request Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Type</p>
                    <p className="text-xl font-bold text-primary">{request?.blood_type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-full p-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-semibold">{request?.patient_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-muted rounded-full p-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Required By</p>
                    <p className="font-semibold text-sm">{formatDateTime(request?.required_by_date)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-muted rounded-full p-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hospital</p>
                  <p className="font-semibold">{request?.hospital_name}</p>
                  <p className="text-sm text-muted-foreground">{request?.hospital_address}</p>
                </div>
              </div>

              {/* Compatibility Check */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Blood Type Compatibility</p>
                    <p className="text-sm text-muted-foreground">
                      Your blood type: {userProfile?.blood_type} → Requested: {request?.blood_type}
                    </p>
                  </div>
                  <div>
                    {isCompatible ? (
                      <div className="text-green-600 font-semibold">✓ Compatible</div>
                    ) : (
                      <div className="text-red-600 font-semibold">✗ Not Compatible</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Form */}
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Your Response</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="response_message">Message to Requester (Optional)</Label>
                  <Textarea
                    id="response_message"
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Let them know when you're available, any questions you have, or words of encouragement..."
                    rows={4}
                  />
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• The requester will be notified of your response</li>
                    <li>• They may contact you to coordinate the donation</li>
                    <li>• You'll receive updates about the donation process</li>
                    <li>• You can chat with the requester through our secure messaging</li>
                  </ul>
                </div>

                {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

                <div className="flex justify-end gap-4">
                  <Button variant="outline" asChild>
                    <Link href={`/requests/${requestId}`}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Heart className="mr-2 h-4 w-4" />
                    {isLoading ? "Sending Response..." : "Send Response"}
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
