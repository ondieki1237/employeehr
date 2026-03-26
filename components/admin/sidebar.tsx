"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Target,
  Award,
  BarChart3,
  Settings,
  Building2,
  FileText,
  ChevronLeft,
  LogOut,
  Shield,
  Calendar,
  Lightbulb,
  Vote,
  FileCheck,
  AlertCircle,
  Bell,
  ChevronDown,
  Briefcase,
  UserCheck,
  TrendingUp,
  Mail,
  Banknote,
  Video,
  Package,
  Stamp,
  ShieldCheck
} from "lucide-react"
import { getUser, logout } from "@/lib/auth"
import { companyApi } from "@/lib/api"
import { useEffect, useMemo, useState } from "react"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const adminMenuItems = [
  // Core Management
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    section: "CORE"
  },
  {
    label: "Manage Users",
    icon: Users,
    href: "/admin/users",
    section: "CORE"
  },

  // Recruitment & Jobs
  {
    label: "Job Postings",
    icon: Briefcase,
    href: "/admin/jobs",
    section: "RECRUITMENT"
  },
  {
    label: "Applications",
    icon: UserCheck,
    href: "/admin/applications",
    section: "RECRUITMENT"
  },
  {
    label: "Job Analytics",
    icon: TrendingUp,
    href: "/admin/analytics",
    section: "RECRUITMENT"
  },
  {
    label: "Communications",
    icon: Mail,
    href: "/admin/communications",
    section: "RECRUITMENT"
  },

  // Employee Management
  {
    label: "Leave Requests",
    icon: Calendar,
    href: "/admin/leave",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Payroll Management",
    icon: Banknote,
    href: "/admin/payroll",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Meetings",
    icon: Video,
    href: "/admin/meetings",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Add Inventory",
    icon: Package,
    href: "/admin/stock/add-inventory",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Sales",
    icon: Package,
    href: "/admin/stock/sales",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Quotations",
    icon: FileText,
    href: "/admin/stock/quotations",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Invoices",
    icon: FileCheck,
    href: "/admin/stock/invoices",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Dispatch",
    icon: Package,
    href: "/admin/stock/dispatch",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Inventory Status",
    icon: Package,
    href: "/admin/stock/status",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Analytics",
    icon: Package,
    href: "/admin/stock/analytics",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Inventory History",
    icon: Package,
    href: "/admin/stock/history",
    section: "INVENTORY MANAGER"
  },
  {
    label: "Stamps",
    icon: Stamp,
    href: "/admin/stamps",
    section: "SYSTEM"
  },
  {
    label: "Resource Booking",
    icon: Calendar,
    href: "/admin/bookings",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Suggestions",
    icon: Lightbulb,
    href: "/admin/suggestions",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Badges & Awards",
    icon: Award,
    href: "/admin/badges",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Polls & Voting",
    icon: Vote,
    href: "/admin/polls",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Contracts",
    icon: FileCheck,
    href: "/admin/contracts",
    section: "EMPLOYEE MANAGEMENT"
  },
  {
    label: "Alerts",
    icon: AlertCircle,
    href: "/admin/alerts",
    section: "EMPLOYEE MANAGEMENT"
  },

  // Performance & Configuration
  {
    label: "KPI Configuration",
    icon: Target,
    href: "/admin/kpis",
    section: "PERFORMANCE"
  },
  {
    label: "360° Feedback",
    icon: Users,
    href: "/admin/feedback-360",
    section: "PERFORMANCE"
  },
  {
    label: "Analytics & Reports",
    icon: BarChart3,
    href: "/admin/reports",
    section: "PERFORMANCE"
  },

  // System Configuration
  {
    label: "Company Settings",
    icon: Building2,
    href: "/admin/settings/company",
    section: "SYSTEM"
  },
  {
    label: "System Settings",
    icon: Settings,
    href: "/admin/settings/system",
    section: "SYSTEM"
  },
  {
    label: "Page Access Control",
    icon: ShieldCheck,
    href: "/admin/settings/system/page-access",
    section: "SYSTEM"
  },
]

export default function AdminSidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)

  const currentUser = useMemo(() => getUser(), [])

  useEffect(() => {
    const loadSectionAccess = async () => {
      const role = currentUser?.role
      if (!role || role === "company_admin") {
        setAllowedSections(null)
        return
      }

      try {
        const response = await companyApi.getPageAccess()
        if (response.success) {
          const userId = currentUser?._id || (currentUser as any)?.userId
          const userSections = userId ? response.data?.adminSectionsByUser?.[userId] : undefined
          const roleSections = response.data?.adminSectionsByRole?.[role] || []
          const effectiveSections = Array.isArray(userSections) && userSections.length > 0 ? userSections : roleSections
          setAllowedSections(new Set(effectiveSections))
        }
      } catch {
        setAllowedSections(null)
      }
    }

    loadSectionAccess()
  }, [currentUser?.role])

  const handleLogout = () => {
    logout()
  }

  // Group menu items by section
  const sections: { [key: string]: typeof adminMenuItems } = {}
  adminMenuItems.forEach(item => {
    const section = item.section || 'OTHER'
    if (!sections[section]) {
      sections[section] = []
    }
    sections[section].push(item)
  })

  const sectionEntries = Object.entries(sections).filter(([sectionName]) => {
    if (!allowedSections) return true
    return allowedSections.has(sectionName)
  })

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle}></div>}

      <aside
        className={`
        fixed lg:static top-0 left-0 h-screen bg-card border-r border-border z-50 flex flex-col
        transition-transform duration-300 w-64
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="p-6 flex items-center justify-between border-b border-border">
          <Link href="/admin" className="flex items-center gap-3 font-bold text-lg">
            <div className="w-8 h-8 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'var(--company-logo-url)' }}></div>
            <span className="" style={{ color: 'var(--brand-primary)' }}>Admin Panel</span>
          </Link>
          <button onClick={onToggle} className="lg:hidden p-1 hover:bg-secondary rounded">
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="px-4 py-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          {sectionEntries.map(([sectionName, items]) => (
            <div key={sectionName}>
              <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {sectionName}
              </h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm
                        ${isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-foreground hover:bg-secondary"
                        }
                      `}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-destructive/10 rounded-lg transition"
          >
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
