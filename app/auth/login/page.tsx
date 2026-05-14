"use client"

import type React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ArrowLeft, Mail, Lock } from "lucide-react"
import { api } from "@/lib/api"
import { removeToken, removeUser, setToken, setUser } from "@/lib/auth"
import InvitationForm from "@/components/auth/invitation-form"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get("invite")
  const orgId = searchParams.get("org_id")
  const invitedEmail = searchParams.get("email")
  const companyName = searchParams.get("company") || "our organization"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // If we have an invite token, show the invitation form
  if (inviteToken && orgId) {
    return (
      <InvitationForm
        inviteToken={inviteToken}
        invitedEmail={invitedEmail || ""}
        companyName={companyName}
        orgId={orgId}
      />
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) {
      return // Prevent multiple submissions
    }
    
    setError("")
    setIsLoading(true)

    try {
      // Ensure stale session data doesn't interfere with a fresh login
      removeToken()
      removeUser()

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
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Use your account credentials to continue.</p>
      </div>

      <Card className="border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
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
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-slate-500 hover:text-slate-900">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-blue-50 p-2">
            <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-slate-900 hover:underline">
            Create one now
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
 
