import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import "dotenv/config"

async function migrateJobsToMySQL() {
  try {
    console.log("🚀 Starting Jobs & Recruitment module migration...\n")

    // Step 1: Export from MongoDB
    console.log("📤 Step 1: Exporting Jobs data from MongoDB...")
    try {
      execSync("npx tsx src/scripts/exportJobsMongoData.ts", { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Export failed!")
      throw error
    }

    // Step 2: Find the latest export file
    console.log("\n📂 Step 2: Locating latest export file...")
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    const files = await fs.readdir(migrationsDir)
    const jobsExports = files
      .filter((f) => f.startsWith("jobs-mongo-export-") && f.endsWith(".json"))
      .sort()
      .reverse()

    if (jobsExports.length === 0) {
      throw new Error("No jobs export files found!")
    }

    const latestExport = path.join(migrationsDir, jobsExports[0])
    console.log(`   ✅ Found: ${jobsExports[0]}`)

    // Step 3: Import into MySQL
    console.log("\n📥 Step 3: Importing Jobs data into MySQL...")
    try {
      execSync(`npx tsx src/scripts/importJobsToMySQL.ts "${latestExport}"`, { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Import failed!")
      throw error
    }

    console.log("\n✅ Jobs module migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Migration failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

migrateJobsToMySQL()
