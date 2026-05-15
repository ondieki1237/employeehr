import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"

const prisma = new PrismaClient()

interface MeetingsExportData {
  exportedAt: string
  meetings: any[]
  summary: Record<string, number>
}

async function importMeetingsData(filePath: string) {
  try {
    console.log(`📂 Reading export file: ${filePath}`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const data: MeetingsExportData = JSON.parse(fileContent)

    console.log(`📊 Import Summary:`)
    console.log(`   - Meetings: ${data.summary.meetings}`)

    console.log(`\n⏳ Importing Meetings...`)
    let importedMeetings = 0
    for (const meeting of data.meetings) {
      try {
        // Need to get organizerId user since it's required
        const organizerId = meeting.organizer_id || meeting.organizerId || "unknown"
        
        await prisma.meeting.upsert({
          where: { id: meeting._id },
          update: {
            orgId: meeting.org_id,
            title: meeting.title,
            description: meeting.description || null,
            scheduledAt: new Date(meeting.scheduled_at),
            durationMinutes: meeting.duration_minutes || 60,
            meetingType: meeting.meeting_type || "video",
            meetingId: meeting.meeting_id,
            meetingLink: meeting.meeting_link || null,
            requirePassword: meeting.require_password || false,
            status: meeting.status || "scheduled",
            organizerId,
            actualStartTime: meeting.actual_start_time ? new Date(meeting.actual_start_time) : null,
            actualEndTime: meeting.actual_end_time ? new Date(meeting.actual_end_time) : null,
            agenda: meeting.agenda || null,
            transcript: meeting.transcript || null,
            aiSummary: meeting.ai_summary || null,
            keyPoints: meeting.key_points ? JSON.stringify(meeting.key_points) : null,
            recordingUrl: meeting.recording_url || null,
            aiProcessed: meeting.ai_processed || false,
            aiProcessingStatus: meeting.ai_processing_status || null,
            aiProcessingError: meeting.ai_processing_error || null,
          },
          create: {
            id: meeting._id,
            orgId: meeting.org_id,
            title: meeting.title,
            description: meeting.description || null,
            scheduledAt: new Date(meeting.scheduled_at),
            durationMinutes: meeting.duration_minutes || 60,
            meetingType: meeting.meeting_type || "video",
            meetingId: meeting.meeting_id,
            meetingLink: meeting.meeting_link || null,
            requirePassword: meeting.require_password || false,
            status: meeting.status || "scheduled",
            organizerId,
            actualStartTime: meeting.actual_start_time ? new Date(meeting.actual_start_time) : null,
            actualEndTime: meeting.actual_end_time ? new Date(meeting.actual_end_time) : null,
            agenda: meeting.agenda || null,
            transcript: meeting.transcript || null,
            aiSummary: meeting.ai_summary || null,
            keyPoints: meeting.key_points ? JSON.stringify(meeting.key_points) : null,
            recordingUrl: meeting.recording_url || null,
            aiProcessed: meeting.ai_processed || false,
            aiProcessingStatus: meeting.ai_processing_status || null,
            aiProcessingError: meeting.ai_processing_error || null,
            createdAt: meeting.created_at ? new Date(meeting.created_at) : new Date(),
            updatedAt: meeting.updated_at ? new Date(meeting.updated_at) : new Date(),
          },
        })
        importedMeetings++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import meeting ${meeting._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedMeetings}/${data.meetings.length} Meetings`)

    console.log(`\n✅ Meetings data import complete!`)
    console.log(`\n📊 Final Import Count: Meetings: ${importedMeetings}`)

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
    console.error("Usage: npx tsx importMeetingsToMySQL.ts <path-to-export-file>")
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  await importMeetingsData(absolutePath)
}

main()
