import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"

const prisma = new PrismaClient()

interface JobsExportData {
  exportedAt: string
  jobs: any[]
  jobApplications: any[]
  summary: Record<string, number>
}

async function importJobsData(filePath: string) {
  try {
    console.log(`📂 Reading export file: ${filePath}`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const data: JobsExportData = JSON.parse(fileContent)

    console.log(`📊 Import Summary:`)
    console.log(`   - Jobs: ${data.summary.jobs}`)
    console.log(`   - Job Applications: ${data.summary.jobApplications}`)

    console.log(`\n⏳ Importing Jobs...`)
    let importedJobs = 0
    for (const job of data.jobs) {
      try {
        await prisma.job.upsert({
          where: { id: job._id },
          update: {
            orgId: job.org_id,
            companyName: job.company_name,
            positionIndex: job.position_index,
            title: job.title,
            department: job.department,
            location: job.location,
            employmentType: job.employment_type || "full-time",
            description: job.description,
            requirements: job.requirements ? JSON.stringify(job.requirements) : null,
            responsibilities: job.responsibilities ? JSON.stringify(job.responsibilities) : null,
            salaryRange: job.salary_range ? JSON.stringify(job.salary_range) : null,
            benefits: job.benefits ? JSON.stringify(job.benefits) : null,
            applicationDeadline: job.application_deadline ? new Date(job.application_deadline) : null,
            status: job.status || "draft",
            createdBy: job.created_by,
            shareLink: job.share_link,
            views: job.views || 0,
            applicationsCount: job.applications_count || 0,
          },
          create: {
            id: job._id,
            orgId: job.org_id,
            companyName: job.company_name,
            positionIndex: job.position_index,
            title: job.title,
            department: job.department,
            location: job.location,
            employmentType: job.employment_type || "full-time",
            description: job.description,
            requirements: job.requirements ? JSON.stringify(job.requirements) : null,
            responsibilities: job.responsibilities ? JSON.stringify(job.responsibilities) : null,
            salaryRange: job.salary_range ? JSON.stringify(job.salary_range) : null,
            benefits: job.benefits ? JSON.stringify(job.benefits) : null,
            applicationDeadline: job.application_deadline ? new Date(job.application_deadline) : null,
            status: job.status || "draft",
            createdBy: job.created_by,
            shareLink: job.share_link,
            views: job.views || 0,
            applicationsCount: job.applications_count || 0,
            createdAt: job.created_at ? new Date(job.created_at) : new Date(),
            updatedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
          },
        })
        importedJobs++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import job ${job._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedJobs}/${data.jobs.length} Jobs`)

    console.log(`\n⏳ Importing Job Applications...`)
    let importedApplications = 0
    for (const app of data.jobApplications) {
      try {
        await prisma.jobApplication.upsert({
          where: { id: app._id },
          update: {
            orgId: app.org_id,
            jobId: app.job_id,
            formId: app.form_id,
            applicantName: app.applicant_name,
            applicantEmail: app.applicant_email,
            applicantPhone: app.applicant_phone || null,
            deviceFingerprint: app.device_fingerprint || null,
            answers: app.answers ? JSON.stringify(app.answers) : null,
            uploadedFiles: app.uploaded_files ? JSON.stringify(app.uploaded_files) : null,
            resumeUrl: app.resume_url || null,
            coverLetter: app.cover_letter || null,
            status: app.status || "pending",
            source: app.source || null,
            rating: app.rating || null,
            notes: app.notes ? JSON.stringify(app.notes) : null,
            timeline: app.timeline ? JSON.stringify(app.timeline) : null,
            submittedAt: app.submitted_at ? new Date(app.submitted_at) : new Date(),
          },
          create: {
            id: app._id,
            orgId: app.org_id,
            jobId: app.job_id,
            formId: app.form_id,
            applicantName: app.applicant_name,
            applicantEmail: app.applicant_email,
            applicantPhone: app.applicant_phone || null,
            deviceFingerprint: app.device_fingerprint || null,
            answers: app.answers ? JSON.stringify(app.answers) : null,
            uploadedFiles: app.uploaded_files ? JSON.stringify(app.uploaded_files) : null,
            resumeUrl: app.resume_url || null,
            coverLetter: app.cover_letter || null,
            status: app.status || "pending",
            source: app.source || null,
            rating: app.rating || null,
            notes: app.notes ? JSON.stringify(app.notes) : null,
            timeline: app.timeline ? JSON.stringify(app.timeline) : null,
            submittedAt: app.submitted_at ? new Date(app.submitted_at) : new Date(),
            createdAt: app.created_at ? new Date(app.created_at) : new Date(),
            updatedAt: app.updated_at ? new Date(app.updated_at) : new Date(),
          },
        })
        importedApplications++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import job application ${app._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedApplications}/${data.jobApplications.length} Job Applications`)

    console.log(`\n✅ Jobs module data import complete!`)
    console.log(`\n📊 Final Import Count: Jobs: ${importedJobs}, Applications: ${importedApplications}`)

    process.exit(0)
  } catch (error) {
    console.error("Import failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get file path from command line arguments
async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error("Usage: npx tsx importJobsToMySQL.ts <path-to-export-file>")
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  await importJobsData(absolutePath)
}

main()
