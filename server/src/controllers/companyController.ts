import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"

const ADMIN_SECTION_OPTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
]

const DEFAULT_DISPATCH_SMS_TEMPLATE = [
  "Hello {{clientName}}, your package for invoice {{invoiceNumber}} (DN {{deliveryNoteNumber}}) has been dispatched.",
  "Courier: {{courierName}} ({{courierContactNumber}}).",
  "For inquiries, call office: {{officeContactNumber}}.",
  "Thank you.",
].join(" ")

const DEFAULT_INVOICE_TERMS = [
  "Payment is due within 7 days from the invoice date.",
  "All items remain the property of the company until fully paid.",
  "Goods once sold are subject to the company return policy.",
].join(" ")

const normalizePaymentChannel = (value: any) => ({
  channelName: String(value?.channelName || value?.name || "").trim(),
  bankName: String(value?.bankName || "").trim(),
  accountName: String(value?.accountName || "").trim(),
  accountNumber: String(value?.accountNumber || "").trim(),
  branch: String(value?.branch || "").trim(),
  notes: String(value?.notes || "").trim(),
})

const DISPATCH_SMS_ALLOWED_PLACEHOLDERS = [
  "{{clientName}}",
  "{{invoiceNumber}}",
  "{{deliveryNoteNumber}}",
  "{{courierName}}",
  "{{courierContactNumber}}",
  "{{officeContactNumber}}",
]

const buildBaseUrl = (req: AuthenticatedRequest) => {
  const forwardedProto = (req.headers["x-forwarded-proto"] as string) || req.protocol
  const host = req.headers.host
  if (process.env.API_URL) return process.env.API_URL
  if (host) return `${forwardedProto}://${host}`
  return "http://localhost:5010"
}

export class CompanyController {
  static async getInvoiceSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const company = await Company.findById(req.org_id).select("email phone city state country logo invoiceSettings")
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        data: {
          invoiceEmail: String(company.invoiceSettings?.invoiceEmail || company.email || "").trim(),
          contactPhone: String(company.invoiceSettings?.contactPhone || company.phone || "").trim(),
          officeLocation: String(
            company.invoiceSettings?.officeLocation ||
            [company.city, company.state, company.country].filter(Boolean).join(", ") ||
            "",
          ).trim(),
          contactEmail: String(company.invoiceSettings?.contactEmail || company.invoiceSettings?.invoiceEmail || company.email || "").trim(),
          termsAndConditions: String(company.invoiceSettings?.termsAndConditions || DEFAULT_INVOICE_TERMS).trim(),
          includeQuotationReference: company.invoiceSettings?.includeQuotationReference ?? true,
          includeDeliveryNoteNumber: company.invoiceSettings?.includeDeliveryNoteNumber ?? true,
          includePreparedBy: company.invoiceSettings?.includePreparedBy ?? true,
          includeVat: company.invoiceSettings?.includeVat ?? true,
          includePaymentChannels: company.invoiceSettings?.includePaymentChannels ?? true,
          paymentChannels: Array.isArray(company.invoiceSettings?.paymentChannels)
            ? company.invoiceSettings.paymentChannels.map(normalizePaymentChannel)
            : [],
          logoUrl: company.logo || "",
          defaultTermsAndConditions: DEFAULT_INVOICE_TERMS,
        },
      })
    } catch (error) {
      console.error("Error fetching invoice settings:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch invoice settings" })
    }
  }

  static async updateInvoiceSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const invoiceEmail = String(req.body?.invoiceEmail || "").trim()
      const contactPhone = String(req.body?.contactPhone || "").trim()
      const officeLocation = String(req.body?.officeLocation || "").trim()
      const contactEmail = String(req.body?.contactEmail || "").trim()
      const termsAndConditions = String(req.body?.termsAndConditions || "").trim()
      const includeQuotationReference = Boolean(req.body?.includeQuotationReference)
      const includeDeliveryNoteNumber = Boolean(req.body?.includeDeliveryNoteNumber)
      const includePreparedBy = Boolean(req.body?.includePreparedBy)
      const includeVat = Boolean(req.body?.includeVat)
      const includePaymentChannels = Boolean(req.body?.includePaymentChannels)
      const paymentChannels = Array.isArray(req.body?.paymentChannels)
        ? req.body.paymentChannels
            .map(normalizePaymentChannel)
            .filter((channel: any) => channel.channelName || channel.bankName || channel.accountNumber || channel.branch || channel.notes)
        : []

      if (!invoiceEmail) {
        return res.status(400).json({ success: false, message: "invoiceEmail is required" })
      }

      if (!termsAndConditions) {
        return res.status(400).json({ success: false, message: "termsAndConditions is required" })
      }

      if (termsAndConditions.length > 2000) {
        return res.status(400).json({ success: false, message: "termsAndConditions is too long (max 2000 characters)" })
      }

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            "invoiceSettings.invoiceEmail": invoiceEmail,
            "invoiceSettings.contactPhone": contactPhone,
            "invoiceSettings.officeLocation": officeLocation,
            "invoiceSettings.contactEmail": contactEmail || invoiceEmail,
            "invoiceSettings.termsAndConditions": termsAndConditions,
            "invoiceSettings.includeQuotationReference": includeQuotationReference,
            "invoiceSettings.includeDeliveryNoteNumber": includeDeliveryNoteNumber,
            "invoiceSettings.includePreparedBy": includePreparedBy,
            "invoiceSettings.includeVat": includeVat,
            "invoiceSettings.includePaymentChannels": includePaymentChannels,
            "invoiceSettings.paymentChannels": paymentChannels,
          },
        },
        { new: true }
      ).select("email phone city state country logo invoiceSettings")

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Invoice settings updated successfully",
        data: {
          invoiceEmail: String(company.invoiceSettings?.invoiceEmail || company.email || "").trim(),
          contactPhone: String(company.invoiceSettings?.contactPhone || company.phone || "").trim(),
          officeLocation: String(
            company.invoiceSettings?.officeLocation ||
            [company.city, company.state, company.country].filter(Boolean).join(", ") ||
            "",
          ).trim(),
          contactEmail: String(company.invoiceSettings?.contactEmail || company.invoiceSettings?.invoiceEmail || company.email || "").trim(),
          termsAndConditions: String(company.invoiceSettings?.termsAndConditions || DEFAULT_INVOICE_TERMS).trim(),
          includeQuotationReference: company.invoiceSettings?.includeQuotationReference ?? true,
          includeDeliveryNoteNumber: company.invoiceSettings?.includeDeliveryNoteNumber ?? true,
          includePreparedBy: company.invoiceSettings?.includePreparedBy ?? true,
          includeVat: company.invoiceSettings?.includeVat ?? true,
          includePaymentChannels: company.invoiceSettings?.includePaymentChannels ?? true,
          paymentChannels: Array.isArray(company.invoiceSettings?.paymentChannels)
            ? company.invoiceSettings.paymentChannels.map(normalizePaymentChannel)
            : [],
          logoUrl: company.logo || "",
          defaultTermsAndConditions: DEFAULT_INVOICE_TERMS,
        },
      })
    } catch (error) {
      console.error("Error updating invoice settings:", error)
      return res.status(500).json({ success: false, message: "Failed to update invoice settings" })
    }
  }

  static async getDispatchSmsSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const company = await Company.findById(req.org_id).select("phone dispatchSmsSettings")
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      const officePhone = String(company.dispatchSmsSettings?.officePhone || company.phone || "").trim()
      const messageTemplate = String(company.dispatchSmsSettings?.messageTemplate || DEFAULT_DISPATCH_SMS_TEMPLATE).trim()

      return res.json({
        success: true,
        data: {
          officePhone,
          messageTemplate,
          placeholders: DISPATCH_SMS_ALLOWED_PLACEHOLDERS,
          defaultTemplate: DEFAULT_DISPATCH_SMS_TEMPLATE,
        },
      })
    } catch (error) {
      console.error("Error fetching dispatch SMS settings:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch dispatch SMS settings" })
    }
  }

  static async updateDispatchSmsSettings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const officePhone = String(req.body?.officePhone || "").trim()
      const messageTemplate = String(req.body?.messageTemplate || "").trim()

      if (!officePhone) {
        return res.status(400).json({ success: false, message: "officePhone is required" })
      }

      if (!messageTemplate) {
        return res.status(400).json({ success: false, message: "messageTemplate is required" })
      }

      if (messageTemplate.length > 800) {
        return res.status(400).json({ success: false, message: "messageTemplate is too long (max 800 characters)" })
      }

      const company = await Company.findByIdAndUpdate(
        req.org_id,
        {
          $set: {
            "dispatchSmsSettings.officePhone": officePhone,
            "dispatchSmsSettings.messageTemplate": messageTemplate,
          },
        },
        { new: true }
      ).select("phone dispatchSmsSettings")

      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      return res.json({
        success: true,
        message: "Dispatch SMS settings updated successfully",
        data: {
          officePhone: String(company.dispatchSmsSettings?.officePhone || company.phone || "").trim(),
          messageTemplate: String(company.dispatchSmsSettings?.messageTemplate || DEFAULT_DISPATCH_SMS_TEMPLATE).trim(),
          placeholders: DISPATCH_SMS_ALLOWED_PLACEHOLDERS,
          defaultTemplate: DEFAULT_DISPATCH_SMS_TEMPLATE,
        },
      })
    } catch (error) {
      console.error("Error updating dispatch SMS settings:", error)
      return res.status(500).json({ success: false, message: "Failed to update dispatch SMS settings" })
    }
  }

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
