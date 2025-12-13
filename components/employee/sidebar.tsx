"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  User,
  CheckSquare,
  Mail,
  MessageSquare,
  Calendar,
  Award,
  BarChart,
  Building2,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  Car,
  FileWarning,
  Lightbulb,
  Trophy,
  Vote,
  AlertCircle,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "My Profile", href: "/employee/profile", icon: User },
  { name: "My Tasks", href: "/employee/tasks", icon: CheckSquare },
  { name: "Messages", href: "/employee/messages", icon: Mail },
  { name: "My Feedback", href: "/employee/feedback", icon: MessageSquare },
  { name: "My PDP", href: "/employee/pdp", icon: BarChart },
  { name: "My Attendance", href: "/employee/attendance", icon: Calendar },
  { name: "My Awards", href: "/employee/awards", icon: Award },
  { name: "Badges", href: "/employee/badges", icon: Trophy },
  { name: "Resource Booking", href: "/employee/bookings", icon: Car },
  { name: "Suggestions Box", href: "/employee/suggestions", icon: Lightbulb },
  { name: "Voting & Polls", href: "/employee/polls", icon: Vote },
  { name: "Contract Alerts", href: "/employee/contracts", icon: FileWarning },
  { name: "Alerts & Notifications", href: "/employee/alerts", icon: AlertCircle },
  { name: "Company Info", href: "/employee/company", icon: Building2 },
  { name: "Notifications", href: "/employee/notifications", icon: Bell },
  { name: "Settings", href: "/employee/settings", icon: Settings },
]

export function EmployeeSidebar() {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = "/employee-login"
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white dark:bg-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">Employee Portal</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
