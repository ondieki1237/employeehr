"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"

export default function ManagerDashboard() {
  const [teamCount, setTeamCount] = useState(0)
  const [departmentName, setDepartmentName] = useState("Your Department")
  const [managerName, setManagerName] = useState("Manager")

  useEffect(() => {
    const user = getUser()
    if (user) {
      setManagerName(`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Manager")
      if (user.department) setDepartmentName(user.department)
    }

    ;(async () => {
      try {
        const res = await api.users.getAll()
        if (res?.success) setTeamCount((res.data || []).length)
      } catch {
        setTeamCount(0)
      }
    })()
  }, [])

  const quickActions = [
    { title: "Team Members", desc: "Manage employees in your department", href: "/manager/team", icon: Users },
    { title: "Approvals", desc: "Approve leave and request items", href: "/manager/approvals", icon: CheckCircle2 },
    { title: "Performance", desc: "Track KPIs and department performance", href: "/manager/performance", icon: TrendingUp },
    { title: "Reports", desc: "Review reports and summaries", href: "/manager/reports", icon: BarChart3 },
    { title: "Leave Requests", desc: "Monitor leave for your department", href: "/manager/leave-requests", icon: Clock },
    { title: "Feedback", desc: "Share updates and feedback", href: "/manager/feedback", icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge className="bg-white/10 text-white hover:bg-white/15">Company Manager</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {managerName}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                Manage employees in {departmentName}, review team performance, and oversee all work assigned to your department.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
            Full access: team, approvals, performance, reports, and leave tracking.
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Department Staff", value: String(teamCount), note: departmentName },
          { label: "Pending Approvals", value: "—", note: "Review queue" },
          { label: "Open KPIs", value: "—", note: "Department metrics" },
          { label: "Reports Due", value: "—", note: "This period" },
        ].map((item) => (
          <Card key={item.label} className="border-border/70 bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Department Employee Management</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Users className="h-4 w-4" />
              Team roster
            </div>
            <p className="mt-2 text-sm text-muted-foreground">View employees assigned to your department and manage their workload.</p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Target className="h-4 w-4" />
              KPI tracking
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Monitor KPIs created by admin for your department and track progress.</p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              Other areas
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Use approvals, leave, performance, and reports to manage your wider responsibilities.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} href={item.href}>
              <Card className="h-full border-border/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-2 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/manager/team">Open Team Management</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/manager/performance">Open Performance</Link>
        </Button>
        <Button asChild variant="default">
          <Link href="/manager/approvals">Open Approvals</Link>
        </Button>
      </div>
    </div>
  )
}
