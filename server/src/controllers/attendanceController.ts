import type { Response } from "express"
import { Attendance } from "../models/Attendance"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AttendanceController {
  static async markAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { user_id, date, status, hoursWorked, remarks } = req.body

      const attendance = new Attendance({
        org_id: req.org_id,
        user_id,
        date: new Date(date),
        status,
        hoursWorked,
        remarks,
      })

      const savedAttendance = await attendance.save()

      res.status(201).json({
        success: true,
        message: "Attendance marked successfully",
        data: savedAttendance,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to mark attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getAttendanceRecords(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId } = req.params
      const { startDate, endDate } = req.query

      const query: any = {
        org_id: req.org_id,
        user_id: userId,
      }

      if (startDate || endDate) {
        query.date = {}
        if (startDate) query.date.$gte = new Date(startDate as string)
        if (endDate) query.date.$lte = new Date(endDate as string)
      }

      const records = await Attendance.find(query).sort({ date: -1 })

      res.status(200).json({
        success: true,
        message: "Attendance records fetched successfully",
        data: records,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
