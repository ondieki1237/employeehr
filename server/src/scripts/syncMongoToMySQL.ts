/**
 * Migration script to sync existing MongoDB data to MySQL
 * Run: node dist/scripts/syncMongoToMySQL.js
 * Or: ts-node server/src/scripts/syncMongoToMySQL.ts
 */

import mongoose from "mongoose"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { SecondaryStorageService } from "../services/secondaryStorageService"
import dotenv from "dotenv"
import { fileURLToPath } from 'url'

dotenv.config()

async function migrateUsers() {
  console.log("🔄 Starting user migration...")
  try {
    const users = await User.find().lean()
    let migratedCount = 0

    for (const user of users) {
      try {
        await SecondaryStorageService.syncUserToMySQL(user as any, "CREATE")
        migratedCount++
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error)
      }
    }

    console.log(`✅ Migrated ${migratedCount}/${users.length} users`)
    return migratedCount
  } catch (error) {
    console.error("❌ User migration failed:", error)
    throw error
  }
}

async function migrateCompanies() {
  console.log("🔄 Starting company migration...")
  try {
    const companies = await Company.find().lean()
    let migratedCount = 0

    for (const company of companies) {
      try {
        await SecondaryStorageService.syncCompanyToMySQL(company as any, "CREATE")
        migratedCount++
      } catch (error) {
        console.error(`❌ Failed to migrate company ${company.name}:`, error)
      }
    }

    console.log(`✅ Migrated ${migratedCount}/${companies.length} companies`)
    return migratedCount
  } catch (error) {
    console.error("❌ Company migration failed:", error)
    throw error
  }
}

async function runMigration() {
  try {
    console.log("📊 Starting MongoDB → MySQL migration...")
    console.log(`MongoDB URL: ${process.env.MONGODB_URI?.split("@")[1]}...`)
    console.log(`MySQL URL: ${process.env.MYSQL_DATABASE_URL?.split("@")[1]}...`)

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!)
    console.log("✅ Connected to MongoDB")

    // Run migrations
    const userCount = await migrateUsers()
    const companyCount = await migrateCompanies()

    console.log("\n✅ Migration completed successfully!")
    console.log(`   - Users: ${userCount}`)
    console.log(`   - Companies: ${companyCount}`)
  } catch (error) {
    console.error("❌ Migration error:", error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    await SecondaryStorageService.disconnect()
    console.log("🔌 Connections closed")
  }
}

// Run if executed directly (ESM-safe)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void runMigration()
}

export { runMigration, migrateUsers, migrateCompanies }
