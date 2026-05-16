/**
 * Deployment migration script - runs during build/deploy
 * This ensures Prisma database is always up-to-date
 */

import { exec } from "child_process"
import { promisify } from "util"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const execAsync = promisify(exec)

async function runMigrations() {
  try {
    const environment = process.env.NODE_ENV || "development"
    console.log(`🔄 Running Prisma migrations for ${environment}...`)
    console.log(`📍 Database: ${process.env.MYSQL_DATABASE_URL?.split("@")[1] || "unknown"}`)

    // Option 1: Use prisma migrate deploy (recommended for production)
    if (environment === "production") {
      console.log("📦 Using 'prisma migrate deploy' for production...")
      const { stdout, stderr } = await execAsync("npx prisma migrate deploy")
      console.log("✅ Output:", stdout)
      if (stderr) console.warn("⚠️ Warnings:", stderr)
    } else {
      // Option 2: Use prisma db push (for development)
      console.log("📦 Using 'prisma db push' for development...")
      const { stdout, stderr } = await execAsync("npx prisma db push --skip-generate")
      console.log("✅ Output:", stdout)
      if (stderr) console.warn("⚠️ Warnings:", stderr)
    }

    console.log("✅ Prisma migrations completed successfully!")
    return true
  } catch (error) {
    console.error("❌ Prisma migration failed:")
    if (error instanceof Error) {
      console.error("Error:", error.message)
      console.error("Stack:", error.stack)
    }
    // In production, fail the deployment if migrations fail
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    }
    return false
  }
}

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))
  : false

// Run if executed directly
if (isMainModule) {
  runMigrations().then((success) => {
    process.exit(success ? 0 : 1)
  })
}

export { runMigrations }
