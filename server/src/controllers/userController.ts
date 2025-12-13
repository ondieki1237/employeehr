import type { Response } from "express"
import { UserService } from "../services/userService"
import { AuthService } from "../services/authService"
import type { AuthenticatedRequest } from "../middleware/auth"

export class UserController {
  static async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID and User context required" })
      }

      const { role, userId } = req.user

      // 1. Company Admin & HR: View all users
      if (role === "company_admin" || role === "hr" || role === "super_admin") {
        const result = await UserService.getAllUsers(req.org_id)
        return res.status(result.success ? 200 : 400).json(result)
      }

      // 2. Manager: View direct reports + self
      if (role === "manager") {
        const teamResult = await UserService.getTeamMembers(req.org_id, userId)
        if (!teamResult.success) return res.status(400).json(teamResult)

        // Also fetch self to include in the list
        const selfResult = await UserService.getUserById(req.org_id, userId)
        const users = teamResult.data || []
        if (selfResult.success && selfResult.data) {
          users.push(selfResult.data)
        }

        return res.status(200).json({
          success: true,
          message: "Team members fetched successfully",
          data: users
        })
      }

      // 3. Employee: View self only
      const result = await UserService.getUserById(req.org_id, userId)
      return res.status(result.success ? 200 : 400).json({
        ...result,
        data: result.data ? [result.data] : []
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId } = req.params
      const result = await UserService.getUserById(req.org_id, userId)
      res.status(result.success ? 200 : 404).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch user",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { userId } = req.params

      // Users can only update themselves unless they're admin
      if (userId !== req.user.userId && req.user.role !== "company_admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to update this user",
        })
      }

      const result = await UserService.updateUser(req.org_id, userId, req.body)
      res.status(result.success ? 200 : 404).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async createEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Get inviter's name from the authenticated user
      const inviterUser = req.user ? await import("../models/User").then(m => m.User.findById(req.user!.userId)) : null
      const inviterName = inviterUser ? `${inviterUser.firstName} ${inviterUser.lastName}` : "Administrator"

      const result = await AuthService.createEmployee(req.org_id, {
        ...req.body,
        inviter_name: inviterName,
      })
      res.status(result.success ? 201 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create employee",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getTeamMembers(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { managerId } = req.params
      const result = await UserService.getTeamMembers(req.org_id, managerId)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch team members",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get colleagues (users in same organization excluding self)
  static async getColleagues(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const result = await UserService.getAllUsers(req.org_id)
      
      if (result.success && result.data) {
        // Filter out current user and only return basic info
        const colleagues = result.data
          .filter((user: any) => user._id !== req.user?.userId)
          .map((user: any) => ({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            employee_id: user.employee_id,
            position: user.position,
            department: user.department,
          }))
        
        return res.status(200).json({
          success: true,
          message: "Colleagues fetched successfully",
          data: colleagues,
        })
      }
      
      return res.status(400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch colleagues",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
