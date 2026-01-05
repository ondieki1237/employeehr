import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { emailTransportResolver } from "../services/emailTransportResolver"

export class CompanyEmailController {
  /**
   * Get company email configuration
   */
  static async getEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Return config without sensitive password
      const config = company.emailConfig
        ? {
            enabled: company.emailConfig.enabled,
            verified: company.emailConfig.verified,
            fromName: company.emailConfig.fromName,
            fromEmail: company.emailConfig.fromEmail,
            smtp: company.emailConfig.smtp
              ? {
                  host: company.emailConfig.smtp.host,
                  port: company.emailConfig.smtp.port,
                  secure: company.emailConfig.smtp.secure,
                  username: company.emailConfig.smtp.username,
                  // Don't return password
                }
              : undefined,
          }
        : null

      res.status(200).json({
        success: true,
        data: config,
      })
    } catch (error) {
      console.error("Get email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Update company email configuration
   */
  static async updateEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { enabled, fromName, fromEmail, smtp } = req.body

      // Validate required fields if enabled
      if (enabled && (!smtp?.host || !smtp?.username || !smtp?.password)) {
        return res.status(400).json({
          success: false,
          message: "SMTP host, username, and password are required when email is enabled",
        })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Update email config
      company.emailConfig = {
        enabled: enabled || false,
        verified: false, // Reset verification status on update
        fromName: fromName || company.name,
        fromEmail: fromEmail || company.email,
        smtp: smtp
          ? {
              host: smtp.host,
              port: smtp.port || 587,
              secure: smtp.secure || false,
              username: smtp.username,
              password: smtp.password, // TODO: Encrypt this
            }
          : undefined,
      }

      await company.save()

      res.status(200).json({
        success: true,
        message: "Email configuration updated successfully",
        data: {
          enabled: company.emailConfig.enabled,
          verified: company.emailConfig.verified,
          fromName: company.emailConfig.fromName,
          fromEmail: company.emailConfig.fromEmail,
        },
      })
    } catch (error) {
      console.error("Update email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Test and verify email configuration
   */
  static async verifyEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { testEmail } = req.body

      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: "Test email address is required",
        })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      if (!company.emailConfig?.smtp) {
        return res.status(400).json({
          success: false,
          message: "Email configuration not found. Please configure SMTP settings first.",
        })
      }

      // Test the email configuration
      const result = await emailTransportResolver.testEmailConfig(
        company.emailConfig.smtp.host,
        company.emailConfig.smtp.port,
        company.emailConfig.smtp.secure,
        company.emailConfig.smtp.username,
        company.emailConfig.smtp.password,
        testEmail
      )

      if (result.success) {
        // Mark as verified
        company.emailConfig.verified = true
        await company.save()

        return res.status(200).json({
          success: true,
          message: "Email configuration verified successfully. Test email sent.",
          data: {
            verified: true,
          },
        })
      } else {
        return res.status(400).json({
          success: false,
          message: `Email verification failed: ${result.message}`,
        })
      }
    } catch (error) {
      console.error("Verify email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to verify email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Disable company email (fall back to system email)
   */
  static async disableEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      if (company.emailConfig) {
        company.emailConfig.enabled = false
        await company.save()
      }

      res.status(200).json({
        success: true,
        message: "Company email disabled. System email will be used for all communications.",
      })
    } catch (error) {
      console.error("Disable email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to disable email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
