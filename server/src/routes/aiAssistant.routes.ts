import { Router } from "express"
import { authMiddleware } from "../middleware/auth"
import { AiAssistantController } from "../controllers/aiAssistantController"

const router = Router()

router.use(authMiddleware)

router.get("/status", AiAssistantController.getStatus)
router.post("/chat", AiAssistantController.chat)

export default router
