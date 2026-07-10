import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { isPlatformOwner } from "../utils/platformOwner"

export class OwnerController {
  /**
   * Get all companies with their details
   */
  static async getAllCompanies(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      console.log("📊 [OwnerController] Fetching all companies...")

      const companies = await Company.find()
        .lean()
        .sort({ createdAt: -1 })

      console.log(`✅ [OwnerController] Found ${companies.length} companies`)

      // Map to include all needed fields with defaults
      const companiesData = companies.map((company: any) => ({
        _id: company._id?.toString(),
        name: company.name,
        email: company.email,
        slug: company.slug,
        phone: company.phone,
        industry: company.industry,
        status: company.status,
        subscription: company.subscription,
        isFrozen: company.isFrozen || false,
        frozenReason: company.frozenReason,
        frozenAt: company.frozenAt,
        enabledPages: company.enabledPages || [],
        pageAccessSettings: company.pageAccessSettings,
        maxEmployees: company.maxEmployees || 100,
        employeeCount: company.employeeCount || 0,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        primaryColor: company.primaryColor,
        logo: company.logo,
      }))

      return res.json({
        success: true,
        data: companiesData,
        total: companiesData.length,
      })
    } catch (error) {
      console.error("❌ [OwnerController] Error fetching companies:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch companies",
        error: process.env.NODE_ENV === "development" ? (error as any).message : undefined,
      })
    }
  }

  /**
   * Freeze a company account
   */
  static async freezeCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId, reason } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isFrozen: true,
          frozenReason: reason || "Account frozen by system owner",
          frozenAt: new Date(),
          frozenBy: userEmail,
        },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company account frozen successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error freezing company:", error)
      return res.status(500).json({ success: false, message: "Failed to freeze company" })
    }
  }

  /**
   * Unfreeze a company account
   */
  static async unfreezeCompany(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isFrozen: false,
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
        },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company account unfrozen successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error unfreezing company:", error)
      return res.status(500).json({ success: false, message: "Failed to unfreeze company" })
    }
  }

  /**
   * Update enabled pages for a company
   */
  static async updateCompanyPages(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId, enabledPages } = req.body

      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId is required" })
      }

      if (!Array.isArray(enabledPages)) {
        return res.status(400).json({ success: false, message: "enabledPages must be an array" })
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        { enabledPages },
        { new: true },
      )

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Company pages updated successfully",
        data: company,
      })
    } catch (error) {
      console.error("Error updating company pages:", error)
      return res.status(500).json({ success: false, message: "Failed to update company pages" })
    }
  }

  /**
   * Get single company details
   */
  static async getCompanyDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""

      if (!isPlatformOwner(req.user?.email, req.user?.role)) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      const { companyId } = req.params

      const company = await Company.findById(companyId)

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        data: company,
      })
    } catch (error) {
      console.error("Error fetching company details:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch company details" })
    }
  }
}
