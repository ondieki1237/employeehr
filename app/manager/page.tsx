"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle2, BarChart3, FileText, Clock, MessageSquare, Award, TrendingUp } from "lucide-react"

export default function ManagerDashboard() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          Company / Manager Dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Manager Dashboard</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Manage and oversee your team members, track performance, handle approvals, and manage company operations from one central hub.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Team Members", value: "24", note: "Active employees" },
          { label: "Pending Approvals", value: "5", note: "Awaiting action" },
          { label: "Leave Requests", value: "3", note: "This month" },
          { label: "Performance Reviews", value: "8", note: "Due this quarter" },
        ].map((item) => (
          <Card key={item.label} className="border-border/70 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Team Members", desc: "View team roster, profiles, roles, and contact information.", href: "/manager/team", icon: Users },
          { title: "Approvals", desc: "Review and approve leave requests, expense claims, and time-off.", href: "/manager/approvals", icon: CheckCircle2 },
          { title: "Performance", desc: "Track KPIs, manage evaluations, and conduct reviews.", href: "/manager/performance", icon: TrendingUp },
          { title: "Leave Management", desc: "Monitor team leave schedules and balance.", href: "/manager/leave-requests", icon: Clock },
          { title: "Reports", desc: "Generate compliance, attendance, and performance reports.", href: "/manager/reports", icon: BarChart3 },
          { title: "Feedback & Communication", desc: "Share feedback, announcements, and team messages.", href: "/manager/feedback", icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} href={item.href}>
              <Card className="h-full border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/manager/evaluations">Employee Evaluations</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/manager/pdp-reviews">Development Plans</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/manager/leave-requests">Leave Requests</Link>
        </Button>
        <Button asChild variant="default">
          <Link href="/manager/team">View Full Team</Link>
        </Button>
      </div>
    </div>
  )
}
