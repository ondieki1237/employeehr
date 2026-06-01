import type { IJWTPayload } from "../../types/interfaces"

export type AssistantOrgContext = {
  orgId: string
  userId: string
  role: string
  userName: string
}

export function buildOrgContext(user: IJWTPayload): AssistantOrgContext {
  return {
    orgId: String(user.org_id || ""),
    userId: String(user.userId || ""),
    role: String(user.role || "employee"),
    userName: String(user.email || "User").split("@")[0] || "User",
  }
}

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
