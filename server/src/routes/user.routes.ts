import { Router } from "express"
import { UserController } from "../controllers/userController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

// All user routes require authentication
router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get all users in organization
router.get("/", UserController.getAllUsers)

// Get user by ID
router.get("/:userId", UserController.getUserById)

// Update user (Admin or self)
router.put("/:userId", UserController.updateUser)

// Get team members for manager
router.get("/team/:managerId", UserController.getTeamMembers)

// Get colleagues (users in same organization)
router.get("/colleagues/list", UserController.getColleagues)

// Create employee (Admin only)
router.post("/", roleMiddleware("company_admin", "hr"), UserController.createEmployee)

export default router
