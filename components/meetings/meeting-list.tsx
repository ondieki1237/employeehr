'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  BarChart3,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'

interface Meeting {
  _id: string
  title: string
  description?: string
  scheduled_at: string
  duration_minutes: number
  meeting_type: 'video' | 'audio' | 'in-person'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  organizer_id: string
  attendees: Array<{
    user_id: string
    status: 'invited' | 'accepted' | 'declined'
    attended: boolean
    user?: any
  }>
  ai_processed: boolean
  ai_processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_summary?: string
  key_points?: string[]
}

interface MeetingListProps {
  meetings: Meeting[]
  currentUserId: string
  onCreateMeeting: (data: any) => Promise<void>
  onSelectMeeting: (meeting: Meeting) => void
  onDownloadReport: (meetingId: string) => Promise<void>
}

export function MeetingList({
  meetings,
  currentUserId,
  onCreateMeeting,
  onSelectMeeting,
  onDownloadReport,
}: MeetingListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_type: 'video' as const,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onCreateMeeting(formData)
      setFormData({
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_type: 'video',
      })
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating meeting:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-600">In Progress</Badge>
      case 'scheduled':
        return <Badge className="bg-yellow-600">Scheduled</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProcessingStatus = (meeting: Meeting) => {
    if (!meeting.ai_processed) {
      return null
    }

    switch (meeting.ai_processing_status) {
      case 'processing':
        return (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Loader className="w-3 h-3 animate-spin" />
            Processing
          </div>
        )
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            Report Ready
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            Processing Failed
          </div>
        )
      default:
        return null
    }
  }

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduled_at) > new Date() && m.status !== 'cancelled'
  )

  const completedMeetings = meetings.filter((m) => m.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Create Meeting Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meetings</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Upcoming Meetings */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Meetings
        </h3>

        {upcomingMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No upcoming meetings</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting._id} className="p-4 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold">{meeting.title}</h4>
                      {getStatusBadge(meeting.status)}
                    </div>
                    {meeting.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {meeting.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(
                          new Date(meeting.scheduled_at),
                          'MMM dd, yyyy HH:mm'
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.attendees.length} attendees
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => onSelectMeeting(meeting)}
                    className="ml-4"
                  >
                    {meeting.status === 'in-progress' ? 'Join' : 'Details'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Meetings with Reports */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Completed Meetings
        </h3>

        {completedMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No completed meetings</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {completedMeetings.map((meeting) => (
              <Card key={meeting._id} className="p-4 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold">{meeting.title}</h4>
                      {getProcessingStatus(meeting)}
                    </div>
                    {meeting.ai_summary && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {meeting.ai_summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(
                          new Date(meeting.scheduled_at),
                          'MMM dd, yyyy'
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {meeting.attendees.filter((a) => a.attended)
                          .length}/{meeting.attendees.length} attended
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => onSelectMeeting(meeting)}
                      variant="outline"
                      size="sm"
                    >
                      View Report
                    </Button>
                    {meeting.ai_processing_status === 'completed' && (
                      <Button
                        onClick={() => onDownloadReport(meeting._id)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a new meeting and invite attendees
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Meeting title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Meeting description (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time</label>
                <Input
                  required
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_at: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.meeting_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    meeting_type: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="in-person">In Person</option>
              </select>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI will automatically transcribe and analyze this meeting,
                creating tasks from action items.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Meeting'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
