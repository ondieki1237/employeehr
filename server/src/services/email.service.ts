import nodemailer from "nodemailer";
import { Company } from "../models/Company";
import { emailTransportResolver } from "./emailTransportResolver";
import type { ICompany } from "../types/interfaces";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  companyId?: string; // Optional: specify which company is sending
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log("Initializing EmailService...");
    console.log("EMAIL_USER:", process.env.SMTP_USER);
    console.log("EMAIL_PASSWORD length:", process.env.SMTP_PASS?.length);
    console.log("EMAIL_HOST:", process.env.SMTP_HOST);

    // Configure system default email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email with multi-tenant support
   * Automatically resolves tenant email or falls back to system email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let company: ICompany | null = null;

      // Fetch company if companyId provided
      if (options.companyId) {
        company = await Company.findById(options.companyId);
      }

      // Resolve appropriate transporter
      const { transporter, fromAddress, fromName } =
        emailTransportResolver.resolveTransporter(company);

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
      });

      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Email send error:", error);

      // If tenant email failed, retry with system email as fallback
      if (options.companyId) {
        try {
          console.log("Retrying with system email...");
          const { transporter, fromAddress, fromName } =
            emailTransportResolver.resolveTransporter(null);

          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || "",
          });

          console.log("Email sent successfully with system fallback");
          return true;
        } catch (fallbackError) {
          console.error("System email fallback also failed:", fallbackError);
        }
      }

      return false;
    }
  }

  // Helper to resolve branding for templates
  private async resolveBranding(companyId?: string) {
    let company: ICompany | null = null;
    if (companyId) {
      company = await Company.findById(companyId);
    }

    const primaryColor = (company as any)?.primaryColor || "#0f766e";
    const secondaryColor = (company as any)?.secondaryColor || "#14b8a6";
    let logo = (company as any)?.logo || "";

    // If logo is relative (stored like /logo.png), turn into absolute using FRONTEND_URL
    if (logo && !/^https?:\/\//i.test(logo)) {
      const base = String(
        process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke",
      ).replace(/\/$/, "");
      if (!logo.startsWith("/")) logo = `/${logo}`;
      logo = `${base}${logo}`;
    }

    return { company, primaryColor, secondaryColor, logo };
  }

  async sendApplicationReceivedEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    companyName: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #1f2937; margin:0; padding:0; }
          .wrapper { width:100%; background:#f8fafc; padding:24px 0; }
          .card { max-width:680px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 6px 18px rgba(16,24,40,0.06); }
          .header { display:flex; align-items:center; gap:12px; padding:20px 24px; background: ${primaryColor}; color:#fff }
          .logo { height:42px; }
          .title { font-size:18px; font-weight:600; margin:0 }
          .content { padding:28px 24px; line-height:1.6 }
          .btn { display:inline-block; padding:12px 20px; border-radius:8px; background:${primaryColor}; color:#fff; text-decoration:none; font-weight:600 }
          .muted { color:#6b7280; font-size:13px }
          .footer { padding:18px 24px; font-size:12px; color:#9ca3af; text-align:center }
          @media (max-width: 480px) { .card { margin: 0 12px } }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <img src="${logo || `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`}" alt="logo" class="logo" />
              <div>
                <div class="title">Application received</div>
                <div style="font-size:12px; opacity:0.95">${companyName}</div>
              </div>
            </div>
            <div class="content">
              <p style="margin:0 0 12px">Hi ${applicantName},</p>
              <p style="margin:0 0 12px">Thanks for applying for the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>. We've received your application and our team will review it.</p>
              <p style="margin:0 0 12px">If your profile matches what we're looking for, we'll be in touch to arrange the next steps.</p>
              <p style="margin:0 0 18px">Best regards,<br /><strong>${companyName} Hiring Team</strong></p>
              <p class="muted" style="margin:0">This is an automated message — please do not reply to this email.</p>
            </div>
            <div class="footer">${companyName} · ${new Date().getFullYear()}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html,
      companyId,
    });
  }

  async sendApplicationNotificationToHR(
    hrEmail: string,
    applicantName: string,
    jobTitle: string,
    applicationLink: string,
    companyId?: string,
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
    `;

    return this.sendEmail({
      to: hrEmail,
      subject: `New Application: ${jobTitle} - ${applicantName}`,
      html,
    });
  }

  async sendStatusUpdateEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    status: string,
    message?: string,
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      reviewing: "Your application is currently under review.",
      shortlisted:
        "Congratulations! You have been shortlisted for the next stage.",
      rejected:
        "Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.",
      hired: "Congratulations! We are pleased to offer you the position.",
    };

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
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Update: ${jobTitle}`,
      html,
    });
  }

  async sendBulkInterviewInviteEmail(
    applicantEmail: string,
    applicantName: string,
    subject: string,
    body: string,
    companyId?: string,
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
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: subject,
      html,
      companyId,
    });
  }

  async sendInvitationEmail(
    inviteeEmail: string,
    companyName: string,
    inviteLink: string,
    invitedByName: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);

    const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #1f2937; margin:0; padding:0 }
            .wrapper { width:100%; background:#f8fafc; padding:24px 0 }
            .card { max-width:680px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(16,24,40,0.06) }
            .header { display:flex; align-items:center; gap:12px; padding:20px 24px; background: ${primaryColor}; color:#fff }
            .logo { height:42px }
            .title { font-size:18px; font-weight:600; margin:0 }
            .content { padding:28px 24px; line-height:1.6 }
            .cta { display:inline-block; padding:12px 20px; border-radius:8px; background:${primaryColor}; color:#fff; text-decoration:none; font-weight:600 }
            .muted { color:#6b7280; font-size:13px }
            .footer { padding:18px 24px; font-size:12px; color:#9ca3af; text-align:center }
            @media (max-width:480px){ .card { margin:0 12px } }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <img src="${logo || `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`}" alt="logo" class="logo" />
                <div>
                  <div class="title">You're invited to join ${companyName}</div>
                  <div style="font-size:12px; opacity:0.95">Invitation from ${invitedByName}</div>
                </div>
              </div>
              <div class="content">
                <p style="margin:0 0 12px">Hello,</p>
                <p style="margin:0 0 12px"><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on our HR platform.</p>
                <p style="margin:0 0 18px">To accept the invitation and set up your account, click the button below. The link will expire in 7 days.</p>
                <p style="margin:0 0 18px"><a href="${inviteLink}" class="cta">Accept Invitation</a></p>
                <p class="muted" style="margin:0 0 12px">If the button doesn't work, copy and paste this link into your browser:</p>
                <p class="muted" style="word-break:break-all; font-size:13px;">${inviteLink}</p>
                <p style="margin:18px 0 0">Best regards,<br /><strong>${companyName} Team</strong></p>
              </div>
              <div class="footer">If you did not expect this invitation, you can ignore this message.</div>
            </div>
          </div>
        </body>
        </html>
      `;

    return this.sendEmail({
      to: inviteeEmail,
      subject: `${invitedByName} invited you to join ${companyName} on Elevate`,
      html,
      companyId,
    });
  }
}

export default new EmailService();
