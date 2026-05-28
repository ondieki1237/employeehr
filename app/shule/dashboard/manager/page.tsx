"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Calculator, GraduationCap, Library, ClipboardList, ShieldCheck, Loader2, ArrowUpRight, CalendarDays, Clock3, RefreshCw, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"

interface DashboardStats {
  students: number
  facilitators: number
  examinations: number
  outstandingFees: number
}

interface BrandingData {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  textColor?: string
  backgroundColor?: string
  name?: string
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 37, g: 99, b: 235 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [branding, setBranding] = useState<BrandingData>({
    primaryColor: "#2563eb",
    textColor: "#1f2937",
    secondaryColor: "#059669",
    accentColor: "#f59e0b",
    backgroundColor: "#ffffff",
  })
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    facilitators: 0,
    examinations: 6,
    outstandingFees: 24,
  })

  const brand = useMemo(() => ({
    name: branding.name || "School Enterprise",
    primary: branding.primaryColor || "#2563eb",
    secondary: branding.secondaryColor || "#059669",
    accent: branding.accentColor || "#f59e0b",
    text: branding.textColor || "#1f2937",
    background: branding.backgroundColor || "#ffffff",
  }), [branding])

  const quickActions = [
    { label: "Add Student", href: "/shule/dashboard/manager/students" },
    { label: "Enroll Facilitator", href: "/shule/dashboard/manager/facilitators" },
    { label: "Schedule Exam", href: "/shule/dashboard/manager/examinations" },
    { label: "Record Fee", href: "/shule/dashboard/manager/fees" },
  ]

  const navCards = [
    { title: "Students", desc: "Admissions, profiles, attendance, and progress tracking.", href: "/shule/dashboard/manager/students", icon: Users, accent: brand.primary },
    { title: "Facilitators", desc: "Teacher allocation, timetables, and supervision support.", href: "/shule/dashboard/manager/facilitators", icon: GraduationCap, accent: brand.secondary },
    { title: "Resources", desc: "Learning materials, assets, and operational resources.", href: "/shule/dashboard/manager/resources", icon: BookOpen, accent: brand.accent },
    { title: "Examinations", desc: "Exam setup, results workflow, and performance review.", href: "/shule/dashboard/manager/examinations", icon: ClipboardList, accent: brand.primary },
    { title: "Library", desc: "Catalog, borrowing, returns, and resource access.", href: "/shule/dashboard/manager/library", icon: Library, accent: brand.secondary },
    { title: "Fee Management", desc: "Billing, payments, balances, and reconciliation.", href: "/shule/dashboard/manager/fees", icon: Calculator, accent: brand.primary },
    { title: "Supervision", desc: "Approvals, discipline, and general oversight tasks.", href: "/shule/dashboard/manager/supervision", icon: ShieldCheck, accent: brand.accent },
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch branding
        const brandingRes = await api.company.getBranding()
        if (brandingRes?.success && brandingRes.data) {
          setBranding({
            primaryColor: brandingRes.data.primaryColor || "#2563eb",
            secondaryColor: brandingRes.data.secondaryColor || "#059669",
            accentColor: brandingRes.data.accentColor || "#f59e0b",
            textColor: brandingRes.data.textColor || "#1f2937",
            backgroundColor: brandingRes.data.backgroundColor || "#ffffff",
          })
        }

        // Fetch user stats
        const usersRes = await api.usersApi.getAll()
        if (usersRes?.success && usersRes.data) {
          const users = usersRes.data as User[]
          const studentCount = users.filter((u) => u.role === "employee").length
          const facilitatorCount = users.filter((u) => u.role === "manager").length

          setStats((prev) => ({
            ...prev,
            students: studentCount,
            facilitators: facilitatorCount,
          }))
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: brand.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl border px-5 py-5 shadow-sm sm:px-6 sm:py-6"
        style={{
          borderColor: hexToRgba(brand.primary, 0.18),
          background: `linear-gradient(135deg, ${hexToRgba(brand.primary, 0.10)} 0%, #ffffff 62%)`,
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">School Enterprise / Manager Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: brand.primary }}>
              Manager Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Oversee students, facilitators, learning resources, examinations, the library, fee management, and other
              supervisory operations from one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600" style={{ borderColor: hexToRgba(brand.primary, 0.14) }}>
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                Branded workspace
              </span>
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600" style={{ borderColor: hexToRgba(brand.secondary, 0.14) }}>
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                Live operational view
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action) => (
              <Button asChild key={action.label} variant="outline" className="border-white/70 bg-white shadow-sm" style={{ borderColor: hexToRgba(brand.primary, 0.16), color: brand.primary }}>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Students", value: stats.students.toString(), note: "Active learners", icon: Users, color: brand.primary },
          { label: "Facilitators", value: stats.facilitators.toString(), note: "Teachers and mentors", icon: GraduationCap, color: brand.secondary },
          { label: "Examinations", value: stats.examinations.toString(), note: "Scheduled this term", icon: ClipboardList, color: brand.accent },
          { label: "Outstanding Fees", value: stats.outstandingFees.toString(), note: "Pending records", icon: Calculator, color: brand.primary },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.label}
              className="border-border/70 bg-white shadow-sm"
              style={{
                borderColor: hexToRgba(item.color, 0.14),
                background: `linear-gradient(180deg, #ffffff 0%, ${hexToRgba(item.color, 0.03)} 100%)`,
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(item.color, 0.10), color: item.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: item.label === "Outstanding Fees" ? "62%" : item.label === "Examinations" ? "78%" : "88%", backgroundColor: item.color }} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {navCards.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} href={item.href}>
              <Card
                className="h-full border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: hexToRgba(item.accent, 0.14),
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: item.accent }}>
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.desc}
                    </p>
                  </div>
                  <div
                    className="rounded-lg border p-2"
                    style={{
                      borderColor: hexToRgba(item.accent, 0.14),
                      backgroundColor: hexToRgba(item.accent, 0.08),
                      color: item.accent,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-white shadow-sm" style={{ borderColor: hexToRgba(brand.primary, 0.12) }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Quick actions</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Move fast on daily operations</h3>
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={action.label}
                  asChild
                  variant={index === 0 ? "default" : "outline"}
                  className="border"
                  style={
                    index === 0
                      ? { backgroundColor: brand.primary, color: "white" }
                      : { borderColor: hexToRgba(brand.primary, 0.18), color: brand.primary }
                  }
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white shadow-sm" style={{ borderColor: hexToRgba(brand.secondary, 0.12) }}>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Today</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Students active</span>
                <span className="font-semibold text-slate-900">{stats.students}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Facilitators on duty</span>
                <span className="font-semibold text-slate-900">{stats.facilitators}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Outstanding fees</span>
                <span className="font-semibold text-slate-900">{stats.outstandingFees}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
