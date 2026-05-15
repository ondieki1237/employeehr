import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"

const prisma = new PrismaClient()

interface OtherExportData {
  exportedAt: string
  clientComplaints: any[]
  tasks: any[]
  kpis: any[]
  auditLogs: any[]
  summary: Record<string, number>
}

async function importOtherData(filePath: string) {
  try {
    console.log(`📂 Reading export file: ${filePath}`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const data: OtherExportData = JSON.parse(fileContent)

    console.log(`📊 Import Summary:`)
    console.log(`   - Complaints: ${data.summary.complaints}`)
    console.log(`   - Tasks: ${data.summary.tasks}`)
    console.log(`   - KPIs: ${data.summary.kpis}`)
    console.log(`   - Audit Logs: ${data.summary.auditLogs}`)

    // Skip Tasks - no Prisma model in deployed schema
    console.log(`\n⏳ Importing Tasks...`)
    console.log(`   ℹ️  Tasks table not deployed - skipping ${data.tasks.length} records`)

    // Skip Complaints - no Prisma model in deployed schema for now
    console.log(`\n⏳ Importing Complaints...`)
    console.log(`   ℹ️  Complaints table exists but will be handled separately`)

    // Import KPIs
    console.log(`\n⏳ Importing KPIs...`)
    let importedKPIs = 0
    for (const kpi of data.kpis) {
      try {
        await prisma.kPI.upsert({
          where: { id: kpi._id },
          update: {
            orgId: kpi.org_id,
            name: kpi.name,
            description: kpi.description || null,
            targetValue: kpi.target || 0,
            currentValue: 0, // Not tracked in export
            unit: kpi.unit || null,
            owner: null,
            period: "quarterly",  // Default period
            status: "on_track",    // Default status
          },
          create: {
            id: kpi._id,
            orgId: kpi.org_id,
            name: kpi.name,
            description: kpi.description || null,
            targetValue: kpi.target || 0,
            currentValue: 0,
            unit: kpi.unit || null,
            owner: null,
            period: "quarterly",
            status: "on_track",
            createdAt: kpi.createdAt ? new Date(kpi.createdAt) : new Date(),
            updatedAt: kpi.updatedAt ? new Date(kpi.updatedAt) : new Date(),
          },
        })
        importedKPIs++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import KPI ${kpi._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedKPIs}/${data.kpis.length} KPIs`)

    // Audit Logs would require timestamp-based TTL management
    console.log(`\n⏳ Importing Audit Logs...`)
    console.log(`   ℹ️  AuditLog table exists but large volume (${data.auditLogs.length} records) - skipping for now`)

    console.log(`\n✅ Other data import complete!`)
    console.log(`\n📊 Final Import Count: KPIs: ${importedKPIs}`)

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
    console.error("Usage: npx tsx importOtherToMySQL.ts <path-to-export-file>")
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  await importOtherData(absolutePath)
}

main()
