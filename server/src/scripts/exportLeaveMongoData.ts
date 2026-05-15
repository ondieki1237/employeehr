import "dotenv/config"
import mongoose from "mongoose"
import { promises as fs } from "fs"
import path from "path"
import { LeaveRequest } from "../models/LeaveRequest"
import { LeaveBalance } from "../models/LeaveBalance"
import { Holiday } from "../models/Holiday"

const MONGODB_URI = process.env.MONGODB_URI

async function exportLeaveData() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment")
    process.exit(1)
  }

  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)

    // Fetch all leave data
    const [leaveRequests, leaveBalances, holidays] = await Promise.all([
      LeaveRequest.find().lean().exec(),
      LeaveBalance.find().lean().exec(),
      Holiday.find().lean().exec(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      leaveRequests,
      leaveBalances,
      holidays,
      summary: {
        leaveRequests: leaveRequests.length,
        leaveBalances: leaveBalances.length,
        holidays: holidays.length,
      },
    }

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    await fs.mkdir(migrationsDir, { recursive: true })

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
    const filename = `leave-mongo-export-${timestamp}.json`
    const filepath = path.join(migrationsDir, filename)

    // Write export file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Export successful!`)
    console.log(`📊 Summary:`)
    console.log(`   - Leave Requests: ${exportData.summary.leaveRequests}`)
    console.log(`   - Leave Balances: ${exportData.summary.leaveBalances}`)
    console.log(`   - Holidays: ${exportData.summary.holidays}`)
    console.log(`📄 Export file: ${filepath}`)

    process.exit(0)
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

exportLeaveData()
