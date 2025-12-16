import { Router } from "express"
import { PayrollController } from "../controllers/PayrollController"
import { authMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router: Router = Router()

router.use(authMiddleware, tenantIsolation)

router.get("/my-payslips", PayrollController.getMyPayslips)

// Admin/HR routes
router.post("/generate", roleMiddleware("company_admin", "hr"), PayrollController.generate)
router.get("/all", roleMiddleware("company_admin", "hr"), PayrollController.getAll)

export default router
