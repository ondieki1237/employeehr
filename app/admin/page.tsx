'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  TrendingUp,
  UserPlus,
  BarChart3,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  ClipboardCheck,
  FileText,
  BadgeCheck,
  DollarSign,
  MessageSquare,
  Clock3,
  BriefcaseBusiness,
  Settings,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User } from '@/lib/types'

type DepartmentRow = {
  name: string
  headcount: number
  avgPerformance: number
  pendingLeave: number
  meetingsThisMonth: number
  reportsThisMonth: number
  attendanceRate: number
}

type DashboardData = {
  users: User[]
  kpis: any[]
  awards: any[]
  performances: any[]
  attendance: any[]
  leaveRequests: any[]
  payroll: any[]
  meetings: any[]
  reports: any[]
  feedback: any[]
  pdps: any[]
  stockInvoices: any[]
  stockProducts: any[]
  stockQuotations: any[]
}

type Branding = {
  name?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
}

const DEFAULT_DATA: DashboardData = {
  users: [],
  kpis: [],
  awards: [],
  performances: [],
  attendance: [],
  leaveRequests: [],
  payroll: [],
  meetings: [],
  reports: [],
  feedback: [],
  pdps: [],
  stockInvoices: [],
  stockProducts: [],
  stockQuotations: [],
}

const departmentOrder = ['HR', 'Operations', 'Finance', 'Sales', 'Engineering', 'Support']

export default function AdminDashboard() {
  const router = useRouter()
  const currentUser = getUser()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA)
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    loadDashboard()
    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = async () => {
    try {
      const res = await api.company.getBranding()
      if (res?.success && res.data) {
        setBranding({
          name: res.data.name,
          logo: res.data.logo,
          primaryColor: res.data.primaryColor,
          secondaryColor: res.data.secondaryColor,
          accentColor: res.data.accentColor,
          backgroundColor: res.data.backgroundColor,
          textColor: res.data.textColor,
          borderRadius: res.data.borderRadius,
          fontFamily: res.data.fontFamily,
        })
      }
    } catch (err) {
      console.error('Branding load error:', err)
    }
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentMonth = new Date()

      const [
        usersRes,
        kpisRes,
        awardsRes,
        perfRes,
        attendRes,
        leaveRes,
        payrollRes,
        meetingsRes,
        reportsRes,
        feedbackRes,
        pdpRes,
        stockInvoicesRes,
        stockProductsRes,
        stockQuotationsRes,
      ] = await Promise.allSettled([
        api.users.getAll(),
        api.kpis.getAll(),
        api.awards.getAll(),
        api.performance.getAll(),
        api.attendance.getAll(),
        api.leave.getAllRequests(),
        api.payroll.getAll(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`),
        api.meetings.getAll(),
        api.reports.getAllSubmitted(undefined, undefined),
        api.feedback.getAll(),
        api.pdps.getAll(),
        api.stock.getInvoices(),
        api.stock.getProducts(),
        api.stock.getQuotations(),
      ])

      const resolve = async (result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled') return result.value
        return null
      }

      const [usersApiRes, kpisApiRes, awardsApiRes, perfApiRes, attendApiRes, leaveApiRes, payrollApiRes, meetingsApiRes, reportsApiRes, feedbackApiRes, pdpApiRes] = await Promise.all([
        resolve(usersRes),
        resolve(kpisRes),
        resolve(awardsRes),
        resolve(perfRes),
        resolve(attendRes),
        resolve(leaveRes),
        resolve(payrollRes),
        resolve(meetingsRes),
        resolve(reportsRes),
        resolve(feedbackRes),
        resolve(pdpRes),
      ])

      const stockInvoicesApiRes = stockInvoicesRes.status === 'fulfilled' ? stockInvoicesRes.value : null
      const stockProductsApiRes = stockProductsRes.status === 'fulfilled' ? stockProductsRes.value : null
      const stockQuotationsApiRes = stockQuotationsRes.status === 'fulfilled' ? stockQuotationsRes.value : null

      setData({
        users: usersApiRes?.data || [],
        kpis: kpisApiRes?.data || [],
        awards: awardsApiRes?.data || [],
        performances: perfApiRes?.data || [],
        attendance: attendApiRes?.data || [],
        leaveRequests: leaveApiRes?.data || [],
        payroll: payrollApiRes?.data || [],
        meetings: meetingsApiRes?.data || [],
        reports: reportsApiRes?.data || [],
        feedback: feedbackApiRes?.data || [],
        pdps: pdpApiRes?.data || [],
        stockInvoices: stockInvoicesApiRes?.data || [],
        stockProducts: stockProductsApiRes?.data || [],
        stockQuotations: stockQuotationsApiRes?.data || [],
      })

    } catch (err: any) {
      console.error('Dashboard error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const brand = useMemo(() => ({
    name: branding?.name?.trim() || 'Organization',
    logo: branding?.logo || '',
    primary: branding?.primaryColor || '#2563eb',
    secondary: branding?.secondaryColor || '#059669',
    accent: branding?.accentColor || '#f59e0b',
    background: branding?.backgroundColor || '#f5f7fb',
    text: branding?.textColor || '#111827',
  }), [branding])

  const stats = useMemo(() => {
    const users = data.users
    const activeUsers = users.filter((u) => u.status !== 'inactive').length
    const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)))
    const totalLeavePending = data.leaveRequests.filter((r: any) => r.status === 'pending').length
    const meetingsThisMonth = data.meetings.filter((m: any) => {
      const date = new Date(m.scheduled_at || m.scheduled_start || m.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
    const reportsThisMonth = data.reports.filter((r: any) => {
      const date = new Date(r.createdAt || r.created_at)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
    const payrollProcessed = data.payroll.filter((p: any) => ['processed', 'paid'].includes(p.status)).length
    const avgPerformance = data.performances.length
      ? data.performances.reduce((sum: number, p: any) => sum + Number(p.overall_score || 0), 0) / data.performances.length
      : 0

    return {
      totalUsers: users.length,
      activeUsers,
      departments: departments.length,
      kpis: data.kpis.length,
      awards: data.awards.length,
      avgPerformance,
      pendingLeave: totalLeavePending,
      meetingsThisMonth,
      reportsThisMonth,
      payrollProcessed,
    }
  }, [data])

  const departmentRows = useMemo<DepartmentRow[]>(() => {
    const now = new Date()
    const users = data.users
    const meetingSet = data.meetings.filter((m: any) => {
      const date = new Date(m.scheduled_at || m.createdAt)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })

    return departmentOrder
      .map((name) => {
        const departmentUsers = users.filter((u) => (u.department || 'Unassigned') === name)
        const deptUserIds = departmentUsers.map((u) => String(u._id || (u as any).userId))
        const deptPerformances = data.performances.filter((p: any) => deptUserIds.includes(String(p.user_id)))
        const pendingLeave = data.leaveRequests.filter((r: any) => deptUserIds.includes(String(r.user_id)) && r.status === 'pending').length
        const reportsThisMonth = data.reports.filter((r: any) => {
          const userId = String(r.user_id?._id || r.user_id)
          return deptUserIds.includes(userId)
        }).length
        const attendanceRecords = data.attendance.filter((a: any) => deptUserIds.includes(String(a.user_id)))
        const attended = attendanceRecords.filter((a: any) => ['present', 'late', 'half_day'].includes(a.status)).length
        const attendanceRate = attendanceRecords.length ? Math.round((attended / attendanceRecords.length) * 100) : 0
        const avgPerformance = deptPerformances.length
          ? deptPerformances.reduce((sum: number, p: any) => sum + Number(p.overall_score || 0), 0) / deptPerformances.length
          : 0

        return {
          name,
          headcount: departmentUsers.length,
          avgPerformance: Number(avgPerformance.toFixed(1)),
          pendingLeave,
          meetingsThisMonth: meetingSet.filter((m: any) => deptUserIds.includes(String(m.organizer_id))).length,
          reportsThisMonth,
          attendanceRate,
        }
      })
      .filter((row) => row.headcount > 0)
      .sort((a, b) => b.headcount - a.headcount)
  }, [data])

  const performanceChart = useMemo(() => departmentRows.map((d) => ({ name: d.name, performance: d.avgPerformance })), [departmentRows])

  const attentionItems = useMemo(() => {
    const items: Array<{ label: string; value: string; tone?: string }> = []
    const lowAttendance = departmentRows.filter((d) => d.attendanceRate > 0 && d.attendanceRate < 85)
    if (lowAttendance.length > 0) {
      items.push({ label: 'Attendance below 85%', value: lowAttendance.map((d) => d.name).join(', '), tone: 'text-amber-700' })
    }
    if (stats.pendingLeave > 0) {
      items.push({ label: 'Pending leave requests', value: String(stats.pendingLeave), tone: 'text-blue-700' })
    }
    if (stats.reportsThisMonth > 0) {
      items.push({ label: 'Reports this month', value: String(stats.reportsThisMonth), tone: 'text-emerald-700' })
    }
    if (items.length === 0) {
      items.push({ label: 'System status', value: 'Stable across departments', tone: 'text-emerald-700' })
    }
    return items.slice(0, 3)
  }, [departmentRows, stats.pendingLeave, stats.reportsThisMonth])

  const dispatchSummary = useMemo(() => {
    const now = new Date()
    const monthlyInvoices = data.stockInvoices.filter((invoice: any) => {
      const activityDate = new Date(
        invoice.dispatch?.delivery?.arrivalTime ||
        invoice.dispatch?.dispatchedAt ||
        invoice.createdAt ||
        invoice.updatedAt ||
        0,
      )
      return activityDate.getMonth() === now.getMonth() && activityDate.getFullYear() === now.getFullYear()
    })

    const pendingStatuses = new Set(['not_assigned', 'assigned', 'packing', 'packed'])

    const pending = monthlyInvoices.filter((invoice: any) => pendingStatuses.has(invoice.dispatch?.status || 'not_assigned')).length
    const dispatched = monthlyInvoices.filter((invoice: any) => (invoice.dispatch?.status || '') === 'dispatched').length
    const delivered = monthlyInvoices.filter((invoice: any) => (invoice.dispatch?.status || '') === 'delivered').length

    return { pending, dispatched, delivered }
  }, [data.stockInvoices])

  const inventorySummary = useMemo(() => {
    const quotationsGenerated = data.stockQuotations.length
    const invoicesConverted = data.stockInvoices.filter((invoice: any) => invoice.quotationId || invoice.quotationNumber).length

    const salesByUser = new Map<string, number>()
    data.stockInvoices.forEach((invoice: any) => {
      const actorId = String(invoice.createdBy || '')
      if (!actorId) return
      salesByUser.set(actorId, (salesByUser.get(actorId) || 0) + Number(invoice.subTotal || 0))
    })

    let leadingSalesPerson = 'No sales data'
    let leadingSalesAmount = 0
    for (const [userId, amount] of salesByUser.entries()) {
      if (amount > leadingSalesAmount) {
        const user = data.users.find((u) => String(u._id) === userId)
        leadingSalesPerson = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : userId
        leadingSalesAmount = amount
      }
    }

    return {
      quotationsGenerated,
      invoicesConverted,
      leadingSalesPerson,
      leadingSalesAmount,
    }
  }, [data.stockInvoices, data.stockQuotations, data.users])

  const salesAnalytics = useMemo(() => {
    const products = data.stockProducts || []
    const mostInStock = products
      .slice()
      .sort((a: any, b: any) => Number(b.currentQuantity || 0) - Number(a.currentQuantity || 0))
      .slice(0, 5)

    const outOfStock = products
      .filter((product: any) => Number(product.currentQuantity || 0) <= 0)
      .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')))

    const salesByProduct = new Map<string, { productName: string; soldQuantity: number; salesAmount: number }>()
    data.stockInvoices.forEach((invoice: any) => {
      const items = Array.isArray(invoice.items) ? invoice.items : []
      items.forEach((item: any) => {
        const key = String(item.productId || item.productName || '')
        if (!key) return
        const existing = salesByProduct.get(key) || { productName: item.productName || 'Unknown', soldQuantity: 0, salesAmount: 0 }
        existing.soldQuantity += Number(item.quantity || 0)
        existing.salesAmount += Number(item.lineTotal || 0)
        salesByProduct.set(key, existing)
      })
    })

    const topSelling = Array.from(salesByProduct.values())
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5)

    return {
      mostInStock,
      outOfStock,
      topSelling,
    }
  }, [data.stockInvoices, data.stockProducts])

  if (loading && !data.users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-slate-200 rounded w-72" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
          <div className="grid xl:grid-cols-[1.7fr_1fr] gap-4">
            <div className="h-96 bg-slate-200 rounded-2xl" />
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen p-3 sm:p-4 lg:p-5"
      style={{
        backgroundColor: brand.background,
        color: brand.text,
      }}
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {brand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-sm font-semibold text-slate-700">{brand.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <p className="truncate text-sm font-medium text-slate-700">{brand.name} operations</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white" onClick={loadDashboard}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/admin/users">
              <Button className="gap-2 text-white" style={{ backgroundColor: brand.primary }}>
                <UserPlus size={18} />
                Add Employee
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadDashboard}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main grid */}
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard accentColor={brand.primary} label="Total Employees" value={stats.totalUsers} sublabel={`${stats.activeUsers} active`} icon={<Users className="w-5 h-5" />} />
              <MetricCard accentColor={brand.primary} label="Departments" value={stats.departments} sublabel="Across the organization" icon={<BriefcaseBusiness className="w-5 h-5" />} />
              <MetricCard accentColor={brand.accent} label="Pending Leave" value={stats.pendingLeave} sublabel="Requires review" icon={<CalendarDays className="w-5 h-5" />} />
              <MetricCard accentColor={brand.secondary} label="Avg Performance" value={stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(1) : 'N/A'} sublabel="Organization wide" icon={<TrendingUp className="w-5 h-5" />} />
            </div>

            {/* Mid row */}
            <div className="grid gap-4">
              <Card className="rounded-3xl border-slate-200 shadow-sm" style={{ borderTop: `4px solid ${brand.primary}` }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Department Performance</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="performance" radius={[10, 10, 0, 0]} fill={brand.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Department cards */}
            <Card className="rounded-3xl border-slate-200 shadow-sm" style={{ borderTop: `4px solid ${brand.accent}` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Department Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {departmentRows.map((dept) => (
                    <div key={dept.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{dept.name}</p>
                          <p className="text-xs text-slate-500">{dept.headcount} team members</p>
                        </div>
                        <div className="rounded-full p-2 border" style={{ backgroundColor: hexToRgba(brand.primary, 0.1), borderColor: hexToRgba(brand.primary, 0.2) }}>
                          <BarChart3 className="w-4 h-4" style={{ color: brand.primary }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <StatPill label="Performance" value={`${dept.avgPerformance || 0}`} />
                        <StatPill label="Attendance" value={`${dept.attendanceRate || 0}%`} />
                        <StatPill label="Leave" value={`${dept.pendingLeave}`} />
                        <StatPill label="Meetings" value={`${dept.meetingsThisMonth}`} />
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Reports this month: {dept.reportsThisMonth}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dispatch + operational activity */}
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm" style={{ borderTop: `4px solid ${brand.primary}` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Dispatch Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">This month</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs text-slate-500">Dispatched</p>
                      <p className="mt-1 text-3xl font-semibold text-slate-900">{dispatchSummary.dispatched}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="mt-1 text-3xl font-semibold text-slate-900">{dispatchSummary.pending}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs text-slate-500">Delivered</p>
                      <p className="mt-1 text-3xl font-semibold text-slate-900">{dispatchSummary.delivered}</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <Link href="/admin/stock/dispatch">
                      <Button variant="outline" className="bg-white" style={{ borderColor: brand.primary, color: brand.primary }}>
                        Open full dispatch
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-200 shadow-sm" style={{ borderTop: `4px solid ${brand.secondary}` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Operational Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <SmallMetric accentColor={brand.primary} icon={<ClipboardCheck className="w-4 h-4" />} label="Meetings" value={stats.meetingsThisMonth} />
                    <SmallMetric accentColor={brand.secondary} icon={<FileText className="w-4 h-4" />} label="Reports" value={stats.reportsThisMonth} />
                    <SmallMetric accentColor={brand.accent} icon={<BadgeCheck className="w-4 h-4" />} label="KPIs" value={stats.kpis} />
                    <SmallMetric accentColor={brand.primary} icon={<DollarSign className="w-4 h-4" />} label="Payroll" value={stats.payrollProcessed} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
                      <Clock3 className="w-4 h-4" />
                      Highlights
                    </div>
                    <div className="space-y-2">
                      {attentionItems.map((item, idx) => (
                        <div key={idx} className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                          <p className={`text-sm font-medium ${item.tone || 'text-slate-700'}`}>{item.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/admin/users"><Button variant="outline" className="bg-white" style={{ borderColor: brand.primary, color: brand.primary }}>Users</Button></Link>
                    <Link href="/admin/leave"><Button variant="outline" className="bg-white" style={{ borderColor: brand.secondary, color: brand.secondary }}>Leave</Button></Link>
                    <Link href="/admin/reports"><Button variant="outline" className="bg-white" style={{ borderColor: brand.accent, color: brand.accent }}>Reports</Button></Link>
                    <Link href="/admin/meetings"><Button variant="outline" className="bg-white" style={{ borderColor: brand.primary, color: brand.primary }}>Meetings</Button></Link>
                    <Link href="/admin/stock/dispatch"><Button variant="outline" className="bg-white" style={{ borderColor: brand.secondary, color: brand.secondary }}>Dispatch</Button></Link>
                    <Link href="/admin/settings"><Button variant="outline" className="bg-white" style={{ borderColor: brand.primary, color: brand.primary }}><Settings className="w-4 h-4 mr-2" />Settings</Button></Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden" style={{ borderTop: `4px solid ${brand.accent}` }}>
              <div className="px-5 py-4 text-white" style={{ backgroundColor: brand.primary }}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">This month</p>
                <h2 className="mt-1 text-xl font-semibold">Inventory Manager summary</h2>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <SidebarMetric accentColor={brand.primary} label="Quotations" value={inventorySummary.quotationsGenerated} />
                  <SidebarMetric accentColor={brand.secondary} label="Invoices Converted" value={inventorySummary.invoicesConverted} />
                  <SidebarMetric accentColor={brand.accent} label="Top Seller" value={inventorySummary.leadingSalesPerson} />
                  <SidebarMetric accentColor={brand.primary} label="Top Sales Value" value={`KES ${Math.round(inventorySummary.leadingSalesAmount).toLocaleString()}`} />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Inventory overview</p>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between"><span>Total products</span><span className="font-medium text-slate-900">{data.stockProducts.length}</span></div>
                    <div className="flex items-center justify-between"><span>Out of stock</span><span className="font-medium text-rose-600">{salesAnalytics.outOfStock.length}</span></div>
                    <div className="flex items-center justify-between"><span>Invoices issued</span><span className="font-medium text-slate-900">{data.stockInvoices.length}</span></div>
                    <div className="flex items-center justify-between"><span>Quotations draft</span><span className="font-medium text-slate-900">{data.stockQuotations.filter((q: any) => q.status === 'draft').length}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <MessageSquare className="w-4 h-4" />
                    Stock quick links
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/admin/stock/quotations"><Button variant="secondary" className="w-full justify-start">Quotations</Button></Link>
                    <Link href="/admin/stock/invoices"><Button variant="secondary" className="w-full justify-start">Invoices</Button></Link>
                    <Link href="/admin/stock/dispatch"><Button variant="secondary" className="w-full justify-start">Dispatch</Button></Link>
                    <Link href="/admin/stock/sales"><Button variant="secondary" className="w-full justify-start">Sales</Button></Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm" style={{ borderTop: `4px solid ${brand.primary}` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sales & Inventory analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Top selling products</p>
                  <div className="space-y-2">
                    {salesAnalytics.topSelling.length === 0 ? (
                      <p className="text-sm text-slate-500">No sales activity yet.</p>
                    ) : (
                      salesAnalytics.topSelling.map((item, idx) => (
                        <div key={`${item.productName}-${idx}`} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate pr-3">{item.productName}</span>
                          <span className="font-medium text-slate-900">{item.soldQuantity}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Products most in stock</p>
                  <div className="space-y-2">
                    {salesAnalytics.mostInStock.length === 0 ? (
                      <p className="text-sm text-slate-500">No product inventory found.</p>
                    ) : (
                      salesAnalytics.mostInStock.map((product: any) => (
                        <div key={product._id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate pr-3">{product.name}</span>
                          <span className="font-medium text-slate-900">{Number(product.currentQuantity || 0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-medium text-rose-700 mb-3">Out of stock</p>
                  <div className="space-y-2">
                    {salesAnalytics.outOfStock.length === 0 ? (
                      <p className="text-sm text-emerald-700">No out-of-stock products.</p>
                    ) : (
                      salesAnalytics.outOfStock.slice(0, 8).map((product: any) => (
                        <div key={product._id} className="flex items-center justify-between text-sm">
                          <span className="text-rose-700 truncate pr-3">{product.name}</span>
                          <span className="font-semibold text-rose-700">0</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sublabel, icon, accentColor }: { label: string; value: string | number; sublabel: string; icon: React.ReactNode; accentColor?: string }) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ backgroundColor: hexToRgba(accentColor || '#2563eb', 0.12), color: accentColor || '#111827' }}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SmallMetric({ icon, label, value, accentColor }: { icon: React.ReactNode; label: string; value: number | string; accentColor?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3" style={{ boxShadow: `inset 0 1px 0 ${hexToRgba(accentColor || '#2563eb', 0.06)}` }}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        <div style={{ color: accentColor || '#374151' }}>{icon}</div>
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function SidebarMetric({ label, value, accentColor }: { label: string; value: number | string; accentColor?: string }) {
  return (
    <div className="rounded-2xl border p-3 text-center" style={{ backgroundColor: hexToRgba(accentColor || '#2563eb', 0.06), borderColor: hexToRgba(accentColor || '#2563eb', 0.14) }}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color: accentColor || '#111827' }}>{value}</p>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function hexToRgba(color: string, alpha: number) {
  if (!color) return `rgba(37, 99, 235, ${alpha})`

  const normalized = color.replace('#', '')
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16)
    const g = parseInt(normalized[1] + normalized[1], 16)
    const b = parseInt(normalized[2] + normalized[2], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return color
}
