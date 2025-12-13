import { Router } from "express"
import { BadgeController } from "../controllers/badgeController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

router.use(authMiddleware)

router.get("/", BadgeController.getBadges)
router.get("/awards/all", BadgeController.getAllAwards)
router.get("/user/:userId?", BadgeController.getUserBadges)
router.post("/award", BadgeController.awardBadge)
router.get("/leaderboard", BadgeController.getLeaderboard)

export default router
