"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Calculator, GraduationCap, Library, ClipboardList, ShieldCheck, Loader2 } from "lucide-react"
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: branding.primaryColor }} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div
          className="inline-flex rounded-full border px-3 py-1 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: branding.backgroundColor,
            borderColor: branding.primaryColor + "30",
            color: branding.textColor,
          }}
        >
          School Enterprise / Manager Dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: branding.primaryColor }}>
          Manager Dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-6" style={{ color: branding.textColor + "cc" }}>
          Oversee students, facilitators, learning resources, examinations, the library, fee management, and other
          supervisory operations from one place.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Students", value: stats.students.toString(), note: "Active learners" },
          { label: "Facilitators", value: stats.facilitators.toString(), note: "Teachers and mentors" },
          { label: "Examinations", value: stats.examinations.toString(), note: "Scheduled this term" },
          { label: "Outstanding Fees", value: stats.outstandingFees.toString(), note: "Pending records" },
        ].map((item) => (
          <Card
            key={item.label}
            className="border-border/70 bg-white p-5 shadow-sm"
            style={{
              borderColor: branding.primaryColor + "20",
            }}
          >
            <p className="text-sm" style={{ color: branding.textColor + "99" }}>
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold" style={{ color: branding.primaryColor }}>
              {item.value}
            </p>
            <p className="mt-1 text-xs" style={{ color: branding.textColor + "66" }}>
              {item.note}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Students", desc: "Admissions, profiles, attendance, and progress tracking.", href: "/shule/dashboard/manager/students", icon: Users },
          { title: "Facilitators", desc: "Teacher allocation, timetables, and supervision support.", href: "/shule/dashboard/manager/facilitators", icon: GraduationCap },
          { title: "Resources", desc: "Learning materials, assets, and operational resources.", href: "/shule/dashboard/manager/resources", icon: BookOpen },
          { title: "Examinations", desc: "Exam setup, results workflow, and performance review.", href: "/shule/dashboard/manager/examinations", icon: ClipboardList },
          { title: "Library", desc: "Catalog, borrowing, returns, and resource access.", href: "/shule/dashboard/manager/library", icon: Library },
          { title: "Fee Management", desc: "Billing, payments, balances, and reconciliation.", href: "/shule/dashboard/manager/fees", icon: Calculator },
          { title: "Supervision", desc: "Approvals, discipline, and general oversight tasks.", href: "/shule/dashboard/manager/supervision", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} href={item.href}>
              <Card
                className="h-full border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  borderColor: branding.primaryColor + "20",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: branding.primaryColor }}>
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6" style={{ color: branding.textColor + "cc" }}>
                      {item.desc}
                    </p>
                  </div>
                  <div
                    className="rounded-lg border p-2"
                    style={{
                      borderColor: branding.primaryColor + "20",
                      backgroundColor: branding.primaryColor + "10",
                      color: branding.primaryColor,
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

      <div className="flex flex-wrap gap-3">
        {[
          { label: "Add Student", href: "/shule/dashboard/manager/students" },
          { label: "Enroll Facilitator", href: "/shule/dashboard/manager/facilitators" },
          { label: "Schedule Exam", href: "/shule/dashboard/manager/examinations" },
          { label: "Record Fee", href: "/shule/dashboard/manager/fees" },
        ].map((action) => (
          <Button
            key={action.label}
            asChild
            style={{
              borderColor: branding.primaryColor,
              color: branding.primaryColor,
            }}
            className="border"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
