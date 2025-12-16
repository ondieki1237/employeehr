import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { CompanyController } from "../controllers/companyController"
import { uploadLogo } from "../middleware/upload.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.get("/branding", CompanyController.getBranding)
router.post("/branding", roleMiddleware("company_admin", "hr"), uploadLogo.single("logo"), CompanyController.updateBranding)

export default router
