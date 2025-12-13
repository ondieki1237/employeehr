"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    
    if (!user) {
      router.push("/auth/login")
      return
    }

    // Redirect non-managers to their appropriate dashboards
    if (user.role === "company_admin" || user.role === "hr") {
      router.push("/admin")
      return
    }

    if (user.role === "employee") {
      router.push("/employee")
      return
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
