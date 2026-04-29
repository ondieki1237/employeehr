"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Clock3, RefreshCw, Users } from "lucide-react"
import { api } from "@/lib/api"

type AttendanceRecord = {
  _id: string
  user_id: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  status: "present" | "absent" | "late" | "half-day" | string
  hours?: number
  remarks?: string
}

type UserRecord = {
  _id: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
}

const normalizeRecord = (record: any): AttendanceRecord => ({
  _id: String(record._id),
  user_id: String(record.user_id || record.userId || record.user?._id || ""),
  date: record.date,
  checkIn: record.checkIn ?? null,
  checkOut: record.checkOut ?? null,
  status: record.status || "present",
  hours: Number(record.hours ?? record.hoursWorked ?? 0),
  remarks: record.remarks,
})

const statusVariant = {
  present: "default",
  absent: "destructive",
  late: "secondary",
  "half-day": "outline",
} as const

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const loadAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const [attendanceRes, usersRes] = await Promise.all([api.attendance.getAll(), api.users.getAll()])
      setRecords(((attendanceRes?.data || []) as any[]).map(normalizeRecord))
      setUsers(usersRes?.data || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance tracker")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  const usersMap = useMemo(() => {
    const map = new Map<string, UserRecord>()
    users.forEach((user) => map.set(String(user._id), user))
    return map
  }, [users])

  const employees = useMemo(() => {
    const employeeUsers = users.filter((user) => user.role === "employee")
    return employeeUsers.length > 0 ? employeeUsers : users
  }, [users])

  const employeeStatsByUser = useMemo(() => {
    const map = new Map<string, { records: number; totalHours: number; present: number; late: number; absent: number }>()
    records.forEach((record) => {
      const key = String(record.user_id)
      const previous = map.get(key) || { records: 0, totalHours: 0, present: 0, late: 0, absent: 0 }
      previous.records += 1
      previous.totalHours += Number(record.hours || 0)
      if (record.status === "present") previous.present += 1
      if (record.status === "late") previous.late += 1
      if (record.status === "absent") previous.absent += 1
      map.set(key, previous)
    })
    return map
  }, [records])

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return employees

    return employees.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase()
      return fullName.includes(query) || (user.email || "").toLowerCase().includes(query)
    })
  }, [employees, employeeSearch])

  useEffect(() => {
    if (!filteredEmployees.length) {
      setSelectedEmployeeId(null)
      return
    }

    if (!selectedEmployeeId || !filteredEmployees.some((user) => String(user._id) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(filteredEmployees[0]._id))
    }
  }, [filteredEmployees, selectedEmployeeId])

  const selectedEmployee = useMemo(
    () => filteredEmployees.find((user) => String(user._id) === selectedEmployeeId) || null,
    [filteredEmployees, selectedEmployeeId],
  )

  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployeeId) return []
    return records
      .filter((record) => String(record.user_id) === selectedEmployeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [records, selectedEmployeeId])

  const getStats = (source: AttendanceRecord[]) => {
    const totalRecords = source.length
    const present = source.filter((record) => record.status === "present").length
    const late = source.filter((record) => record.status === "late").length
    const absent = source.filter((record) => record.status === "absent").length
    const totalHours = source.reduce((sum, record) => sum + Number(record.hours || 0), 0)
    const avgHours = totalRecords ? totalHours / totalRecords : 0
    const attendanceRate = totalRecords ? ((present + late) / totalRecords) * 100 : 0
    return { totalRecords, present, late, absent, totalHours, avgHours, attendanceRate }
  }

  const weekStart = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const monthRange = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }, [])

  const weeklyStats = useMemo(() => {
    return getStats(selectedEmployeeRecords.filter((record) => new Date(record.date).getTime() >= weekStart.getTime()))
  }, [selectedEmployeeRecords, weekStart])

  const monthlyStats = useMemo(() => {
    return getStats(
      selectedEmployeeRecords.filter((record) => {
        const date = new Date(record.date)
        return date >= monthRange.start && date <= monthRange.end
      }),
    )
  }, [selectedEmployeeRecords, monthRange])

  const allTimeStats = useMemo(() => getStats(selectedEmployeeRecords), [selectedEmployeeRecords])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Tracker</h1>
          <p className="text-muted-foreground">Monitor employee check-ins, check-outs and working hours.</p>
        </div>
        <Button onClick={() => loadAttendance(true)} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder="Search employee by name or email"
            />

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found.</p>
              ) : (
                filteredEmployees.map((employee) => {
                  const key = String(employee._id)
                  const stats = employeeStatsByUser.get(key) || { records: 0, totalHours: 0, present: 0, late: 0, absent: 0 }
                  const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unknown User"
                  const active = key === selectedEmployeeId

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedEmployeeId(key)}
                      className={`w-full rounded-lg border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                    >
                      <div className="font-medium">{fullName}</div>
                      <div className="text-xs text-muted-foreground">{employee.email || "No email"}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stats.records} records</span>
                        <span>•</span>
                        <span>{stats.totalHours.toFixed(1)}h total</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {selectedEmployee
                  ? `${`${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim() || "Employee"} Performance`
                  : "Attendance Performance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <p className="text-sm text-muted-foreground">Select an employee to view attendance performance.</p>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">{selectedEmployee.email || "No email"}</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Weekly Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{weeklyStats.avgHours.toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground">Attendance: {weeklyStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Monthly Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{monthlyStats.avgHours.toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground">Attendance: {monthlyStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">All-Time Avg Hours</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{allTimeStats.avgHours.toFixed(1)}h</div>
                        <p className="text-xs text-muted-foreground">Attendance: {allTimeStats.attendanceRate.toFixed(0)}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Present</CardTitle></CardHeader>
                      <CardContent><div className="text-xl font-semibold">{allTimeStats.present}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Late</CardTitle></CardHeader>
                      <CardContent><div className="text-xl font-semibold">{allTimeStats.late}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Absent</CardTitle></CardHeader>
                      <CardContent><div className="text-xl font-semibold">{allTimeStats.absent}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Total Hours</CardTitle></CardHeader>
                      <CardContent><div className="text-xl font-semibold">{allTimeStats.totalHours.toFixed(1)}h</div></CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Employee Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEmployeeRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No attendance records for this employee
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedEmployeeRecords.slice(0, 180).map((record) => {
                        const badgeVariant = statusVariant[record.status as keyof typeof statusVariant] || "outline"
                        return (
                          <TableRow key={record._id}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>{record.checkIn || "N/A"}</TableCell>
                            <TableCell>{record.checkOut || "N/A"}</TableCell>
                            <TableCell>{record.hours ? `${Number(record.hours).toFixed(1)}h` : "0h"}</TableCell>
                            <TableCell>
                              <Badge variant={badgeVariant}>{record.status || "unknown"}</Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Showing latest 180 records for the selected employee.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
