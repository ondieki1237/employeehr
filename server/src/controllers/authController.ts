import type { Response } from "express"
import { AuthService } from "../services/authService"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AuthController {
  static async registerCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, phone, website, industry, employeeCount, adminEmail, adminPassword, adminName } = req.body

      // Debug logging
      console.log('Registration request body:', req.body)

      const result = await AuthService.registerCompany({
        name,
        email,
        phone,
        website,
        industry,
        employeeCount,
        adminEmail,
        adminPassword,
        adminName,
      })

      // Debug logging
      console.log('Registration result:', result)

      res.status(result.success ? 201 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async login(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        })
      }

      const result = await AuthService.login(email, password)
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { oldPassword, newPassword } = req.body

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Old password and new password are required",
        })
      }

      const result = await AuthService.changePassword(req.user.userId, oldPassword, newPassword)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Password change failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Company-specific login (for employees via company slug)
  static async companyLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug, email, password } = req.body

      if (!slug || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Company slug, email and password are required",
        })
      }

      const result = await AuthService.companyLogin(slug, email, password)
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Validate if company exists
  static async validateCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug } = req.params

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Company slug is required",
        })
      }

      const result = await AuthService.validateCompany(slug)
      res.status(result.success ? 200 : 404).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Validation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Employee ID login (for /employee route)
  static async employeeIdLogin(req: AuthenticatedRequest, res: Response) {
    try {
      const { employee_id, password } = req.body

      if (!employee_id || !password) {
        return res.status(400).json({
          success: false,
          message: "Employee ID and password are required",
        })
      }

      const result = await AuthService.employeeIdLogin(employee_id, password)
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
