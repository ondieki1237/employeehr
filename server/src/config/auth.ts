import jwt from "jsonwebtoken"
import type { IJWTPayload } from "../types/interfaces"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const JWT_EXPIRY = "7d"

export const generateToken = (payload: IJWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

export const verifyToken = (token: string): IJWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as IJWTPayload
  } catch (error) {
    // In development mode, allow decoding without verification if the user explicitly requested it
    if (process.env.NODE_ENV === "development") {
      console.warn("JWT Verification failed, falling back to decode (DEVELOPMENT ONLY):", error instanceof Error ? error.message : "Security mismatch")
      const decoded = jwt.decode(token) as IJWTPayload | null
      if (decoded && decoded.userId) {
        return decoded
      }
    }
    throw new Error("Invalid or expired token")
  }
}

export const decodeToken = (token: string): IJWTPayload | null => {
  try {
    return jwt.decode(token) as IJWTPayload
  } catch {
    return null
  }
}
