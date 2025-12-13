"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Lock, Building2 } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { setToken, setUser } from "@/lib/auth"

interface SignupFormProps {
  onBack: () => void
}

export default function SignupForm({ onBack }: SignupFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    industry: "",
    teamSize: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await api.auth.registerCompany({
        name: formData.companyName,
        email: formData.email,
        adminEmail: formData.email,
        adminPassword: formData.password,
        adminName: "Admin", // Default admin name
        industry: formData.industry,
        employeeCount: formData.teamSize,
      })

      if (response.success && response.data) {
        // Store token and user data
        setToken(response.data.token)
        setUser({
          _id: response.data.user._id,
          email: response.data.user.email,
          first_name: response.data.user.firstName || "",
          last_name: response.data.user.lastName || "",
          role: response.data.user.role,
          org_id: response.data.user.org_id,
        })

        // Redirect to dashboard
        router.push("/dashboard")
      } else {
        setError(response.message || "Registration failed")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="text-center">
        <h2 className="text-3xl font-bold">Register Your Company</h2>
        <p className="text-muted-foreground mt-2">Set up your organization and start managing performance</p>
      </div>

      <Card className="p-8 border-border">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                name="companyName"
                placeholder="Acme Corporation"
                value={formData.companyName}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                name="email"
                placeholder="admin@company.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Industry</label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={isLoading}
              >
                <option value="">Select...</option>
                <option value="tech">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Team Size</label>
              <select
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
                disabled={isLoading}
              >
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="200+">200+</option>
              </select>
            </div>
          </div>

          {error && <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

          <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? "Setting up your organization..." : "Create Account & Setup Organization"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        By signing up, you agree to our{" "}
        <Link href="#" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}
