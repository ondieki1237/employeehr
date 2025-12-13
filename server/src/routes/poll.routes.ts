import { Router } from "express"
import { PollController } from "../controllers/pollController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

router.use(authMiddleware)

router.get("/", PollController.getPolls)
router.post("/", PollController.createPoll)
router.post("/:pollId/vote", PollController.vote)
router.get("/:pollId/results", PollController.getResults)
router.patch("/:pollId/close", PollController.closePoll)
router.delete("/:pollId", PollController.deletePoll)

export default router
