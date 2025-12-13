"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Award, 
  Target, 
  TrendingUp, 
  UserPlus,
  Settings,
  BarChart3,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import Link from "next/link"

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalKPIs: 0,
    totalAwards: 0,
    avgPerformance: 0,
  })
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const currentUser = getUser()

  useEffect(() => {
    setMounted(true)
    
    // Check if user is authenticated
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch users - this is the main data we need
      const usersRes = await api.users.getAll()
      const users = usersRes.data || []
      const activeUsers = users.filter((u: User) => u.status !== "inactive").length

      // Try to fetch other data but don't fail if they don't exist
      let kpis: any[] = []
      let awards: any[] = []
      let performances: any[] = []

      try {
        const kpisRes = await api.kpis.getAll()
        kpis = kpisRes.data || []
      } catch (e) {
        console.log('KPIs endpoint not available')
      }

      try {
        const awardsRes = await api.awards.getAll()
        awards = awardsRes.data || []
      } catch (e) {
        console.log('Awards endpoint not available')
      }

      try {
        const performanceRes = await api.performance.getAll()
        performances = performanceRes.data || []
      } catch (e) {
        console.log('Performance endpoint not available')
      }

      const avgPerf = performances.length > 0
        ? performances.reduce((sum: number, p: any) => sum + (p.overall_score || 0), 0) / performances.length
        : 0

      setStats({
        totalUsers: users.length,
        activeUsers,
        totalKPIs: kpis.length,
        totalAwards: awards.length,
        avgPerformance: avgPerf,
      })

      // Get 5 most recent users
      setRecentUsers(users.slice(0, 5))
      setError(null)
    } catch (err: any) {
      console.error('Dashboard error:', err)
      setError(err.message || "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-64"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.firstName || 'Admin'}! Manage your organization.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchDashboardData}>
            <RefreshCw size={18} />
          </Button>
          <Link href="/admin/users">
            <Button className="gap-2">
              <UserPlus size={18} />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-border hover:border-primary/50 transition">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-accent">{stats.activeUsers} active</p>
        </Card>

        <Card className="p-6 border-border hover:border-primary/50 transition">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Performance KPIs</p>
              <p className="text-3xl font-bold mt-1">{stats.totalKPIs}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-accent" />
            </div>
          </div>
          <p className="text-xs text-accent">Configured metrics</p>
        </Card>

        <Card className="p-6 border-border hover:border-primary/50 transition">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Awards</p>
              <p className="text-3xl font-bold mt-1">{stats.totalAwards}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-accent" />
            </div>
          </div>
          <p className="text-xs text-accent">Recognition given</p>
        </Card>

        <Card className="p-6 border-border hover:border-primary/50 transition">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg Performance</p>
              <p className="text-3xl font-bold mt-1">
                {stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : "N/A"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-accent">Organization wide</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/users">
          <Card className="p-6 border-border hover:border-primary/50 transition cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Employees</h3>
                <p className="text-sm text-muted-foreground">View and manage users</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/badges">
          <Card className="p-6 border-border hover:border-primary/50 transition cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition">
                <Award className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Badges</h3>
                <p className="text-sm text-muted-foreground">Awards and recognition</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/reports">
          <Card className="p-6 border-border hover:border-primary/50 transition cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">View Reports</h3>
                <p className="text-sm text-muted-foreground">Analytics and insights</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Users */}
      <Card className="p-6 border-border">
        <h2 className="text-xl font-bold mb-4">Recent Employees</h2>
        <div className="space-y-3">
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No employees yet</p>
          ) : (
            recentUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.firstName?.charAt(0) || ''}
                      {user.lastName?.charAt(0) || ''}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                    {user.role}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.department || "No department"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
