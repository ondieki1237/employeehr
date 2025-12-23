'use client'

import { useState, useEffect } from 'react'
import { MeetingList } from '@/components/meetings/meeting-list'
import { MeetingInterface } from '@/components/meetings/meeting-interface'
import { MeetingReport } from '@/components/meetings/meeting-report'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface Meeting {
  _id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  meeting_type: 'video' | 'audio' | 'in-person'
  meeting_link?: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  organizer_id: string
  attendees: Array<{
    user_id: string
    status: 'invited' | 'accepted' | 'declined' | 'tentative'
    attended: boolean
    user?: any
  }>
  ai_processed: boolean
  ai_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_summary?: string
  key_points?: string[]
  action_items?: any[]
  transcript?: string
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [view, setView] = useState<'list' | 'meeting' | 'report'>('list')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get current user from local storage or context
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUserId(user._id || user.userId)
    }

    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setMeetings(data.data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createMeeting = async (meetingData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meetingData),
      })
      const data = await response.json()
      if (data.success) {
        await fetchMeetings()
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
      throw error
    }
  }

  const startMeeting = async (meetingId: string) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/start`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await fetchMeetings()
    } catch (error) {
      console.error('Error starting meeting:', error)
      throw error
    }
  }

  const endMeeting = async (meetingId: string, transcript: string) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript }),
      })
      await fetchMeetings()
    } catch (error) {
      console.error('Error ending meeting:', error)
      throw error
    }
  }

  const downloadReport = async (meetingId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/report`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (data.success) {
        // Create downloadable HTML file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting-report-${meetingId}.json`
        a.click()
      }
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    if (meeting.status === 'completed' && meeting.ai_processed) {
      setView('report')
    } else if (meeting.status === 'in-progress') {
      setView('meeting')
    } else {
      setView('meeting')
    }
  }

  const handleBack = () => {
    setView('list')
    setSelectedMeeting(null)
    fetchMeetings()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meetings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'list' ? (
        <div className="container mx-auto p-6">
          <MeetingList
            meetings={meetings}
            currentUserId={currentUserId}
            onCreateMeeting={createMeeting}
            onSelectMeeting={handleSelectMeeting}
            onDownloadReport={downloadReport}
          />
        </div>
      ) : view === 'meeting' && selectedMeeting ? (
        <div className="relative">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="absolute top-4 left-4 z-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <MeetingInterface
            meeting={selectedMeeting}
            currentUserId={currentUserId}
            onStartMeeting={startMeeting}
            onEndMeeting={endMeeting}
          />
        </div>
      ) : view === 'report' && selectedMeeting ? (
        <div className="container mx-auto p-6">
          <Button onClick={handleBack} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Meetings
          </Button>
          <MeetingReport
            title={selectedMeeting.title}
            summary={selectedMeeting.ai_summary}
            keyPoints={selectedMeeting.key_points}
            actionItems={selectedMeeting.action_items}
            transcript={selectedMeeting.transcript}
            processingStatus={selectedMeeting.ai_processing_status}
          />
        </div>
      ) : null}
    </div>
  )
}
