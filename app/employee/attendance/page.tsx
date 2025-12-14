"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { getUser } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"

interface AttendanceRecord {
  _id: string
  date: string
  checkIn: string
  checkOut?: string
  status: "present" | "absent" | "late" | "half-day"
  hours?: number
  notes?: string
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    totalHours: 0,
  })

  useEffect(() => {
    fetchAttendance()
  }, [])

  const fetchAttendance = async () => {
    try {
      const user = getUser()
      if (!user) return

      const response = await fetch(`${API_URL}/api/attendance/my-attendance`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data.data || [])
        calculateStats(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: AttendanceRecord[]) => {
    const stats = records.reduce(
      (acc, record) => {
        if (record.status === "present") acc.present++
        if (record.status === "absent") acc.absent++
        if (record.status === "late") acc.late++
        if (record.hours) acc.totalHours += record.hours
        return acc
      },
      { present: 0, absent: 0, late: 0, totalHours: 0 }
    )
    setStats(stats)
  }

  const handleCheckIn = async () => {
    try {
      const user = getUser()
      if (!user) return

      const response = await fetch(`${API_URL}/api/attendance/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        fetchAttendance()
      }
    } catch (error) {
      console.error("Failed to check in:", error)
    }
  }

  const handleCheckOut = async () => {
    try {
      const user = getUser()
      if (!user) return

      const response = await fetch(`${API_URL}/api/attendance/check-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        fetchAttendance()
      }
    } catch (error) {
      console.error("Failed to check out:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "late":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      present: "default",
      absent: "destructive",
      late: "secondary",
      "half-day": "outline",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const todayRecord = attendanceRecords.find(
    (record) => new Date(record.date).toDateString() === new Date().toDateString()
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Track your attendance and working hours</p>
        </div>
        <div className="flex gap-2">
          {!todayRecord?.checkIn && (
            <Button onClick={handleCheckIn}>
              <Clock className="mr-2 h-4 w-4" />
              Check In
            </Button>
          )}
          {todayRecord?.checkIn && !todayRecord?.checkOut && (
            <Button onClick={handleCheckOut} variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.present}</div>
            <p className="text-xs text-muted-foreground">Total present days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absent}</div>
            <p className="text-xs text-muted-foreground">Total absent days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.late}</div>
            <p className="text-xs text-muted-foreground">Times late</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Hours worked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Calendar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Your attendance history</CardDescription>
          </CardHeader>
          <CardContent>
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
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.slice(0, 10).map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.checkIn || "N/A"}</TableCell>
                      <TableCell>{record.checkOut || "N/A"}</TableCell>
                      <TableCell>{record.hours ? `${record.hours.toFixed(1)}h` : "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status */}
      {todayRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Check In</p>
                <p className="text-lg font-semibold">{todayRecord.checkIn || "Not checked in"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check Out</p>
                <p className="text-lg font-semibold">{todayRecord.checkOut || "Not checked out"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="text-lg font-semibold">{todayRecord.hours ? `${todayRecord.hours.toFixed(1)}h` : "0h"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(todayRecord.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
