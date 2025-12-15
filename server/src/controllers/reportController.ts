import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Report } from "../models/Report"
import { User } from "../models/User"

export class ReportController {
  // Create or update draft report
  static async saveReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id, type, title, content, tags } = req.body

      if (!type || !title || !content) {
        return res.status(400).json({ success: false, message: "type, title, and content are required" })
      }

      if (!["daily", "weekly", "monthly", "quarterly", "annual"].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid report type" })
      }

      let report

      if (report_id) {
        // Update existing draft
        report = await Report.findOne({
          _id: report_id,
          org_id: req.org_id,
          user_id: req.user.userId,
          status: "draft",
        })

        if (!report) {
          return res.status(404).json({ success: false, message: "Draft report not found" })
        }

        report.type = type
        report.title = title
        report.content = content
        report.tags = tags || []
        await report.save()
      } else {
        // Create new draft
        report = await Report.create({
          org_id: req.org_id,
          user_id: req.user.userId,
          type,
          title,
          content,
          tags: tags || [],
          status: "draft",
        })
      }

      res.status(200).json({
        success: true,
        message: "Report saved as draft",
        data: report,
      })
    } catch (error) {
      console.error("Save report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to save report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Submit report for approval
  static async submitReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
        user_id: req.user.userId,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "submitted"
      report.submitted_at = new Date()
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report submitted for approval",
        data: report,
      })
    } catch (error) {
      console.error("Submit report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to submit report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get user's reports (drafts and submitted)
  static async getUserReports(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { type, status } = req.query

      let filter: any = {
        org_id: req.org_id,
        user_id: req.user.userId,
      }

      if (type) filter.type = type
      if (status) filter.status = status

      const reports = await Report.find(filter).sort({ created_at: -1 }).populate("user_id", "firstName lastName email")

      res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
      })
    } catch (error) {
      console.error("Get user reports error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch reports",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get single report
  static async getReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { report_id } = req.params

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })
        .populate("user_id", "firstName lastName email")
        .populate("approved_by", "firstName lastName email")

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      res.status(200).json({
        success: true,
        data: report,
      })
    } catch (error) {
      console.error("Get report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Get all submitted reports
  static async getAllSubmittedReports(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { type, status, user_id } = req.query

      let filter: any = {
        org_id: req.org_id,
        status: { $in: ["submitted", "approved", "rejected"] },
      }

      if (type) filter.type = type
      if (status) filter.status = status
      if (user_id) filter.user_id = user_id

      const reports = await Report.find(filter)
        .sort({ submitted_at: -1 })
        .populate("user_id", "firstName lastName email")
        .populate("approved_by", "firstName lastName email")

      res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
      })
    } catch (error) {
      console.error("Get all reports error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch reports",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Approve report
  static async approveReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "approved"
      report.approved_at = new Date()
      report.approved_by = req.user.userId
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report approved",
        data: report,
      })
    } catch (error) {
      console.error("Approve report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to approve report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Reject report
  static async rejectReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id, reason } = req.body

      if (!report_id) {
        return res.status(400).json({ success: false, message: "report_id is required" })
      }

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" })
      }

      report.status = "rejected"
      report.rejection_reason = reason || "No reason provided"
      report.approved_by = req.user.userId
      report.approved_at = new Date()
      await report.save()

      res.status(200).json({
        success: true,
        message: "Report rejected",
        data: report,
      })
    } catch (error) {
      console.error("Reject report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to reject report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete draft report
  static async deleteReport(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { report_id } = req.params

      const report = await Report.findOne({
        _id: report_id,
        org_id: req.org_id,
        user_id: req.user.userId,
        status: "draft",
      })

      if (!report) {
        return res.status(404).json({ success: false, message: "Draft report not found" })
      }

      await Report.deleteOne({ _id: report_id })

      res.status(200).json({
        success: true,
        message: "Report deleted",
      })
    } catch (error) {
      console.error("Delete report error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete report",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Admin: Get report analytics
  static async getReportAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { type, month } = req.query

      let filter: any = { org_id: req.org_id }
      if (type) filter.type = type

      // Get counts by status
      const statusCounts = await Report.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])

      // Get counts by type
      const typeCounts = await Report.aggregate([
        { $match: filter },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ])

      // Get counts by user (top submitters)
      const topSubmitters = await Report.aggregate([
        { $match: { ...filter, status: "submitted" } },
        { $group: { _id: "$user_id", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
      ])

      res.status(200).json({
        success: true,
        data: {
          status_summary: statusCounts,
          type_summary: typeCounts,
          top_submitters: topSubmitters,
        },
      })
    } catch (error) {
      console.error("Get report analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Generate summary from previous reports
  static async generateSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization and user context required" })
      }

      const { fromType, toType } = req.body

      if (!fromType || !toType) {
        return res.status(400).json({ success: false, message: "fromType and toType are required" })
      }

      const validTypes = ["daily", "weekly", "monthly", "quarterly", "annual"]
      if (!validTypes.includes(fromType) || !validTypes.includes(toType)) {
        return res.status(400).json({ success: false, message: "Invalid report types" })
      }

      // Get approved reports of the source type from the last period
      const daysLookback = getDateRangeForType(fromType)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysLookback)

      const sourceReports = await Report.find({
        org_id: req.org_id,
        user_id: req.user.userId,
        type: fromType,
        status: "approved",
        approved_at: { $gte: startDate },
      }).sort({ submitted_at: -1 })

      if (sourceReports.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No approved ${fromType} reports found in the period`,
        })
      }

      // Generate summary using simple aggregation
      const summaryContent = generateSummaryText(sourceReports, fromType, toType)
      const summaryTitle = generateSummaryTitle(toType)

      res.status(200).json({
        success: true,
        data: {
          summary: summaryContent,
          title: summaryTitle,
          basedOnReportIds: sourceReports.map((r) => r._id),
          sourceReportsCount: sourceReports.length,
        },
      })
    } catch (error) {
      console.error("Generate summary error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to generate summary",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

// Helper functions for summary generation
function getDateRangeForType(type: string): number {
  switch (type) {
    case "daily":
      return 1
    case "weekly":
      return 7
    case "monthly":
      return 30
    case "quarterly":
      return 90
    case "annual":
      return 365
    default:
      return 7
  }
}

function generateSummaryTitle(toType: string): string {
  const now = new Date()
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  switch (toType) {
    case "weekly":
      return `Weekly Report - Week of ${now.toLocaleDateString()}`
    case "monthly":
      return `Monthly Report - ${monthNames[now.getMonth()]} ${now.getFullYear()}`
    case "quarterly": {
      const quarter = Math.floor(now.getMonth() / 3) + 1
      return `Quarterly Report Q${quarter} ${now.getFullYear()}`
    }
    case "annual":
      return `Annual Report - ${now.getFullYear()}`
    default:
      return "Summary Report"
  }
}

function generateSummaryText(reports: any[], fromType: string, toType: string): string {
  const reportCount = reports.length
  const allContent = reports.map((r) => r.content).join("\n\n---\n\n")

  // Extract key points and highlights
  const keyPoints = extractKeyPoints(reports)
  const metrics = extractMetrics(reports)

  let summary = `# ${toType.charAt(0).toUpperCase() + toType.slice(1)} Summary\n\n`
  summary += `**Generated from ${reportCount} ${fromType} report(s)**\n\n`

  if (keyPoints.length > 0) {
    summary += `## Key Highlights\n`
    keyPoints.forEach((point) => {
      summary += `- ${point}\n`
    })
    summary += "\n"
  }

  if (Object.keys(metrics).length > 0) {
    summary += `## Metrics\n`
    Object.entries(metrics).forEach(([key, value]) => {
      summary += `- **${key}:** ${value}\n`
    })
    summary += "\n"
  }

  summary += `## Detailed Summary\n\n${allContent}`

  return summary
}

function extractKeyPoints(reports: any[]): string[] {
  const points: string[] = []

  // Look for common keywords indicating key achievements or activities
  const keywords = [
    "completed",
    "achieved",
    "delivered",
    "launched",
    "accomplished",
    "finished",
    "success",
    "milestone",
  ]

  reports.forEach((report) => {
    const content = report.content.toLowerCase()
    keywords.forEach((keyword) => {
      if (content.includes(keyword)) {
        // Extract sentences containing the keyword
        const sentences = report.content.split(/[.!?]+/)
        sentences.forEach((sentence) => {
          if (
            sentence.toLowerCase().includes(keyword) &&
            sentence.trim().length > 10 &&
            !points.includes(sentence.trim())
          ) {
            points.push(sentence.trim())
          }
        })
      }
    })
  })

  return points.slice(0, 5) // Return top 5 key points
}

function extractMetrics(reports: any[]): Record<string, string | number> {
  const metrics: Record<string, string | number> = {}
  const numberPattern = /(\d+(?:\.\d+)?)\s*(hours|days|items|tasks|projects|meetings|calls)?/gi

  let totalHours = 0
  let totalItems = 0
  let meetingCount = 0

  reports.forEach((report) => {
    const matches = report.content.matchAll(numberPattern)
    Array.from(matches).forEach((match) => {
      const number = parseFloat(match[1])
      const unit = (match[2] || "").toLowerCase()

      if (unit.includes("hour")) totalHours += number
      if (unit.includes("item") || unit.includes("task")) totalItems += number
      if (report.content.toLowerCase().includes("meeting")) meetingCount++
    })
  })

  if (totalHours > 0) metrics["Total Hours Worked"] = totalHours
  if (totalItems > 0) metrics["Total Items Completed"] = totalItems
  if (meetingCount > 0) metrics["Meetings/Calls"] = meetingCount

  return metrics
}
