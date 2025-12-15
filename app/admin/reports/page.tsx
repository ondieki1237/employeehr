"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface Report {
  _id: string
  user_id?: {
    _id: string
    name: string
    email: string
  }
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  title: string
  content: string
  status: "submitted" | "approved" | "rejected"
  submitted_at?: string
  approved_at?: string
  rejection_reason?: string
  tags?: string[]
}

const statusColors = {
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900",
  approved: "bg-green-100 text-green-800 dark:bg-green-900",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900",
}

export default function AdminReportsPage() {
  const { toast } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("submitted")

  // Dialog states
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, searchQuery, selectedType, selectedStatus])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await api.reports.getAllSubmitted()
      if (response.success) {
        setReports(response.data || [])
      } else {
        toast({ description: "Failed to load reports", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = reports

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus)
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((r) => r.type === selectedType)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.content.toLowerCase().includes(query) ||
          r.user_id?.name.toLowerCase().includes(query) ||
          r.user_id?.email.toLowerCase().includes(query)
      )
    }

    setFilteredReports(filtered)
  }

  const handleApprove = async (reportId: string) => {
    try {
      setActionLoading(reportId)
      const response = await api.reports.approve(reportId)
      if (response.success) {
        toast({ description: "Report approved successfully" })
        loadReports()
      } else {
        toast({ description: response.message || "Failed to approve report", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectClick = (reportId: string) => {
    setSelectedReportId(reportId)
    setRejectionReason("")
    setShowRejectionDialog(true)
  }

  const handleRejectSubmit = async () => {
    if (!selectedReportId) return

    if (!rejectionReason.trim()) {
      toast({ description: "Please provide a rejection reason", variant: "destructive" })
      return
    }

    try {
      setActionLoading(selectedReportId)
      const response = await api.reports.reject(selectedReportId, rejectionReason)
      if (response.success) {
        toast({ description: "Report rejected successfully" })
        setShowRejectionDialog(false)
        loadReports()
      } else {
        toast({ description: response.message || "Failed to reject report", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  // Stats
  const stats = {
    submitted: reports.filter((r) => r.status === "submitted").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Report Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve employee reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.submitted}</p>
              <p className="text-sm text-muted-foreground mt-1">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-muted-foreground mt-1">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground mt-1">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Search by title, content, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{report.title}</h3>
                      <Badge variant="outline">{report.type}</Badge>
                      <Badge className={statusColors[report.status]}>
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      By{" "}
                      <span className="font-medium">
                        {report.user_id?.name || "Unknown"}
                      </span>{" "}
                      ({report.user_id?.email || "N/A"}) •{" "}
                      <span>
                        Submitted{" "}
                        {report.submitted_at
                          ? new Date(report.submitted_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </p>
                    <p className="text-sm text-foreground line-clamp-2 mb-3">
                      {report.content}
                    </p>
                    {report.tags && report.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {report.status === "submitted" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(report._id)}
                          disabled={actionLoading === report._id}
                        >
                          {actionLoading === report._id && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(report._id)}
                          disabled={actionLoading === report._id}
                        >
                          {actionLoading === report._id && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Approval/Rejection Info */}
                {report.status === "approved" && report.approved_at && (
                  <div className="mt-4 text-sm text-green-600 dark:text-green-400">
                    ✓ Approved on {new Date(report.approved_at).toLocaleDateString()}
                  </div>
                )}
                {report.status === "rejected" && report.rejection_reason && (
                  <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                    ✗ Rejected: {report.rejection_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this report. The employee will be able to view it and revise if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={actionLoading === selectedReportId}
            >
              {actionLoading === selectedReportId && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
