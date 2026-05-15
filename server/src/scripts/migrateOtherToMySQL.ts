import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import "dotenv/config"

async function migrateOtherToMySQL() {
  try {
    console.log("🚀 Starting Other Modules (Tasks/KPI/Complaints/AuditLog) migration...\n")

    // Step 1: Export from MongoDB
    console.log("📤 Step 1: Exporting data from MongoDB...")
    try {
      execSync("npx tsx src/scripts/exportOtherMongoData.ts", { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Export failed!")
      throw error
    }

    // Step 2: Find the latest export file
    console.log("\n📂 Step 2: Locating latest export file...")
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    const files = await fs.readdir(migrationsDir)
    const otherExports = files
      .filter((f) => f.startsWith("other-mongo-export-") && f.endsWith(".json"))
      .sort()
      .reverse()

    if (otherExports.length === 0) {
      throw new Error("No other export files found!")
    }

    const latestExport = path.join(migrationsDir, otherExports[0])
    console.log(`   ✅ Found: ${otherExports[0]}`)

    // Step 3: Import into MySQL
    console.log("\n📥 Step 3: Importing data into MySQL...")
    try {
      execSync(`npx tsx src/scripts/importOtherToMySQL.ts "${latestExport}"`, { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Import failed!")
      throw error
    }

    console.log("\n✅ Other modules migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Migration failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

migrateOtherToMySQL()
