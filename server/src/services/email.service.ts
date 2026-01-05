import nodemailer from "nodemailer"
import { Company } from "../models/Company"
import { emailTransportResolver } from "./emailTransportResolver"
import type { ICompany } from "../types/interfaces"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  companyId?: string // Optional: specify which company is sending
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    console.log("Initializing EmailService...")
    console.log("EMAIL_USER:", process.env.SMTP_USER)
    console.log("EMAIL_PASSWORD length:", process.env.SMTP_PASS?.length)
    console.log("EMAIL_HOST:", process.env.SMTP_HOST)

    // Configure system default email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  /**
   * Send email with multi-tenant support
   * Automatically resolves tenant email or falls back to system email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let company: ICompany | null = null

      // Fetch company if companyId provided
      if (options.companyId) {
        company = await Company.findById(options.companyId)
      }

      // Resolve appropriate transporter
      const { transporter, fromAddress, fromName } = emailTransportResolver.resolveTransporter(company)

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
      })

      console.log("Email sent successfully:", info.messageId)
      return true
    } catch (error) {
      console.error("Email send error:", error)

      // If tenant email failed, retry with system email as fallback
      if (options.companyId) {
        try {
          console.log("Retrying with system email...")
          const { transporter, fromAddress, fromName } = emailTransportResolver.resolveTransporter(null)

          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || "",
          })

          console.log("Email sent successfully with system fallback")
          return true
        } catch (fallbackError) {
          console.error("System email fallback also failed:", fallbackError)
        }
      }

      return false
    }
  }

  async sendApplicationReceivedEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    companyName: string,
    companyId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received</h1>
          </div>
          <div class="content">
            <h2>Hi ${applicantName},</h2>
            <p>Thank you for applying for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            <p>We have received your application and our team will review it shortly. If your qualifications match our requirements, we will contact you for the next steps.</p>
            <p>We appreciate your interest in joining our team!</p>
            <p>Best regards,<br>${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html,
      companyId,
    })
  }

  async sendApplicationNotificationToHR(
    hrEmail: string,
    applicantName: string,
    jobTitle: string,
    applicationLink: string,
    companyId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Job Application</h1>
          </div>
          <div class="content">
            <h2>New Application Received</h2>
            <p><strong>${applicantName}</strong> has applied for the <strong>${jobTitle}</strong> position.</p>
            <p>Please review the application at your earliest convenience.</p>
            <a href="${applicationLink}" class="button">View Application</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: hrEmail,
      subject: `New Application: ${jobTitle} - ${applicantName}`,
      html,
    })
  }

  async sendStatusUpdateEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    status: string,
    message?: string
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      reviewing: "Your application is currently under review.",
      shortlisted: "Congratulations! You have been shortlisted for the next stage.",
      rejected: "Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.",
      hired: "Congratulations! We are pleased to offer you the position.",
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Status Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${applicantName},</h2>
            <p>We have an update regarding your application for the <strong>${jobTitle}</strong> position.</p>
            <p>${statusMessages[status] || "Your application status has been updated."}</p>
            ${message ? `<p>${message}</p>` : ""}
            <p>Best regards,<br>Hiring Team</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Update: ${jobTitle}`,
      html,
    })
  }

  async sendBulkInterviewInviteEmail(
    applicantEmail: string,
    applicantName: string,
    subject: string,
    body: string,
    companyId?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <h2>Hi ${applicantName},</h2>
            <p>${body}</p>
            <p>Best regards,<br>Hiring Team</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: applicantEmail,
      subject: subject,
      html,
      companyId,
    })
  }

  async sendInvitationEmail(
    inviteeEmail: string,
    companyName: string,
    inviteLink: string,
    invitedByName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Join ${companyName}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on Elevate - our performance management platform.</p>
            <p>Click the button below to accept your invitation and set up your account:</p>
            <p><a href="${inviteLink}" class="button">Accept Invitation</a></p>
            <p>Or copy and paste this link in your browser:<br><code>${inviteLink}</code></p>
            <p>This invitation will expire in 7 days.</p>
            <p>Best regards,<br>Elevate Team</p>
            <div class="footer">
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: inviteeEmail,
      subject: `${invitedByName} invited you to join ${companyName} on Elevate`,
      html,
    })
  }
}

export default new EmailService()