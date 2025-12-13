"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser, isAdmin, logout } from "@/lib/auth"
import Sidebar from "@/components/admin/sidebar"
import TopNav from "@/components/admin/top-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    
    if (!user) {
      router.push("/auth/login")
      return
    }

    // Only company_admin and hr can access admin panel
    if (!isAdmin()) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "manager") {
        router.push("/manager")
      } else {
        router.push("/employee")
      }
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
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
