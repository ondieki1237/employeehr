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
  FileText,
  Receipt,
  Video,
  X,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "My Profile", href: "/employee/profile", icon: User },
  { name: "My Tasks", href: "/employee/tasks", icon: CheckSquare },
  { name: "Meetings", href: "/employee/meetings", icon: Video },
  { name: "Messages", href: "/employee/messages", icon: Mail },
  { name: "My Feedback", href: "/employee/feedback", icon: MessageSquare },
  { name: "My PDP", href: "/employee/pdp", icon: BarChart },
  { name: "My Attendance", href: "/employee/attendance", icon: Calendar },
  { name: "My Payslips", href: "/employee/payslip", icon: Receipt },
  { name: "My Awards", href: "/employee/awards", icon: Award },
  { name: "Badges", href: "/employee/badges", icon: Trophy },
  { name: "Resource Booking", href: "/employee/bookings", icon: Car },
  { name: "Suggestions Box", href: "/employee/suggestions", icon: Lightbulb },
  { name: "Voting & Polls", href: "/employee/polls", icon: Vote },
  { name: "Contract Alerts", href: "/employee/contracts", icon: FileWarning },
  { name: "Alerts & Notifications", href: "/employee/alerts", icon: AlertCircle },
  { name: "Reports", href: "/employee/reports", icon: FileText },
  { name: "Company Info", href: "/employee/company", icon: Building2 },
  { name: "Notifications", href: "/employee/notifications", icon: Bell },
  { name: "Settings", href: "/employee/settings", icon: Settings },
]

interface EmployeeSidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export function EmployeeSidebar({ isOpen = false, onToggle }: EmployeeSidebarProps) {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = "/employee-login"
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          "fixed lg:static top-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-white dark:bg-gray-950 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'var(--company-logo-url)' }}></div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>Employee Portal</h1>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onToggle}
            className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onToggle}
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
    </>
  )
}
