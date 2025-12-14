import "dotenv/config" // Must be the first import
import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { connectDB } from "./config/database"
import { errorHandler } from "./middleware/errorHandler"
import { sanitizeInput } from "./middleware/sanitization.middleware"
import { apiLimiter } from "./middleware/rateLimit.middleware"

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
import { JobController } from "./controllers/jobController"
import { JobApplicationController } from "./controllers/jobApplicationController"
import { ApplicationFormController } from "./controllers/applicationFormController"

const app = express()
const PORT = process.env.PORT || 5010

app.use(helmet()) // Security headers
app.use(morgan("combined")) // Request logging

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
app.use("/api", bookingRoutes)
app.use("/api/suggestions", suggestionRoutes)
app.use("/api/badges", badgeRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/contracts", contractRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/jobs", jobRoutes)
app.use("/api/application-forms", applicationFormRoutes)
app.use("/api/job-applications", jobApplicationRoutes)
app.use("/api/job-analytics", jobAnalyticsRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

// Error handler (must be last)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
