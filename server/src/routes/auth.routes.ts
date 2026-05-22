import { Router } from "express"
import { AuthController } from "../controllers/authController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

// Public routes
router.post("/register-company", AuthController.registerCompany)
router.post("/login", AuthController.login)
router.post("/company-login", AuthController.companyLogin) // Login for employees via company slug
router.post("/employee-login", AuthController.employeeIdLogin) // Login with employee ID
router.get("/validate-company/:slug", AuthController.validateCompany) // Validate company exists

// Password reset flow
router.post("/forgot-password", AuthController.forgotPassword)
router.post("/verify-otp", AuthController.verifyOtp)
router.post("/verify-login-otp", AuthController.verifyLoginOtp)
router.post("/resend-login-otp", AuthController.resendLoginOtp)
router.post("/reset-password", AuthController.resetPassword)

// Protected routes
router.post("/change-password", authMiddleware, AuthController.changePassword)

export default router
