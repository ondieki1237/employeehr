import "dotenv/config"
import mongoose from "mongoose"
import { promises as fs } from "fs"
import path from "path"
import { ClientComplaint } from "../models/ClientComplaint"
import { Task } from "../models/Task"
import { KPI } from "../models/KPI"
import AuditLog from "../models/AuditLog"

const MONGODB_URI = process.env.MONGODB_URI

async function exportOtherData() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment")
    process.exit(1)
  }

  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)

    // Fetch all data
    const [complaints, tasks, kpis, auditLogs] = await Promise.all([
      ClientComplaint.find().lean().exec(),
      Task.find().lean().exec(),
      KPI.find().lean().exec(),
      AuditLog.find().lean().exec(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      clientComplaints: complaints,
      tasks,
      kpis,
      auditLogs,
      summary: {
        complaints: complaints.length,
        tasks: tasks.length,
        kpis: kpis.length,
        auditLogs: auditLogs.length,
      },
    }

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    await fs.mkdir(migrationsDir, { recursive: true })

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
    const filename = `other-mongo-export-${timestamp}.json`
    const filepath = path.join(migrationsDir, filename)

    // Write export file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Export successful!`)
    console.log(`📊 Summary:`)
    console.log(`   - Complaints: ${exportData.summary.complaints}`)
    console.log(`   - Tasks: ${exportData.summary.tasks}`)
    console.log(`   - KPIs: ${exportData.summary.kpis}`)
    console.log(`   - Audit Logs: ${exportData.summary.auditLogs}`)
    console.log(`📄 Export file: ${filepath}`)

    process.exit(0)
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

exportOtherData()
