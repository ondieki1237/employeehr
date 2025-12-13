"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ArrowLeft, Mail, Lock } from "lucide-react"
import { api } from "@/lib/api"
import { setToken, setUser } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await api.auth.login({ email, password })

      if (response.success && response.data) {
        // Store token and user data
        setToken(response.data.token)
        setUser({
          _id: response.data.user._id,
          email: response.data.user.email,
          first_name: response.data.user.firstName || response.data.user.first_name,
          last_name: response.data.user.lastName || response.data.user.last_name,
          role: response.data.user.role,
          org_id: response.data.user.org_id,
        })

        // Redirect based on role
        const role = response.data.user.role
        if (role === "company_admin" || role === "hr") {
          router.push("/admin")
        } else if (role === "manager") {
          router.push("/manager")
        } else {
          router.push("/employee")
        }
      } else {
        setError(response.message || "Login failed")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition mb-4">
          <ArrowLeft size={18} />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">Sign in to your Elevate account</p>
      </div>

      <Card className="p-8 border-border">
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
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="text-primary hover:underline font-medium">
          Sign up here
        </Link>
      </p>
    </div>
  )
}
