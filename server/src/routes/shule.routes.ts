import { Router } from "express"
import { ShuleController } from "../controllers/shuleController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"

const router = Router()

// Public
router.post("/register", ShuleController.registerSchool)
router.post("/login", ShuleController.login)

// Protected: create users (only managers/company_admin)
router.post("/users", authMiddleware, roleMiddleware("company_admin", "manager"), ShuleController.createSchoolUser)

// Me
router.get("/me", authMiddleware, ShuleController.me)

export default router
