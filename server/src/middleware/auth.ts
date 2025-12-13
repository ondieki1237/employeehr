import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "../config/auth"
import type { IJWTPayload } from "../types/interfaces"

export interface AuthenticatedRequest extends Request {
  user?: IJWTPayload
  org_id?: string
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    req.user = decoded
    req.org_id = decoded.org_id

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}

export const orgMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.org_id) {
    return res.status(401).json({
      success: false,
      message: "Organization ID not found",
    })
  }
  next()
}
