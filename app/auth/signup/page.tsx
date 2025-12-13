"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import SignupForm from "@/components/auth/signup-form"
import { ArrowLeft } from "lucide-react"

export default function SignupPage() {
  const [step, setStep] = useState<"choice" | "register">("choice")

  return (
    <div>
      {step === "choice" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition mb-4"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Create Your Account</h1>
            <p className="text-muted-foreground mt-2">
              Join companies using Elevate to transform performance management
            </p>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
              onClick={() => setStep("register")}
            >
              Sign Up as Company Admin
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      )}

      {step === "register" && <SignupForm onBack={() => setStep("choice")} />}
    </div>
  )
}
