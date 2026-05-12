"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getUser } from "@/lib/auth"

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(!!getUser())
  }, [])

  return (
    <div className="space-y-8">
      <Card className="border-border/70 bg-white p-8 shadow-sm">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Existing Elevate authentication enabled
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">School Enterprise</h1>
            <p className="text-sm leading-6 text-slate-600">
              The school module is part of the main system. Use the current Elevate account to access the school
              workspace and its advanced functionality.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="px-6">
              <Link href={isAuthenticated ? "/shule/dashboard" : "/auth/login"}>
                {isAuthenticated ? "Enter School Enterprise" : "Sign in to Access"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-6">
              <Link href="/admin">Back to HR System</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Academics", desc: "Classes, sessions, and tracking" },
          { title: "Operations", desc: "Managers, facilitators, and students" },
          { title: "Insights", desc: "Reports and school performance" },
        ].map((item) => (
          <Card key={item.title} className="border-border/70 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/shule/dashboard" className="rounded-xl border bg-white p-5 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md">
          Open School Dashboard
        </Link>
        <Link href="/shule/login" className="rounded-xl border bg-white p-5 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md">
          Legacy School Login
        </Link>
        <Link href="/shule/signup" className="rounded-xl border bg-white p-5 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md">
          Register a School
        </Link>
      </div>
    </div>
  )
}
