"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Users, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react"
import Link from "next/link"

const teamPerformance = [
  { name: "Sarah", score: 8.3, target: 8.0 },
  { name: "Michael", score: 7.5, target: 8.0 },
  { name: "Emma", score: 8.1, target: 8.0 },
  { name: "David", score: 6.8, target: 8.0 },
  { name: "Lisa", score: 8.5, target: 8.0 },
]

const pendingActions = [
  { employee: "Michael Chen", action: "PDP Approval", daysOverdue: 3, priority: "high" },
  { employee: "David Kim", action: "Performance Review", daysOverdue: 5, priority: "high" },
  { employee: "Emma Rodriguez", action: "Feedback Submission", daysOverdue: 1, priority: "medium" },
]

export default function ManagerDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">E</span>
              </div>
              <span className="font-bold hidden sm:inline">Elevate</span>
            </Link>
            <Link href="/manager" className="text-foreground font-medium">
              Manager Hub
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">John Manager</span>
            <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition">
              <span className="text-primary font-semibold">JM</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage your team's performance and development</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Team Size</p>
                <p className="text-3xl font-bold mt-1">5</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-accent">All members active</p>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-3xl font-bold mt-1">7.84/10</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-accent">+0.2 from last month</p>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">PDPs Approved</p>
                <p className="text-3xl font-bold mt-1">4/5</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-accent">1 pending review</p>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
                <p className="text-3xl font-bold mt-1">3</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-destructive">Require attention</p>
          </Card>
        </div>

        {/* Pending Actions & Team Performance */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pending Actions */}
          <Card className="p-6 border-border lg:col-span-1">
            <h2 className="text-xl font-bold mb-6">Pending Actions</h2>
            <div className="space-y-4">
              {pendingActions.map((action, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    action.priority === "high"
                      ? "bg-destructive/5 border-destructive/20"
                      : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-foreground">{action.employee}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded capitalize ${
                        action.priority === "high" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                      }`}
                    >
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{action.action}</p>
                  <p className="text-xs text-destructive">{action.daysOverdue} days overdue</p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6 bg-primary hover:bg-primary/90">View All Actions</Button>
          </Card>

          {/* Team Performance */}
          <Card className="p-6 border-border lg:col-span-2">
            <h2 className="text-xl font-bold mb-6">Team Performance vs Target</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: `1px solid var(--border)`,
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="score" fill="var(--primary)" name="Current Score" />
                <Bar dataKey="target" fill="var(--border)" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Evaluate Employee", icon: "📋", href: "/manager/evaluations" },
            { label: "Review PDP", icon: "📝", href: "/manager/pdp-reviews" },
            { label: "Give Feedback", icon: "💬", href: "/manager/feedback" },
            { label: "View Team Report", icon: "📊", href: "/manager/reports" },
          ].map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="p-6 border-border hover:border-primary/50 hover:bg-secondary/50 transition cursor-pointer h-full">
                <div className="text-3xl mb-3">{action.icon}</div>
                <p className="font-medium text-foreground">{action.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
