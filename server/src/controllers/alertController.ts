import type { Response } from "express"
import Alert from "../models/Alert"
import { ContractAlert } from "../models/ContractAlert"
import { PDP } from "../models/PDP"
import { User } from "../models/User"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AlertController {
  // Generate contract expiry warnings
  static async generateContractAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const contracts = await ContractAlert.find({
        org_id: req.org_id,
        status: { $in: ["active", "expiring_soon"] },
      })

      const now = new Date()
      let alertsCreated = 0

      for (const contract of contracts) {
        const daysUntilExpiry = Math.ceil(
          (contract.end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysUntilExpiry <= contract.alert_days_before && daysUntilExpiry > 0) {
          // Check if alert already exists
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: contract.user_id,
            alert_type: "contract_expiry",
            related_id: contract._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            const severity =
              daysUntilExpiry <= 7 ? "critical" : daysUntilExpiry <= 14 ? "high" : "medium"

            await Alert.create({
              org_id: req.org_id,
              user_id: contract.user_id,
              alert_type: "contract_expiry",
              severity,
              title: `${contract.contract_type} contract expiring soon`,
              message: `Your ${contract.contract_type} contract expires in ${daysUntilExpiry} days (${new Date(contract.end_date).toLocaleDateString()})`,
              related_id: contract._id?.toString(),
              related_type: "contract",
              action_url: `/employee/contracts#${contract._id}`,
              action_label: "View Contract",
              metadata: {
                contract_type: contract.contract_type,
                end_date: contract.end_date,
                days_until_expiry: daysUntilExpiry,
              },
            })
            alertsCreated++
          }
        } else if (daysUntilExpiry <= 0 && contract.status !== "expired") {
          // Contract has expired
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: contract.user_id,
            alert_type: "contract_expiry",
            related_id: contract._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            await Alert.create({
              org_id: req.org_id,
              user_id: contract.user_id,
              alert_type: "contract_expiry",
              severity: "critical",
              title: `${contract.contract_type} contract has expired`,
              message: `Your ${contract.contract_type} contract expired on ${new Date(contract.end_date).toLocaleDateString()}. Action required!`,
              related_id: contract._id?.toString(),
              related_type: "contract",
              action_url: `/employee/contracts#${contract._id}`,
              action_label: "Renew Contract",
              metadata: {
                contract_type: contract.contract_type,
                end_date: contract.end_date,
                days_overdue: Math.abs(daysUntilExpiry),
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} contract alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate contract alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Generate incomplete PDP alerts
  static async generatePDPAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const pdps = await PDP.find({ org_id: req.org_id })

      let alertsCreated = 0

      for (const pdp of pdps) {
        const incompleteSections = []

        // Check personal profile
        if (!pdp.personalProfile || !pdp.personalProfile.values || pdp.personalProfile.values.length === 0) {
          incompleteSections.push("Personal Profile")
        }

        // Check vision & mission
        if (!pdp.visionMission || !pdp.visionMission.lifeVision) {
          incompleteSections.push("Vision & Mission")
        }

        // Check goals
        if (!pdp.goals || pdp.goals.length === 0) {
          incompleteSections.push("Goals")
        }

        // Check action plans
        if (!pdp.actionPlans || pdp.actionPlans.length === 0) {
          incompleteSections.push("Action Plans")
        }

        if (incompleteSections.length > 0) {
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: pdp.user_id,
            alert_type: "incomplete_pdp",
            related_id: pdp._id,
            is_dismissed: false,
          })

          if (!existingAlert) {
            const completionPercent = Math.round(
              ((5 - incompleteSections.length) / 5) * 100
            )

            await Alert.create({
              org_id: req.org_id,
              user_id: pdp.user_id,
              alert_type: "incomplete_pdp",
              severity: incompleteSections.length > 3 ? "high" : "medium",
              title: "PDP Incomplete",
              message: `Your Personal Development Plan is ${completionPercent}% complete. Missing: ${incompleteSections.join(", ")}`,
              related_id: pdp._id?.toString(),
              related_type: "pdp",
              action_url: `/employee/pdp#${pdp._id}`,
              action_label: "Complete PDP",
              metadata: {
                incomplete_sections: incompleteSections,
                completion_percent: completionPercent,
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} PDP alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate PDP alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Generate task overload alerts
  static async generateTaskOverloadAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Get all users in organization
      const users = await User.find({ org_id: req.org_id, status: "active" })

      let alertsCreated = 0

      for (const user of users) {
        // For now, we'll use sample data since we need the full Task model integration
        // This should be updated once Task endpoints are integrated
        const overdueCount = 0 // Should come from actual database query
        const upcomingCount = 0 // Should come from actual database query

        if (overdueCount >= 3 || upcomingCount >= 10) {
          const existingAlert = await Alert.findOne({
            org_id: req.org_id,
            user_id: user._id,
            alert_type: "task_overload",
            is_dismissed: false,
          })

          if (!existingAlert) {
            const severity = overdueCount >= 5 ? "critical" : "high"

            await Alert.create({
              org_id: req.org_id,
              user_id: user._id?.toString(),
              alert_type: "task_overload",
              severity,
              title: "Task Overload Alert",
              message: `You have ${overdueCount} overdue tasks and ${upcomingCount} tasks due within 7 days. Consider prioritizing or requesting support.`,
              related_type: "task",
              action_url: `/employee/tasks?filter=overdue`,
              action_label: "View Tasks",
              metadata: {
                overdue_count: overdueCount,
                upcoming_count: upcomingCount,
                total_pending: overdueCount + upcomingCount,
              },
            })
            alertsCreated++
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Generated ${alertsCreated} task overload alerts`,
        data: { alerts_created: alertsCreated },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate task overload alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all alerts for user
  static async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { severity, alert_type, include_dismissed } = req.query

      const query: any = {
        org_id: req.org_id,
        user_id: req.user.userId,
      }

      if (!include_dismissed) {
        query.is_dismissed = false
      }

      if (severity) query.severity = severity
      if (alert_type) query.alert_type = alert_type

      const alerts = await Alert.find(query).sort({ severity: -1, created_at: -1 })

      // Separate into categories
      const criticalAlerts = alerts.filter((a) => a.severity === "critical")
      const highAlerts = alerts.filter((a) => a.severity === "high")
      const mediumAlerts = alerts.filter((a) => a.severity === "medium")
      const lowAlerts = alerts.filter((a) => a.severity === "low")

      return res.status(200).json({
        success: true,
        message: "Alerts fetched successfully",
        data: {
          total: alerts.length,
          unread: alerts.filter((a) => !a.is_read).length,
          by_severity: {
            critical: criticalAlerts.length,
            high: highAlerts.length,
            medium: mediumAlerts.length,
            low: lowAlerts.length,
          },
          alerts,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Mark alert as read
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alertId } = req.params

      const alert = await Alert.findOneAndUpdate(
        {
          _id: alertId,
          org_id: req.org_id,
          user_id: req.user.userId,
        },
        { $set: { is_read: true } },
        { new: true }
      )

      if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Alert marked as read",
        data: alert,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to mark alert as read",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Dismiss alert
  static async dismissAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alertId } = req.params

      const alert = await Alert.findOneAndUpdate(
        {
          _id: alertId,
          org_id: req.org_id,
          user_id: req.user.userId,
        },
        { $set: { is_dismissed: true } },
        { new: true }
      )

      if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Alert dismissed",
        data: alert,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to dismiss alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Dismiss all alerts of a type
  static async dismissAllOfType(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { alert_type } = req.params

      const result = await Alert.updateMany(
        {
          org_id: req.org_id,
          user_id: req.user.userId,
          alert_type,
          is_dismissed: false,
        },
        { $set: { is_dismissed: true } }
      )

      return res.status(200).json({
        success: true,
        message: `Dismissed ${result.modifiedCount} alerts`,
        data: { dismissed_count: result.modifiedCount },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to dismiss alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get alert summary
  static async getAlertSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const summary = await Alert.aggregate([
        {
          $match: {
            org_id: req.org_id,
            user_id: req.user.userId,
            is_dismissed: false,
          },
        },
        {
          $group: {
            _id: "$alert_type",
            count: { $sum: 1 },
            severity: { $first: "$severity" },
            critical: {
              $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
            },
            high: {
              $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] },
            },
            medium: {
              $sum: { $cond: [{ $eq: ["$severity", "medium"] }, 1, 0] },
            },
            low: {
              $sum: { $cond: [{ $eq: ["$severity", "low"] }, 1, 0] },
            },
          },
        },
      ])

      return res.status(200).json({
        success: true,
        message: "Alert summary fetched",
        data: summary,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch alert summary",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete alert
  static async deleteAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const { alertId } = req.params

      await Alert.findByIdAndDelete(alertId)

      return res.status(200).json({
        success: true,
        message: "Alert deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
