"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { TrendingUp, Target, CheckSquare, Mail, Package, Clock, AlertCircle, ClipboardList } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getUser } from "@/lib/auth"

interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  completed_at?: string
  createdAt: string
  source_label?: string
  related_entity_type?: string
  related_entity_id?: string
  is_packaging_duty?: boolean
}

interface PerformanceRecord {
  _id: string
  user_id: string
  period: string
  overall_score: number
  attendance_score: number
  feedback_score: number
  status: "pending" | "completed" | "reviewed"
  kpi_scores: Array<{ kpi_id: string; score: number; achieved?: number; target?: number }>
}

interface MessageItem {
  _id: string
  is_read?: boolean
}

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#8b5cf6"]

function getCurrentPeriod() {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${quarter}`
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [performance, setPerformance] = useState<PerformanceRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getUser()
    setUser(currentUser)
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token")
        const currentUser = getUser()
        if (!token || !currentUser) return

        const userId = currentUser.userId || currentUser._id
        const period = getCurrentPeriod()

        const [tasksRes, messagesRes, performanceRes] = await Promise.all([
          fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/messages/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/performance/${userId}/${period}`, { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const [tasksJson, messagesJson, performanceJson] = await Promise.all([
          tasksRes.json(),
          messagesRes.json(),
          performanceRes.json(),
        ])

        if (tasksJson.success) setTasks(tasksJson.data || [])
        if (messagesJson.success) {
          const unread = ((messagesJson.data as MessageItem[]) || []).filter((message) => !message.is_read).length
          setMessagesUnread(unread)
        }
        if (performanceJson.success) setPerformance(performanceJson.data || null)
      } catch (error) {
        console.error("Failed to load employee dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const derived = useMemo(() => {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === "completed").length
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
    const pendingTasks = tasks.filter((task) => task.status === "pending").length
    const cancelledTasks = tasks.filter((task) => task.status === "cancelled").length

    const packagingTasks = tasks.filter(
      (task) =>
        task.is_packaging_duty ||
        task.related_entity_type === "invoice" ||
        String(task.source_label || "").toLowerCase().includes("packaging") ||
        String(task.title || "").toLowerCase().includes("packaging"),
    )
    const packagingCompleted = packagingTasks.filter((task) => task.status === "completed").length
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date || task.status === "completed") return false
      return new Date(task.due_date).getTime() < Date.now()
    }).length

    const dutyCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const packagingCompletionRate = packagingTasks.length > 0
      ? Math.round((packagingCompleted / packagingTasks.length) * 100)
      : dutyCompletionRate

    const performanceScore = Number(performance?.overall_score || 0)
    const attendanceScore = Number(performance?.attendance_score || 0)
    const feedbackScore = Number(performance?.feedback_score || 0)

    const uniqueKpi = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          performanceScore * 0.5 +
            dutyCompletionRate * 0.3 +
            packagingCompletionRate * 0.2,
        ),
      ),
    )

    const taskStatusData = [
      { name: "Completed", value: completedTasks },
      { name: "In Progress", value: inProgressTasks },
      { name: "Pending", value: pendingTasks },
      { name: "Cancelled", value: cancelledTasks },
    ]

    const priorityData = ["urgent", "high", "medium", "low"].map((priority) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: tasks.filter((task) => task.priority === priority).length,
    }))

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      cancelledTasks,
      packagingTasks,
      packagingCompleted,
      overdueTasks,
      dutyCompletionRate,
      packagingCompletionRate,
      performanceScore,
      attendanceScore,
      feedbackScore,
      uniqueKpi,
      taskStatusData,
      priorityData,
      recentTasks,
    }
  }, [tasks, performance])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName || "Employee"}</h1>
        <p className="text-muted-foreground">
          Your dashboard is driven by your actual duties, packaging work, and live performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Unique KPI</p>
              <p className="text-3xl font-bold mt-1">{derived.uniqueKpi}/100</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on duties completed, packaging output, and performance score.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Duties Allocated</p>
              <p className="text-3xl font-bold mt-1">{derived.totalTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-blue-500">
            {derived.completedTasks} completed, {derived.pendingTasks} pending
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Packaging Duties</p>
              <p className="text-3xl font-bold mt-1">{derived.packagingTasks.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <p className="text-xs text-amber-500">
            {derived.packagingCompleted} completed, {derived.packagingCompletionRate}% done
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Unread Messages</p>
              <p className="text-3xl font-bold mt-1">{messagesUnread}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-orange-500">Messages waiting for review</p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Task Completion Mix</h2>
              <p className="text-sm text-muted-foreground">Your duties are reflected in real time.</p>
            </div>
            <Badge variant="outline">{derived.dutyCompletionRate}% overall</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={derived.taskStatusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                {derived.taskStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Priority Load</h2>
              <p className="text-sm text-muted-foreground">Duties by urgency level.</p>
            </div>
            <Badge variant="outline">{derived.overdueTasks} overdue</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={derived.priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: `1px solid var(--border)`,
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Recent Duties</h2>
              <p className="text-sm text-muted-foreground">Latest assigned tasks, including packaging work.</p>
            </div>
            <Link href="/employee/tasks">
              <Button variant="outline">Open Tasks</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {derived.recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No duties assigned yet.</p>
            ) : (
              derived.recentTasks.map((task) => {
                const isPackaging =
                  task.is_packaging_duty ||
                  task.related_entity_type === "invoice" ||
                  String(task.source_label || "").toLowerCase().includes("packaging") ||
                  String(task.title || "").toLowerCase().includes("packaging")

                return (
                  <div key={task._id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          {isPackaging && <Badge variant="secondary">Packaging</Badge>}
                          <Badge variant="outline" className="capitalize">
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                          {task.completed_at && <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>}
                          {task.related_entity_type === "invoice" && task.related_entity_id && (
                            <span>Invoice duty linked</span>
                          )}
                        </div>
                      </div>
                      <Badge className="capitalize">{task.priority}</Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Performance Snapshot</h2>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Performance Score</span>
                <span className="font-semibold">{derived.performanceScore}/100</span>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attendance Score</span>
                <span className="font-semibold">{derived.attendanceScore}/100</span>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Feedback Score</span>
                <span className="font-semibold">{derived.feedbackScore}/100</span>
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Period</span>
                <span className="font-semibold">{performance?.period || getCurrentPeriod()}</span>
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unique KPI Formula</span>
                <span className="font-semibold">Task + Packaging + Performance</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Dashboard score varies by employee based on allocated duties, packaging work, and live performance.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Quick Links</h2>
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/employee/tasks"><Button className="w-full" variant="outline">My Tasks</Button></Link>
          <Link href="/employee/dispatch"><Button className="w-full" variant="outline">My Dispatch</Button></Link>
          <Link href="/employee/reports"><Button className="w-full" variant="outline">Reports</Button></Link>
          <Link href="/employee/messages"><Button className="w-full" variant="outline">Messages</Button></Link>
        </div>
      </Card>
    </div>
  )
}
