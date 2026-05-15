import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import "dotenv/config"

async function migrateMeetingsToMySQL() {
  try {
    console.log("🚀 Starting Meetings module migration...\n")

    // Step 1: Export from MongoDB
    console.log("📤 Step 1: Exporting Meetings data from MongoDB...")
    try {
      execSync("npx tsx src/scripts/exportMeetingsMongoData.ts", { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Export failed!")
      throw error
    }

    // Step 2: Find the latest export file
    console.log("\n📂 Step 2: Locating latest export file...")
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    const files = await fs.readdir(migrationsDir)
    const meetingsExports = files
      .filter((f) => f.startsWith("meetings-mongo-export-") && f.endsWith(".json"))
      .sort()
      .reverse()

    if (meetingsExports.length === 0) {
      throw new Error("No meetings export files found!")
    }

    const latestExport = path.join(migrationsDir, meetingsExports[0])
    console.log(`   ✅ Found: ${meetingsExports[0]}`)

    // Step 3: Import into MySQL
    console.log("\n📥 Step 3: Importing Meetings data into MySQL...")
    try {
      execSync(`npx tsx src/scripts/importMeetingsToMySQL.ts "${latestExport}"`, { stdio: "inherit" })
    } catch (error) {
      console.error("❌ Import failed!")
      throw error
    }

    console.log("\n✅ Meetings module migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("\n❌ Migration failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

migrateMeetingsToMySQL()
