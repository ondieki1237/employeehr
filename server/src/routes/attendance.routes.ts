import { Router } from "express"
import { AttendanceController } from "../controllers/attendanceController"
import { authMiddleware, roleMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

// Get attendance records
router.get("/:userId", AttendanceController.getAttendanceRecords)

// Mark attendance (Manager or Admin)
router.post("/", roleMiddleware("manager", "company_admin", "hr"), AttendanceController.markAttendance)

export default router
