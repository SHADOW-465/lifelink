"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "next/navigation"
import { useState } from "react"

const questionnaireSteps = [
  {
    title: "Disclaimer",
    fields: ["disclaimer"],
  },
  {
    title: "Basic Eligibility",
    fields: ["ageCheck", "weightCheck", "healthCheck"],
  },
  {
    title: "Medical History",
    fields: ["diseaseCheck", "surgeryCheck", "tattooCheck", "dentalCheck", "pregnancyCheck"],
  },
  {
    title: "Lifestyle & Travel",
    fields: ["antibioticsCheck", "vaccineCheck", "travelCheck", "drugsCheck"],
  },
  {
    title: "Final Consent",
    fields: ["truthfulnessConsent", "testingConsent", "dangerConsent"],
  },
]

type Answers = Record<string, string | boolean>

export default function MedicalHistoryPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEligible, setIsEligible] = useState(true)
  const router = useRouter()

  const handleNext = () => {
    setError(null)
    const currentFields = questionnaireSteps[currentStep].fields
    const allAnswered = currentFields.every((field) => answers[field] !== undefined)

    if (!allAnswered) {
      setError("Please answer all questions before proceeding.")
      return
    }

    // --- Eligibility Logic ---
    if (currentStep === 1) { // Basic Eligibility
      if (answers.ageCheck === "No" || answers.weightCheck === "No" || answers.healthCheck === "No") {
        setIsEligible(false)
        return // Stop the process and show ineligibility message
      }
    }

    if (currentStep < questionnaireSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answers.truthfulnessConsent || !answers.testingConsent || !answers.dangerConsent) {
      setError("You must agree to all consent statements to proceed.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/medical-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save medical history.');
      }

      // On success, redirect to the main dashboard
      router.push("/dashboard")

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const setAnswer = (field: string, value: string | boolean) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  const progress = ((currentStep + 1) / questionnaireSteps.length) * 100

  const renderStep = () => {
    const step = questionnaireSteps[currentStep]
    switch (step.title) {
      case "Disclaimer":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your health and the safety of the blood supply are our top priorities. Please answer the following questions honestly and accurately. All your information will be kept confidential. This screening is a crucial step to ensure that donating blood is safe for you and for the person who will receive your blood.
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox id="disclaimer" checked={answers.disclaimer as boolean} onCheckedChange={(checked) => setAnswer("disclaimer", checked as boolean)} />
              <Label htmlFor="disclaimer" className="font-semibold">I have read and understood the information above.</Label>
            </div>
          </div>
        )
      case "Basic Eligibility":
        return (
          <div className="space-y-6">
            <Question id="ageCheck" label="Are you between 18 and 65 years old?" answer={answers.ageCheck as string} setAnswer={setAnswer} />
            <Question id="weightCheck" label="Do you weigh at least 50 kg (110 lbs)?" answer={answers.weightCheck as string} setAnswer={setAnswer} />
            <Question id="healthCheck" label="Are you feeling healthy and well today (no cold, flu, fever, or sore throat)?" answer={answers.healthCheck as string} setAnswer={setAnswer} />
          </div>
        )
      case "Medical History":
        return (
          <div className="space-y-6">
            <p className="font-semibold">Have you ever been diagnosed with or treated for any of the following?</p>
            <Question id="diseaseCheck" label="Heart or Lung Disease, Cancer, Abnormal Bleeding Disorder, Hepatitis B, Hepatitis C, HIV/AIDS, or Syphilis" answer={answers.diseaseCheck as string} setAnswer={setAnswer} />
            <Question id="surgeryCheck" label="Have you had any major surgery in the last 6 months?" answer={answers.surgeryCheck as string} setAnswer={setAnswer} />
            <Question id="tattooCheck" label="Have you gotten a tattoo, body piercing, or acupuncture in the last 6 months?" answer={answers.tattooCheck as string} setAnswer={setAnswer} />
            <Question id="dentalCheck" label="Have you had any complex dental work (like a tooth extraction) in the last 72 hours?" answer={answers.dentalCheck as string} setAnswer={setAnswer} />
            <Question id="pregnancyCheck" label="(For female donors) Are you currently pregnant or have you given birth in the last year?" answer={answers.pregnancyCheck as string} setAnswer={setAnswer} options={["Yes", "No", "Not Applicable"]} />
          </div>
        )
      case "Lifestyle & Travel":
        return (
          <div className="space-y-6">
            <Question id="antibioticsCheck" label="Are you currently taking antibiotics for an infection?" answer={answers.antibioticsCheck as string} setAnswer={setAnswer} />
            <Question id="vaccineCheck" label="Have you received any vaccinations in the last 4 weeks?" answer={answers.vaccineCheck as string} setAnswer={setAnswer} />
            <Question id="travelCheck" label="Have you traveled to any regions with a high risk of malaria or other infections in the last 12 months?" answer={answers.travelCheck as string} setAnswer={setAnswer} />
            <Question id="drugsCheck" label="Have you ever used injectable, non-prescription drugs?" answer={answers.drugsCheck as string} setAnswer={setAnswer} />
          </div>
        )
      case "Final Consent":
        return (
            <div className="space-y-4">
                <p className="font-semibold">Please confirm the following statements:</p>
                <div className="flex items-start space-x-2">
                    <Checkbox id="truthfulnessConsent" checked={answers.truthfulnessConsent as boolean} onCheckedChange={(checked) => setAnswer("truthfulnessConsent", checked as boolean)} className="mt-1"/>
                    <Label htmlFor="truthfulnessConsent">I have answered all the questions above truthfully and to the best of my knowledge.</Label>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="testingConsent" checked={answers.testingConsent as boolean} onCheckedChange={(checked) => setAnswer("testingConsent", checked as boolean)} className="mt-1"/>
                    <Label htmlFor="testingConsent">I understand that my blood will be tested for infectious diseases (like HIV, Hepatitis B & C).</Label>
                </div>
                <div className="flex items-start space-x-2">
                    <Checkbox id="dangerConsent" checked={answers.dangerConsent as boolean} onCheckedChange={(checked) => setAnswer("dangerConsent", checked as boolean)} className="mt-1"/>
                    <Label htmlFor="dangerConsent">I understand that providing false information can critically endanger the life of a patient.</Label>
                </div>
            </div>
        )
      default:
        return null
    }
  }

  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto text-center">
          <CardHeader>
            <CardTitle>Thank You for Your Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Based on your answers, you are not eligible to donate at this time. This is to ensure your safety and the safety of the blood supply. We appreciate your willingness to help.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6">Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Medical Screening</CardTitle>
            <CardDescription className="text-center">{questionnaireSteps[currentStep].title}</CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {renderStep()}
              {error && <div className="text-sm text-destructive">{error}</div>}
              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                  Previous
                </Button>
                {currentStep < questionnaireSteps.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Complete Screening"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface QuestionProps {
  id: string
  label: string
  answer: string
  setAnswer: (id: string, value: string) => void
  options?: string[]
}

function Question({ id, label, answer, setAnswer, options = ["Yes", "No"] }: QuestionProps) {
  return (
    <div className="space-y-3">
      <Label className="font-semibold text-base">{label}</Label>
      <RadioGroup value={answer} onValueChange={(value) => setAnswer(id, value)} className="flex gap-4">
        {options.map(option => (
          <div key={option} className="flex items-center space-x-2">
            <RadioGroupItem value={option} id={`${id}-${option}`} />
            <Label htmlFor={`${id}-${option}`}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}