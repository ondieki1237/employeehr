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
