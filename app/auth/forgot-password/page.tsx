"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // API call would happen here
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition mb-4"
        >
          <ArrowLeft size={18} />
          Back to Login
        </Link>
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground mt-2">We'll send you an email to reset your password</p>
      </div>

      <Card className="p-8 border-border">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-semibold text-lg">Check Your Email</h3>
            <p className="text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or try a different email.
            </p>
            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full">
              Try Another Email
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
