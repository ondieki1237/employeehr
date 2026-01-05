import { Router } from "express"
import { authMiddleware, orgMiddleware, roleMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { CompanyController } from "../controllers/companyController"
import { CompanyEmailController } from "../controllers/companyEmailController"
import { uploadLogo } from "../middleware/upload.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Branding
router.get("/branding", CompanyController.getBranding)
router.post("/branding", roleMiddleware("company_admin", "hr"), uploadLogo.single("logo"), CompanyController.updateBranding)

// Email Configuration (Admin only)
router.get("/email-config", roleMiddleware("company_admin", "hr"), CompanyEmailController.getEmailConfig)
router.post("/email-config", roleMiddleware("company_admin", "hr"), CompanyEmailController.updateEmailConfig)
router.post("/email-config/verify", roleMiddleware("company_admin", "hr"), CompanyEmailController.verifyEmailConfig)
router.post("/email-config/disable", roleMiddleware("company_admin", "hr"), CompanyEmailController.disableEmailConfig)

export default router
