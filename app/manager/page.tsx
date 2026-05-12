"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Calculator, GraduationCap, Library, ClipboardList, ShieldCheck } from "lucide-react"

export default function ManagerDashboard() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
          School Enterprise / Manager Dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Manager Dashboard</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Oversee students, facilitators, learning resources, examinations, the library, fee management, and other
          supervisory operations from one place.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Students", value: "128", note: "Active learners" },
          { label: "Facilitators", value: "18", note: "Teachers and mentors" },
          { label: "Examinations", value: "6", note: "Scheduled this term" },
          { label: "Outstanding Fees", value: "24", note: "Pending records" },
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
          { title: "Students", desc: "Admissions, profiles, attendance, and progress tracking.", href: "/manager/students", icon: Users },
          { title: "Facilitators", desc: "Teacher allocation, timetables, and supervision support.", href: "/manager/facilitators", icon: GraduationCap },
          { title: "Resources", desc: "Learning materials, assets, and operational resources.", href: "/manager/resources", icon: BookOpen },
          { title: "Examinations", desc: "Exam setup, results workflow, and performance review.", href: "/manager/examinations", icon: ClipboardList },
          { title: "Library", desc: "Catalog, borrowing, returns, and resource access.", href: "/manager/library", icon: Library },
          { title: "Fee Management", desc: "Billing, payments, balances, and reconciliation.", href: "/manager/fees", icon: Calculator },
          { title: "Supervision", desc: "Approvals, discipline, and general oversight tasks.", href: "/manager/supervision", icon: ShieldCheck },
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
          <Link href="/manager/pdp-reviews">PDP Reviews</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/manager/feedback">Feedback</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/manager/leave-requests">Leave Requests</Link>
        </Button>
      </div>
    </div>
  )
}
