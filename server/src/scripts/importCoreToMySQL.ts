import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import prisma from "../lib/prisma"

const INPUT_FILE = process.argv[2]

const readJson = async () => {
  if (!INPUT_FILE) {
    throw new Error("Please provide a JSON export file path. Example: tsx src/scripts/importCoreToMySQL.ts data/migrations/core-mongo-export.json")
  }

  const absolutePath = path.resolve(process.cwd(), INPUT_FILE)
  const raw = await fs.readFile(absolutePath, "utf8")
  return JSON.parse(raw) as { companies?: any[]; users?: any[] }
}

const main = async () => {
  const payload = await readJson()
  const companies = payload.companies || []
  const users = payload.users || []

  let importedCompanies = 0
  let importedUsers = 0

  for (const company of companies) {
    const id = String(company._id || company.id)
    if (!id) continue

    await prisma.company.upsert({
      where: { id },
      create: {
        id,
        name: company.name,
        slug: company.slug,
        email: String(company.email || "").toLowerCase(),
        phone: company.phone || null,
        website: company.website || null,
        industry: company.industry,
        employeeCount: Number(company.employeeCount || 0),
        logo: company.logo || null,
        country: company.country || null,
        state: company.state || null,
        city: company.city || null,
        countryCode: company.countryCode || null,
        primaryColor: company.primaryColor || "#2563eb",
        secondaryColor: company.secondaryColor || "#059669",
        accentColor: company.accentColor || "#f59e0b",
        backgroundColor: company.backgroundColor || "#ffffff",
        textColor: company.textColor || "#1f2937",
        borderRadius: company.borderRadius || "0.5rem",
        fontFamily: company.fontFamily || "system-ui",
        buttonStyle: company.buttonStyle || "rounded",
        subscription: company.subscription || "starter",
        status: company.status || "active",
        isFrozen: Boolean(company.isFrozen),
        frozenReason: company.frozenReason || null,
        frozenAt: company.frozenAt ? new Date(company.frozenAt) : null,
        frozenBy: company.frozenBy || null,
        emailConfig: company.emailConfig || null,
        dispatchSmsSettings: company.dispatchSmsSettings || null,
        invoiceSettings: company.invoiceSettings || null,
        setupProgress: company.setupProgress || null,
        pageAccessSettings: company.pageAccessSettings || null,
        enabledPages: company.enabledPages || null,
      },
      update: {
        name: company.name,
        slug: company.slug,
        email: String(company.email || "").toLowerCase(),
        phone: company.phone || null,
        website: company.website || null,
        industry: company.industry,
        employeeCount: Number(company.employeeCount || 0),
        logo: company.logo || null,
        country: company.country || null,
        state: company.state || null,
        city: company.city || null,
        countryCode: company.countryCode || null,
        primaryColor: company.primaryColor || "#2563eb",
        secondaryColor: company.secondaryColor || "#059669",
        accentColor: company.accentColor || "#f59e0b",
        backgroundColor: company.backgroundColor || "#ffffff",
        textColor: company.textColor || "#1f2937",
        borderRadius: company.borderRadius || "0.5rem",
        fontFamily: company.fontFamily || "system-ui",
        buttonStyle: company.buttonStyle || "rounded",
        subscription: company.subscription || "starter",
        status: company.status || "active",
        isFrozen: Boolean(company.isFrozen),
        frozenReason: company.frozenReason || null,
        frozenAt: company.frozenAt ? new Date(company.frozenAt) : null,
        frozenBy: company.frozenBy || null,
        emailConfig: company.emailConfig || null,
        dispatchSmsSettings: company.dispatchSmsSettings || null,
        invoiceSettings: company.invoiceSettings || null,
        setupProgress: company.setupProgress || null,
        pageAccessSettings: company.pageAccessSettings || null,
        enabledPages: company.enabledPages || null,
      },
    })

    importedCompanies += 1
  }

  for (const user of users) {
    const id = String(user._id || user.id)
    if (!id) continue

    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        orgId: String(user.org_id || user.orgId),
        employeeId: user.employee_id || user.employeeId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        email: String(user.email || "").toLowerCase(),
        password: user.password,
        role: user.role || "employee",
        department: user.department || null,
        position: user.position || null,
        managerId: user.manager_id || user.managerId || null,
        avatar: user.avatar || null,
        signatureUrl: user.signatureUrl || null,
        phone: user.phone || null,
        dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining) : null,
        status: user.status || "active",
        salary: user.salary ?? null,
        bankDetails: user.bankDetails || null,
        promptStampOnPdf: Boolean(user.promptStampOnPdf),
      },
      update: {
        orgId: String(user.org_id || user.orgId),
        employeeId: user.employee_id || user.employeeId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        email: String(user.email || "").toLowerCase(),
        password: user.password,
        role: user.role || "employee",
        department: user.department || null,
        position: user.position || null,
        managerId: user.manager_id || user.managerId || null,
        avatar: user.avatar || null,
        signatureUrl: user.signatureUrl || null,
        phone: user.phone || null,
        dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining) : null,
        status: user.status || "active",
        salary: user.salary ?? null,
        bankDetails: user.bankDetails || null,
        promptStampOnPdf: Boolean(user.promptStampOnPdf),
      },
    })

    importedUsers += 1
  }

  console.log(`Imported ${importedCompanies} companies and ${importedUsers} users into MySQL`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error("Core MySQL import failed:", error)
  await prisma.$disconnect().catch(() => undefined)
  process.exitCode = 1
})
