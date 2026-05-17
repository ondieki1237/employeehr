"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"
import ManagerSidebar from "@/components/manager/sidebar"
import ManagerTopNav from "@/components/manager/top-nav"

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const user = getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

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

  const getTitle = () => {
    if (pathname === "/manager") return "Dashboard"
    if (pathname.includes("/team")) return "Team Members"
    if (pathname.includes("/approvals")) return "Approvals"
    if (pathname.includes("/performance")) return "Performance"
    if (pathname.includes("/evaluations")) return "Employee Evaluations"
    if (pathname.includes("/pdp-reviews")) return "Development Plans"
    if (pathname.includes("/feedback")) return "Feedback & Communication"
    if (pathname.includes("/leave-requests")) return "Leave Requests"
    if (pathname.includes("/reports")) return "Reports"
    return "Manager Workspace"
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden lg:block">
        <ManagerSidebar />
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <ManagerSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <ManagerTopNav title={getTitle()} onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
