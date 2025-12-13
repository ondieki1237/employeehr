import { Router } from "express"
import { BookingController } from "../controllers/bookingController"
import { authMiddleware } from "../middleware/auth"

const router = Router()

router.use(authMiddleware)

router.get("/bookings", BookingController.getBookings)
router.get("/resources", BookingController.getResources)
router.post("/bookings", BookingController.createBooking)
router.patch("/bookings/:bookingId/status", BookingController.updateBookingStatus)
router.put("/bookings/:bookingId/approve", BookingController.approveBooking)
router.put("/bookings/:bookingId/reject", BookingController.rejectBooking)
router.delete("/bookings/:bookingId", BookingController.deleteBooking)

export default router
