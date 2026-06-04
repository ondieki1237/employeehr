import type { IJWTPayload } from "../../types/interfaces"
import { Company } from "../../models/Company"

export type AssistantOrgContext = {
  orgId: string
  userId: string
  role: string
  userName: string
  companyName: string
  timezone: string
}

export async function buildOrgContext(user: IJWTPayload): Promise<AssistantOrgContext> {
  let companyName = "Your Company"
  try {
    if (user.org_id) {
      const company = await Company.findById(user.org_id).select("name").lean()
      if (company?.name) companyName = company.name
    }
  } catch {
    // Non-fatal: fall back to generic name
  }

  return {
    orgId: String(user.org_id || ""),
    userId: String(user.userId || ""),
    role: String(user.role || "employee"),
    userName: String(user.email || "User").split("@")[0] || "User",
    companyName,
    timezone: "Africa/Nairobi", // Default timezone; extend this if stored per-company
  }
}

// ─── Date helpers ────────────────────────────────────────────────────────────

export function parseIsoDate(value: string | undefined, fallback: Date): Date {
  if (!value?.trim()) return fallback
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

export function startOfLastMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1, 0, 0, 0, 0))
}

export function endOfLastMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0, 23, 59, 59, 999))
}

export function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
}

export function endOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999))
}

export function startOfLastYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear() - 1, 0, 1, 0, 0, 0, 0))
}

export function endOfLastYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999))
}

/** Format: June 2026 */
export function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}
