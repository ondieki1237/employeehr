"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Target, Award, BookOpen, CheckSquare, Mail } from "lucide-react"
import Link from "next/link"

const performanceData = [
  { month: "Jan", score: 6.5 },
  { month: "Feb", score: 7.0 },
  { month: "Mar", score: 7.2 },
  { month: "Apr", score: 7.8 },
  { month: "May", score: 8.1 },
  { month: "Jun", score: 8.3 },
]

const kpiData = [
  { name: "Sales Revenue", value: 85 },
  { name: "Quality Score", value: 78 },
  { name: "Attendance", value: 95 },
  { name: "Customer Satisfaction", value: 82 },
]

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#8b5cf6"]

export default function EmployeePortal() {
  const [user, setUser] = useState<any>(null)
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, completed: 0 })
  const [messageStats, setMessageStats] = useState({ unread: 0 })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) setUser(JSON.parse(userData))

    // Fetch task stats
    const fetchTaskStats = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("http://localhost:5000/api/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success) {
          setTaskStats({
            total: data.data.length,
            pending: data.data.filter((t: any) => t.status === "pending").length,
            completed: data.data.filter((t: any) => t.status === "completed").length,
          })
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error)
      }
    }

    // Fetch message stats
    const fetchMessageStats = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("http://localhost:5000/api/messages/inbox", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (data.success) {
          setMessageStats({
            unread: data.data.filter((m: any) => !m.is_read).length,
          })
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    fetchTaskStats()
    fetchMessageStats()
  }, [])

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName || "Employee"}</h1>
        <p className="text-muted-foreground">Here's your performance summary</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-3xl font-bold mt-1">8.3/10</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-accent">+0.5 from last month</p>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Active PDPs</p>
                <p className="text-3xl font-bold mt-1">3/3</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-accent">65% overall completion</p>
          </Card>

          <Link href="/employee/tasks">
            <Card className="p-6 border-border hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">My Tasks</p>
                  <p className="text-3xl font-bold mt-1">{taskStats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckSquare className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-blue-500">{taskStats.pending} pending, {taskStats.completed} completed</p>
            </Card>
          </Link>

          <Link href="/employee/messages">
            <Card className="p-6 border-border hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-3xl font-bold mt-1">{messageStats.unread}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <p className="text-xs text-orange-500">Unread messages</p>
            </Card>
          </Link>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
          {/* Performance Trend */}
          <Card className="p-6 border-border">
            <h2 className="text-xl font-bold mb-6">Performance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: `1px solid var(--border)`,
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: "var(--primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* KPI Distribution */}
          <Card className="p-6 border-border">
            <h2 className="text-xl font-bold mb-6">Your KPI Scores</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpiData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {kpiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
      </div>

      {/* PDPs and Development */}
      <div className="grid lg:grid-cols-2 gap-8">
          {/* Personal Development Plans */}
          <Card className="p-6 border-border">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">My Development Plans</h2>
              <Link href="/employee/pdp/new" className="text-primary hover:text-primary/80 text-sm font-medium">
                + New PDP
              </Link>
            </div>
            <div className="space-y-4">
              {[
                { title: "Leadership Skills Development", completion: 75, dueDate: "Jul 30" },
                { title: "Technical Skills Upgrade", completion: 60, dueDate: "Aug 15" },
                { title: "Customer Communication", completion: 85, dueDate: "Jul 15" },
              ].map((pdp, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-foreground">{pdp.title}</h3>
                    <span className="text-xs text-muted-foreground">Due {pdp.dueDate}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pdp.completion}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{pdp.completion}% complete</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Recognition & Achievements */}
          <Card className="p-6 border-border">
            <h2 className="text-xl font-bold mb-6">Recognition & Achievements</h2>
            <div className="space-y-4">
              {[
                { award: "Employee of the Month", date: "June 2024", icon: "🏆" },
                { award: "Top Sales Performer", date: "May 2024", icon: "⭐" },
                { award: "Outstanding Teamwork", date: "April 2024", icon: "🤝" },
              ].map((achievement, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-secondary rounded-lg">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{achievement.award}</h4>
                    <p className="text-xs text-muted-foreground">{achievement.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
      </div>

      {/* Peer Feedback */}
      <Card className="p-6 border-border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Feedback</h2>
            <Link href="/employee/feedback" className="text-primary hover:text-primary/80 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {[
              {
                from: "Michael Chen (Peer)",
                feedback: "Great collaboration on the Q2 project. Your insights were really valuable.",
                date: "2 days ago",
              },
              {
                from: "Sarah Johnson (Manager)",
                feedback: "Excellent presentation skills in the team meeting. Keep up the good work!",
                date: "5 days ago",
              },
            ].map((feedback, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-foreground text-sm">{feedback.from}</p>
                <p className="text-foreground mt-2">{feedback.feedback}</p>
                <p className="text-xs text-muted-foreground mt-2">{feedback.date}</p>
              </div>
            ))}
          </div>
      </Card>
    </div>
  )
}
