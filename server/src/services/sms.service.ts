import axios from "axios"

interface SendSmsInput {
  to: string
  message: string
}

interface SendSmsResult {
  success: boolean
  normalizedTo: string
  providerMessageId?: string
  providerRawResponse?: string
  error?: string
}

class SmsService {
  private readonly apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AFRICAN_TALKING_API_KEY || ""
  private readonly username = process.env.AFRICASTALKING_USERNAME || process.env.AFRICAN_TALKING_USERNAME || "sandbox"
  private readonly senderId = process.env.AFRICASTALKING_SENDER_ID || ""
  private readonly endpoint =
    process.env.AFRICASTALKING_BASE_URL ||
    (this.username === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging")
  private readonly defaultCountryCode = process.env.DISPATCH_DEFAULT_COUNTRY_CODE || "254"

  isConfigured() {
    return Boolean(this.apiKey && this.username)
  }

  normalizePhone(rawPhone: string): string {
    const trimmed = String(rawPhone || "").trim()
    if (!trimmed) return ""

    const withoutSymbols = trimmed.replace(/[\s()-]/g, "")
    if (withoutSymbols.startsWith("+")) {
      return `+${withoutSymbols.slice(1).replace(/\D/g, "")}`
    }

    const digitsOnly = withoutSymbols.replace(/\D/g, "")
    if (!digitsOnly) return ""

    if (digitsOnly.startsWith("0")) {
      return `+${this.defaultCountryCode}${digitsOnly.slice(1)}`
    }

    if (digitsOnly.startsWith(this.defaultCountryCode)) {
      return `+${digitsOnly}`
    }

    return `+${digitsOnly}`
  }

  async sendDispatchSms(input: SendSmsInput): Promise<SendSmsResult> {
    const normalizedTo = this.normalizePhone(input.to)

    if (!normalizedTo) {
      return {
        success: false,
        normalizedTo,
        error: "Invalid recipient phone number",
      }
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        normalizedTo,
        error: "AFRICASTALKING_API_KEY / AFRICASTALKING_USERNAME is not configured",
      }
    }

    try {
      const body = new URLSearchParams()
      body.append("username", this.username)
      body.append("to", normalizedTo)
      body.append("message", input.message)
      if (this.senderId) {
        body.append("from", this.senderId)
      }

      const response = await axios.post(this.endpoint, body.toString(), {
        headers: {
          apiKey: this.apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      })

      const responseData = response?.data || {}
      const recipients = responseData?.SMSMessageData?.Recipients || []
      const firstRecipient = recipients[0] || {}

      const providerStatus = String(firstRecipient?.status || "").toLowerCase()
      const isProviderSuccess = providerStatus.includes("success") || providerStatus.includes("queued")

      return {
        success: isProviderSuccess,
        normalizedTo,
        providerMessageId: firstRecipient?.messageId,
        providerRawResponse: JSON.stringify(responseData),
        error: isProviderSuccess ? undefined : (firstRecipient?.status || "Provider rejected SMS"),
      }
    } catch (error: any) {
      const providerPayload = error?.response?.data ? JSON.stringify(error.response.data) : undefined
      return {
        success: false,
        normalizedTo,
        error: error?.message || "Failed to send SMS",
        providerRawResponse: providerPayload,
      }
    }
  }
}

export const smsService = new SmsService()
