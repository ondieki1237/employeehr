import "dotenv/config"
import mongoose from "mongoose"
import { promises as fs } from "fs"
import path from "path"
import Job from "../models/Job"
import JobApplication from "../models/JobApplication"

const MONGODB_URI = process.env.MONGODB_URI

async function exportJobsData() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment")
    process.exit(1)
  }

  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)

    // Fetch all jobs data
    const [jobs, applications] = await Promise.all([
      Job.find().lean().exec(),
      JobApplication.find().lean().exec(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      jobs,
      jobApplications: applications,
      summary: {
        jobs: jobs.length,
        jobApplications: applications.length,
      },
    }

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    await fs.mkdir(migrationsDir, { recursive: true })

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
    const filename = `jobs-mongo-export-${timestamp}.json`
    const filepath = path.join(migrationsDir, filename)

    // Write export file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Export successful!`)
    console.log(`📊 Summary:`)
    console.log(`   - Jobs: ${exportData.summary.jobs}`)
    console.log(`   - Job Applications: ${exportData.summary.jobApplications}`)
    console.log(`📄 Export file: ${filepath}`)

    process.exit(0)
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

exportJobsData()
