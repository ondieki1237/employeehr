import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"

const prisma = new PrismaClient()

interface LeaveExportData {
  exportedAt: string
  leaveRequests: any[]
  leaveBalances: any[]
  holidays: any[]
  summary: Record<string, number>
}

async function importLeaveData(filePath: string) {
  try {
    console.log(`📂 Reading export file: ${filePath}`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const data: LeaveExportData = JSON.parse(fileContent)

    console.log(`📊 Import Summary:`)
    console.log(`   - Leave Requests: ${data.summary.leaveRequests}`)
    console.log(`   - Leave Balances: ${data.summary.leaveBalances}`)
    console.log(`   - Holidays: ${data.summary.holidays}`)

    console.log(`\n⏳ Importing Leave Requests...`)
    let importedRequests = 0
    for (const request of data.leaveRequests) {
      try {
        await prisma.leaveRequest.upsert({
          where: { id: request._id },
          update: {
            orgId: request.org_id,
            userId: request.user_id,
            type: request.type,
            startDate: new Date(request.startDate),
            endDate: new Date(request.endDate),
            reason: request.reason,
            status: request.status || "pending",
            managerId: request.manager_id || null,
            managerComment: request.manager_comment || null,
          },
          create: {
            id: request._id,
            orgId: request.org_id,
            userId: request.user_id,
            type: request.type,
            startDate: new Date(request.startDate),
            endDate: new Date(request.endDate),
            reason: request.reason,
            status: request.status || "pending",
            managerId: request.manager_id || null,
            managerComment: request.manager_comment || null,
            createdAt: request.createdAt ? new Date(request.createdAt) : new Date(),
            updatedAt: request.updatedAt ? new Date(request.updatedAt) : new Date(),
          },
        })
        importedRequests++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import leave request ${request._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedRequests}/${data.leaveRequests.length} Leave Requests`)

    console.log(`\n⏳ Importing Leave Balances...`)
    let importedBalances = 0
    for (const balance of data.leaveBalances) {
      try {
        await prisma.leaveBalance.upsert({
          where: { id: balance._id },
          update: {
            orgId: balance.org_id,
            userId: balance.user_id,
            year: balance.year,
            annualTotal: balance.annual_total,
            annualUsed: balance.annual_used,
            sickTotal: balance.sick_total,
            sickUsed: balance.sick_used,
            maternityTotal: balance.maternity_total,
            maternityUsed: balance.maternity_used,
            paternityTotal: balance.paternity_total,
            paternityUsed: balance.paternity_used,
            unpaidUsed: balance.unpaid_used,
          },
          create: {
            id: balance._id,
            orgId: balance.org_id,
            userId: balance.user_id,
            year: balance.year,
            annualTotal: balance.annual_total,
            annualUsed: balance.annual_used,
            sickTotal: balance.sick_total,
            sickUsed: balance.sick_used,
            maternityTotal: balance.maternity_total,
            maternityUsed: balance.maternity_used,
            paternityTotal: balance.paternity_total,
            paternityUsed: balance.paternity_used,
            unpaidUsed: balance.unpaid_used,
            createdAt: balance.createdAt ? new Date(balance.createdAt) : new Date(),
            updatedAt: balance.updatedAt ? new Date(balance.updatedAt) : new Date(),
          },
        })
        importedBalances++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import leave balance ${balance._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedBalances}/${data.leaveBalances.length} Leave Balances`)

    console.log(`\n⏳ Importing Holidays...`)
    let importedHolidays = 0
    for (const holiday of data.holidays) {
      try {
        await prisma.holiday.upsert({
          where: { id: holiday._id },
          update: {
            orgId: holiday.org_id,
            name: holiday.name,
            date: new Date(holiday.date),
            countryCode: holiday.countryCode,
            type: holiday.type || "public",
            year: holiday.year,
          },
          create: {
            id: holiday._id,
            orgId: holiday.org_id,
            name: holiday.name,
            date: new Date(holiday.date),
            countryCode: holiday.countryCode,
            type: holiday.type || "public",
            year: holiday.year,
            createdAt: holiday.createdAt ? new Date(holiday.createdAt) : new Date(),
            updatedAt: holiday.updatedAt ? new Date(holiday.updatedAt) : new Date(),
          },
        })
        importedHolidays++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import holiday ${holiday._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedHolidays}/${data.holidays.length} Holidays`)

    console.log(`\n✅ Leave module data import complete!`)
    console.log(`\n📊 Final Import Count: Requests: ${importedRequests}, Balances: ${importedBalances}, Holidays: ${importedHolidays}`)

    process.exit(0)
  } catch (error) {
    console.error("Import failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get file path from command line arguments or find latest
async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error("Usage: npx tsx importLeaveToMySQL.ts <path-to-export-file>")
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  await importLeaveData(absolutePath)
}

main()
