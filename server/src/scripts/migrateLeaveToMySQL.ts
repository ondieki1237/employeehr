import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import "dotenv/config"

async function migrateLeaveToMySQL() {
  try {
    console.log("🚀 Starting Leave Management module migration...\n")

    // Step 1: Export from MongoDB
    console.log("📤 Step 1: Exporting Leave data from MongoDB...")
    try {
      execSync("npx tsx src/scripts/exportLeaveMongoData.ts", { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Export failed!")
      throw error
    }

    // Step 2: Find the latest export file
    console.log("\n📂 Step 2: Locating latest export file...")
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    const files = await fs.readdir(migrationsDir)
    const leaveExports = files
      .filter((f) => f.startsWith("leave-mongo-export-") && f.endsWith(".json"))
      .sort()
      .reverse()

    if (leaveExports.length === 0) {
      throw new Error("No leave export files found!")
    }

    const latestExport = path.join(migrationsDir, leaveExports[0])
    console.log(`   ✅ Found: ${leaveExports[0]}`)

    // Step 3: Import into MySQL
    console.log("\n📥 Step 3: Importing Leave data into MySQL...")
    try {
      execSync(`npx tsx src/scripts/importLeaveToMySQL.ts "${latestExport}"`, { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Import failed!")
      throw error
    }

    console.log("\n✅ Leave module migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Migration failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

migrateLeaveToMySQL()
