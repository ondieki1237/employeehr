import type { Request, Response } from "express"
import { AuthService } from "../services/authService"
import { Company } from "../models/Company"
import { User } from "../models/User"

export class ShuleController {
  static async registerSchool(req: Request, res: Response) {
    try {
      const { name, slug, email, adminEmail, adminPassword, adminName } = req.body

      if (!name || !slug || !adminEmail || !adminPassword || !adminName) {
        return res.status(400).json({ success: false, message: "Missing required fields" })
      }

      // Use AuthService.registerCompany but enforce education defaults
      const result = await AuthService.registerCompany({
        name,
        email: email || `${slug}@example.com`,
        phone: "",
        website: "",
        industry: "Education",
        employeeCount: 0,
        adminEmail,
        adminPassword,
        adminName,
      })

      res.status(result.success ? 201 : 400).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Registration failed", error: error instanceof Error ? error.message : undefined })
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { slug, email, password } = req.body
      if (!slug || !email || !password) return res.status(400).json({ success: false, message: "Missing fields" })

      const result = await AuthService.companyLogin(slug, email, password)
      res.status(result.success ? 200 : 401).json(result)
    } catch (error) {
      res.status(500).json({ success: false, message: "Login failed", error: error instanceof Error ? error.message : undefined })
    }
  }

  static async createSchoolUser(req: Request, res: Response) {
    try {
      const { slug, email, password, firstName, lastName, role } = req.body
      if (!slug || !email || !firstName || !lastName) return res.status(400).json({ success: false, message: "Missing fields" })

      // find company
      const company = await Company.findOne({ slug: slug.toLowerCase() })
      if (!company) return res.status(404).json({ success: false, message: "School not found" })

      // Map frontend roles to system roles
      let mappedRole: any = "employee"
      if (role === "manager") mappedRole = "manager"
      if (role === "facilitator") mappedRole = "manager"
      if (role === "student") mappedRole = "employee"

      const resp = await AuthService.createEmployee(company._id.toString(), {
        firstName,
        lastName,
        email,
        password,
        role: mappedRole,
      } as any)

      res.status(resp.success ? 201 : 400).json(resp)
    } catch (error) {
      res.status(500).json({ success: false, message: "Create user failed", error: error instanceof Error ? error.message : undefined })
    }
  }

  static async me(req: any, res: Response) {
    try {
      // At this point authMiddleware has already verified the token and set req.user
      const user = await User.findById(req.user.userId).select("-password")
      const company = await Company.findById(req.user.org_id).select("name slug email")

      return res.json({ success: true, data: { user, company } })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed", error: error instanceof Error ? error.message : undefined })
    }
  }
}
