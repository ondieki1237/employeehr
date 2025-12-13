"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import { EmployeeSidebar } from "@/components/employee/sidebar"
import { EmployeeTopNav } from "@/components/employee/top-nav"

export default function EmployeeLayout({
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

    // Redirect non-employees to their appropriate dashboards
    if (user.role === "company_admin" || user.role === "hr") {
      router.push("/admin")
      return
    }

    if (user.role === "manager") {
      router.push("/manager")
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <EmployeeSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <EmployeeTopNav />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  )
}
