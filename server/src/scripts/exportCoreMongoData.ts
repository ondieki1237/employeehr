import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import mongoose from "mongoose"
import { Company } from "../models/Company"
import { User } from "../models/User"

const OUTPUT_DIR = path.resolve(process.cwd(), "data", "migrations")

const main = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/elevate"

  await mongoose.connect(mongoUri)

  const companies = await Company.find().lean()
  const users = await User.find().lean()

  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const filePath = path.join(OUTPUT_DIR, `core-mongo-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        companies,
        users,
      },
      null,
      2,
    ),
    "utf8",
  )

  console.log(`Exported ${companies.length} companies and ${users.length} users to ${filePath}`)
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error("Core Mongo export failed:", error)
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  process.exitCode = 1
})
