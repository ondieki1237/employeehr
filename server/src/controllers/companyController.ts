import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"

const ADMIN_SECTION_OPTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "PERFORMANCE",
  "SYSTEM",
]

const buildBaseUrl = (req: AuthenticatedRequest) => {
  const forwardedProto = (req.headers["x-forwarded-proto"] as string) || req.protocol
  const host = req.headers.host
  if (process.env.API_URL) return process.env.API_URL
  if (host) return `${forwardedProto}://${host}`
  return "http://localhost:5010"
}

export class CompanyController {
  static async getPageAccessSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const company = await Company.findById(req.org_id).select("pageAccessSettings")
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      const data = company.pageAccessSettings?.adminSectionsByRole || {
        company_admin: ADMIN_SECTION_OPTIONS,
        hr: ADMIN_SECTION_OPTIONS,
        manager: [],
        employee: [],
      }

      const rawUserSettings = (company.pageAccessSettings as any)?.adminSectionsByUser
      const rawUserEntries: Array<[string, unknown]> = rawUserSettings instanceof Map
        ? Array.from(rawUserSettings.entries())
        : Object.entries(rawUserSettings || {})

      const normalizedUserSettings = Object.fromEntries(
        rawUserEntries.map(([userId, sections]) => [
          userId,
          Array.isArray(sections)
            ? sections.filter((section: string) => ADMIN_SECTION_OPTIONS.includes(section))
            : [],
        ])
      )

      return res.json({
        success: true,
        data: {
          adminSectionsByRole: {
            company_admin: data.company_admin || ADMIN_SECTION_OPTIONS,
            hr: data.hr || ADMIN_SECTION_OPTIONS,
            manager: data.manager || [],
            employee: data.employee || [],
          },
          adminSectionsByUser: normalizedUserSettings,
          availableSections: ADMIN_SECTION_OPTIONS,
        },
      })
    } catch (error) {
      console.error("Error fetching page access settings:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch page access settings" })
    }
  }

  static async updatePageAccessSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const payload = req.body?.adminSectionsByRole || {}
      const userPayload = req.body?.adminSectionsByUser || {}

      const sanitizeSections = (value: unknown): string[] => {
        if (!Array.isArray(value)) return []
        const unique = Array.from(new Set(value.filter((item): item is string => typeof item === "string")))
        return unique.filter((section) => ADMIN_SECTION_OPTIONS.includes(section))
      }

      const nextSettings = {
        company_admin: ADMIN_SECTION_OPTIONS,
        hr: sanitizeSections(payload.hr),
        manager: sanitizeSections(payload.manager),
        employee: sanitizeSections(payload.employee),
      }

      const nextUserSettings = Object.fromEntries(
        Object.entries(userPayload)
          .filter(([userId]) => typeof userId === "string" && userId.length > 0)
          .map(([userId, sections]) => [userId, sanitizeSections(sections)])
      )

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            pageAccessSettings: {
              adminSectionsByRole: nextSettings,
              adminSectionsByUser: nextUserSettings,
            },
          },
        },
        { new: true }
      ).select("pageAccessSettings")

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Page access settings updated successfully",
        data: {
          adminSectionsByRole: nextSettings,
          adminSectionsByUser: nextUserSettings,
          availableSections: ADMIN_SECTION_OPTIONS,
        },
      })
    } catch (error) {
      console.error("Error updating page access settings:", error)
      return res.status(500).json({ success: false, message: "Failed to update page access settings" })
    }
  }

  static async getBranding(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const company = await Company.findById(req.org_id).select("logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle name slug email phone website city state country")
      if (!company) return res.status(404).json({ success: false, message: "Company not found" })
      
      // Build full logo URL if it's a file path
      const baseUrl = buildBaseUrl(req)
      const logoUrl = company.logo && !company.logo.startsWith("http")
        ? `${baseUrl}/uploads/logos/${company.logo}`
        : company.logo
      
      return res.json({ success: true, data: { ...company.toObject(), logo: logoUrl } })
    } catch (error) {
      console.error('Error fetching branding:', error)
      return res.status(500).json({ success: false, message: "Failed to fetch branding" })
    }
  }

  static async updateBranding(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderRadius, fontFamily, buttonStyle, logoUrl, logo } = req.body
      const updateFields: any = {}
      
      if (primaryColor !== undefined) updateFields.primaryColor = primaryColor
      if (secondaryColor !== undefined) updateFields.secondaryColor = secondaryColor
      if (accentColor !== undefined) updateFields.accentColor = accentColor
      if (backgroundColor !== undefined) updateFields.backgroundColor = backgroundColor
      if (textColor !== undefined) updateFields.textColor = textColor
      if (borderRadius !== undefined) updateFields.borderRadius = borderRadius
      if (fontFamily !== undefined) updateFields.fontFamily = fontFamily
      if (buttonStyle !== undefined) updateFields.buttonStyle = buttonStyle
      
      // Handle logo upload or URL (accept both logoUrl and logo fields)
      if (req.file) {
        // Save only filename, not full path
        updateFields.logo = req.file.filename
      } else if (logoUrl !== undefined || logo !== undefined) {
        // Save external URL directly
        updateFields.logo = logoUrl ?? logo
      }
      
      const company = await Company.findByIdAndUpdate(
        req.org_id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select("logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle name slug email phone website city state country")
      
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }
      
      // Build full logo URL for response
      const baseUrl = buildBaseUrl(req)
      const logoResponseUrl = company.logo && !company.logo.startsWith("http")
        ? `${baseUrl}/uploads/logos/${company.logo}`
        : company.logo
      
      const responseData = { ...company.toObject(), logo: logoResponseUrl }
      return res.json({ success: true, data: responseData })
    } catch (error) {
      console.error('Error updating branding:', error)
      return res.status(500).json({ success: false, message: "Failed to update branding" })
    }
  }
}
