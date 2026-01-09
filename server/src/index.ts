import "dotenv/config" // Must be the first import
import express from "express"
import { createServer } from "http"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import path from "path"
import { fileURLToPath } from "url"
import { connectDB } from "./config/database"
import { errorHandler } from "./middleware/errorHandler"
import { sanitizeInput } from "./middleware/sanitization.middleware"
import { apiLimiter } from "./middleware/rateLimit.middleware"
import { WebRTCSignalingService } from "./services/webrtcSignaling"

// Routes
import authRoutes from "./routes/auth.routes"
import userRoutes from "./routes/user.routes"
import performanceRoutes from "./routes/performance.routes"
import kpiRoutes from "./routes/kpi.routes"
import pdpRoutes from "./routes/pdp.routes"
import feedbackRoutes from "./routes/feedback.routes"
import attendanceRoutes from "./routes/attendance.routes"
import awardRoutes from "./routes/award.routes"
import taskRoutes from "./routes/task.routes"
import messageRoutes from "./routes/message.routes"
import bookingRoutes from "./routes/booking.routes"
import suggestionRoutes from "./routes/suggestion.routes"
import badgeRoutes from "./routes/badge.routes"
import pollRoutes from "./routes/poll.routes"
import contractRoutes from "./routes/contract.routes"
import alertRoutes from "./routes/alert.routes"
import jobRoutes from "./routes/job.routes"
import applicationFormRoutes from "./routes/applicationForm.routes"
import jobApplicationRoutes from "./routes/jobApplication.routes"
import jobAnalyticsRoutes from "./routes/jobAnalytics.routes"
import communicationRoutes from "./routes/communication.routes"
import invitationRoutes from "./routes/invitation.routes"
import reportRoutes from "./routes/report.routes"
import companyRoutes from "./routes/company.routes"
import holidayRoutes from "./routes/holiday.routes"
import leaveRoutes from "./routes/leave.routes"
import payrollRoutes from "./routes/payroll.routes"
import meetingRoutes from "./routes/meeting.routes"
import setupRoutes from "./routes/setup.routes"
import anonymousFeedbackRoutes from "./routes/anonymousFeedback.routes"
import feedbackSurveyRoutes from "./routes/feedbackSurvey.routes"
import { JobController } from "./controllers/jobController"
import { JobApplicationController } from "./controllers/jobApplicationController"
import { ApplicationFormController } from "./controllers/applicationFormController"
import { MeetingController } from "./controllers/meetingController"

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 5010

// Initialize WebRTC signaling service
const webrtcService = new WebRTCSignalingService(server)

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(helmet()) // Security headers
app.use(morgan("combined")) // Request logging

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
}, express.static(path.join(__dirname, '../uploads')))

// Core middleware
// Allow local dev and production frontend origins
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://employeehr.vercel.app",
        "https://hpapi.codewithseth.co.ke",
        "https://hrapi.codewithseth.co.ke",
        "https://hr.codewithseth.co.ke",
        process.env.FRONTEND_URL,
      ].filter(Boolean)

      // Allow non-browser requests (no origin)
      if (!origin) return callback(null, true)

      if (allowed.some((o) => origin === o)) {
        return callback(null, true)
      }
      return callback(null, true) // fallback: allow others if needed
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use(sanitizeInput)
app.use(apiLimiter)

// Connect to database
connectDB()

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    version: "1.1.0",
  })
})

// Public endpoints (no auth) — mounted early
app.get("/api/jobs/public/:companyName/:positionIndex", JobController.getPublicJob)
app.get("/api/application-forms/job/:jobId", ApplicationFormController.getFormByJobId)
app.post("/api/job-applications/submit", JobApplicationController.submitApplication)
app.get("/api/meetings/by-meeting-id/:meetingId", MeetingController.getMeetingByMeetingIdPublic)

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/performance", performanceRoutes)
app.use("/api/kpis", kpiRoutes)
app.use("/api/pdps", pdpRoutes)
app.use("/api/feedback", feedbackRoutes)
app.use("/api/attendance", attendanceRoutes)
app.use("/api/awards", awardRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/suggestions", suggestionRoutes)
app.use("/api/badges", badgeRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/contracts", contractRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/application-forms", applicationFormRoutes)
app.use("/api/job-applications", jobApplicationRoutes)
app.use("/api/job-analytics", jobAnalyticsRoutes)
app.use("/api/communications", communicationRoutes)
app.use("/api/invitations", invitationRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/company", companyRoutes)
app.use("/api/holidays", holidayRoutes)
app.use("/api/leave", leaveRoutes)
app.use("/api/payroll", payrollRoutes)
app.use("/api/meetings", meetingRoutes)
app.use("/api/setup", setupRoutes)
app.use("/api/feedback-360", anonymousFeedbackRoutes)
app.use("/api/feedback-surveys", feedbackSurveyRoutes)
app.use("/api", bookingRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

// Error handler (must be last)
app.use(errorHandler)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`WebRTC signaling service initialized`)
})
