"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Heart, ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ScreeningQuestion {
  id: string
  question: string
  type: "yes_no" | "multiple_choice" | "text"
  options?: string[]
  critical?: boolean // If true, "yes" answer disqualifies donor
}

const screeningQuestions: ScreeningQuestion[] = [
  {
    id: "age",
    question: "Are you between 18-65 years old?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "weight",
    question: "Do you weigh at least 50 kg (110 lbs)?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "recent_illness",
    question: "Have you had any cold, flu, or fever in the past 2 weeks?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "recent_medication",
    question: "Are you currently taking any antibiotics or blood thinners?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "recent_donation",
    question: "Have you donated blood in the past 3 months?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "pregnancy",
    question: "Are you currently pregnant or have you been pregnant in the past 6 months?",
    type: "yes_no",
    critical: true,
  },
  {
    id: "chronic_conditions",
    question: "Do you have any chronic medical conditions (diabetes, heart disease, etc.)?",
    type: "yes_no",
  },
  {
    id: "recent_travel",
    question: "Have you traveled to any malaria-endemic areas in the past year?",
    type: "yes_no",
  },
  {
    id: "tattoo_piercing",
    question: "Have you gotten a tattoo or piercing in the past 6 months?",
    type: "yes_no",
  },
  {
    id: "additional_info",
    question: "Any additional medical information you'd like to share?",
    type: "text",
  },
]

export default function MedicalScreeningPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEligible, setIsEligible] = useState<boolean | null>(null)
  const router = useRouter()

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const checkEligibility = () => {
    const criticalQuestions = screeningQuestions.filter((q) => q.critical)

    for (const question of criticalQuestions) {
      const answer = answers[question.id]

      // For critical questions, "yes" usually disqualifies (except age and weight)
      if (question.id === "age" || question.id === "weight") {
        if (answer === "no") return false
      } else {
        if (answer === "yes") return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const eligible = checkEligibility()
    setIsEligible(eligible)

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Save screening results
      const screeningData = {
        user_id: user.id,
        answers: answers,
        is_eligible: eligible,
        screening_date: new Date().toISOString(),
      }

      // You would typically save this to a screening_results table
      // For now, we'll update the profile with eligibility status
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_available: eligible,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      // Redirect after a delay to show results
      setTimeout(() => {
        router.push("/profile")
      }, 3000)
    } catch (error) {
      console.error("Error saving screening:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const allQuestionsAnswered = screeningQuestions.every((q) => (q.type === "text" ? true : answers[q.id]))

  if (isEligible !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                isEligible ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {isEligible ? (
                <Heart className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isEligible ? "Eligible to Donate!" : "Not Eligible at This Time"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isEligible ? (
              <div>
                <p className="text-muted-foreground mb-4">
                  Great news! Based on your screening, you're eligible to donate blood. Your profile has been updated to
                  show you're available.
                </p>
                <p className="text-sm text-muted-foreground">Redirecting to your profile...</p>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  Based on your responses, you're not eligible to donate blood at this time. This is for your safety and
                  the safety of recipients.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please consult with a healthcare provider if you have questions about your eligibility.
                </p>
              </div>
            )}
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
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Medical Screening</h1>
            <p className="text-muted-foreground">
              Please answer these questions to determine your eligibility to donate blood
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Blood Donation Eligibility Screening
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {screeningQuestions.map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <Label className="text-base font-medium">
                      {index + 1}. {question.question}
                      {question.critical && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {question.type === "yes_no" && (
                      <RadioGroup
                        value={answers[question.id] || ""}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                          <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`${question.id}-no`} />
                          <Label htmlFor={`${question.id}-no`}>No</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {question.type === "text" && (
                      <Textarea
                        placeholder="Please provide details..."
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={3}
                      />
                    )}
                  </div>
                ))}

                {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

                <div className="flex justify-end gap-4 pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/profile">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={!allQuestionsAnswered || isLoading}>
                    {isLoading ? "Processing..." : "Complete Screening"}
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
