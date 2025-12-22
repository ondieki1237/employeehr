import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    console.log("Initializing EmailService...")
    console.log("EMAIL_USER:", process.env.EMAIL_USER)
    console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : "undefined")
    console.log("EMAIL_HOST:", process.env.EMAIL_HOST)

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: process.env.EMAIL_SECURE === "true" || true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Email transporter verification failed:", error)
      } else {
        console.log("✅ Email transporter is ready to send emails")
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log(`Attempting to send email to: ${options.to}`)
      console.log(`Email subject: ${options.subject}`)
      
      const info = await this.transporter.sendMail({
        from: `"Elevate HR" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })

      console.log("✅ Email sent successfully:", info.messageId)
      console.log("Accepted recipients:", info.accepted)
      console.log("Rejected recipients:", info.rejected)
      return true
    } catch (error) {
      console.error("❌ Failed to send email:", error)
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }
      return false
    }
  }

  async sendInvitationEmail(data: {
    recipientEmail: string
    recipientName: string
    inviterName: string
    role: string
    temporaryPassword: string
    loginUrl: string
  }): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .credentials-box {
              background: white;
              border: 2px solid #667eea;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background: #f3f4f6;
              border-radius: 5px;
            }
            .credential-label {
              font-weight: 600;
              color: #667eea;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .credential-value {
              font-size: 16px;
              color: #1f2937;
              font-family: 'Courier New', monospace;
              margin-top: 5px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .info-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Welcome to Elevate!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.recipientName}!</h2>
            <p>
              You've been invited to join <strong>Elevate</strong> by <strong>${data.inviterName}</strong>.
            </p>
            <p>
              You have been added to the team as a <strong>${data.role.replace('_', ' ').toUpperCase()}</strong>.
            </p>

            <div class="info-box">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
            </div>

            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #667eea;">Your Login Credentials</h3>
              
              <div class="credential-item">
                <div class="credential-label">Email</div>
                <div class="credential-value">${data.recipientEmail}</div>
              </div>

              <div class="credential-item">
                <div class="credential-label">Temporary Password</div>
                <div class="credential-value">${data.temporaryPassword}</div>
              </div>

              <div class="credential-item">
                <div class="credential-label">Role</div>
                <div class="credential-value">${data.role.replace('_', ' ')}</div>
              </div>

              <div class="credential-item">
                <div class="credential-label">Invited By</div>
                <div class="credential-value">${data.inviterName}</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${data.loginUrl}" class="button">Login to Elevate</a>
            </div>

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              If you have any questions or need assistance, please don't hesitate to reach out to your administrator.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from Elevate HR Platform</p>
            <p>&copy; ${new Date().getFullYear()} Elevate. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Welcome to Elevate - You've been invited by ${data.inviterName}`,
      html,
    })
  }
}

export const emailService = new EmailService()
