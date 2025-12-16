import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"

export class CompanyController {
  static async getBranding(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const company = await Company.findById(req.org_id).select("logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle name slug")
      if (!company) return res.status(404).json({ success: false, message: "Company not found" })
      
      // Build full logo URL if it's a file path
      const logoUrl = company.logo && !company.logo.startsWith('http') 
        ? `${process.env.API_URL || 'http://localhost:5010'}/uploads/logos/${company.logo}` 
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
      const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderRadius, fontFamily, buttonStyle, logoUrl } = req.body
      const updateFields: any = {}
      
      if (primaryColor !== undefined) updateFields.primaryColor = primaryColor
      if (secondaryColor !== undefined) updateFields.secondaryColor = secondaryColor
      if (accentColor !== undefined) updateFields.accentColor = accentColor
      if (backgroundColor !== undefined) updateFields.backgroundColor = backgroundColor
      if (textColor !== undefined) updateFields.textColor = textColor
      if (borderRadius !== undefined) updateFields.borderRadius = borderRadius
      if (fontFamily !== undefined) updateFields.fontFamily = fontFamily
      if (buttonStyle !== undefined) updateFields.buttonStyle = buttonStyle
      
      // Handle logo upload or URL
      if (req.file) {
        // Save only filename, not full path
        updateFields.logo = req.file.filename
      } else if (logoUrl !== undefined) {
        // Save external URL directly
        updateFields.logo = logoUrl
      }
      
      const company = await Company.findByIdAndUpdate(
        req.org_id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select("logo primaryColor secondaryColor accentColor backgroundColor textColor borderRadius fontFamily buttonStyle name slug")
      
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }
      
      // Build full logo URL for response
      const logoResponseUrl = company.logo && !company.logo.startsWith('http') 
        ? `${process.env.API_URL || 'http://localhost:5010'}/uploads/logos/${company.logo}` 
        : company.logo
      
      const responseData = { ...company.toObject(), logo: logoResponseUrl }
      return res.json({ success: true, data: responseData })
    } catch (error) {
      console.error('Error updating branding:', error)
      return res.status(500).json({ success: false, message: "Failed to update branding" })
    }
  }
}
