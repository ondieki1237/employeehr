import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AiAssistantService, type ChatTurn } from "../services/aiAssistant/aiAssistantService"
import { buildOrgContext } from "../services/aiAssistant/orgContext"

export class AiAssistantController {
  static async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      return res.status(200).json({
        success: true,
        data: {
          enabled: AiAssistantService.isConfigured(),
          model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
          provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "openai",
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to get assistant status" })
    }
  }

  static async chat(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!AiAssistantService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: "AI assistant is not configured. Set OPENROUTER_API_KEY in server environment.",
        })
      }

      const { message, history } = req.body || {}
      const ctx = buildOrgContext(req.user)
      const safeHistory: ChatTurn[] = Array.isArray(history)
        ? history
            .filter((turn: any) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
            .map((turn: any) => ({
              role: turn.role,
              content: String(turn.content).slice(0, 8000),
            }))
        : []

      const result = await AiAssistantService.chat(ctx, String(message || ""), safeHistory)

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error: any) {
      const status = error.message?.includes("not configured") ? 503 : 400
      return res.status(status).json({
        success: false,
        message: error.message || "Failed to process chat message",
      })
    }
  }
}
