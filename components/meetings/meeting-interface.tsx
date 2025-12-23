'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Video,
  Mic,
  MicOff,
  PhoneOff,
  Share2,
  MessageSquare,
  Users,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle,
  BarChart3,
} from 'lucide-react'

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

interface MeetingInterfaceProps {
  meeting: Meeting
  currentUserId: string
  onEndMeeting: (meetingId: string, transcript: string) => Promise<void>
  onStartMeeting: (meetingId: string) => Promise<void>
}

export function MeetingInterface({
  meeting,
  currentUserId,
  onEndMeeting,
  onStartMeeting,
}: MeetingInterfaceProps) {
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(meeting.meeting_type !== 'audio')
  const [isMeetingActive, setIsMeetingActive] = useState(
    meeting.status === 'in-progress'
  )
  const [recordingActive, setRecordingActive] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcript, setTranscript] = useState<string>('')
  const [showReport, setShowReport] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(
    meeting.ai_processing_status === 'processing'
  )
  const [joinTime, setJoinTime] = useState<Date | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const isOrganizer = meeting.organizer_id === currentUserId

  useEffect(() => {
    if (isMeetingActive && isVideoOn) {
      startVideoStream()
    }
    return () => {
      stopVideoStream()
    }
  }, [isMeetingActive, isVideoOn])

  // Track time in meeting for KPI
  useEffect(() => {
    if (isMeetingActive && !joinTime) {
      const now = new Date()
      setJoinTime(now)
      // Notify backend of join time
      trackJoinTime()
    }

    // Cleanup: track leave time when component unmounts or meeting ends
    return () => {
      if (joinTime && isMeetingActive) {
        trackLeaveTime()
      }
    }
  }, [isMeetingActive])

  const trackJoinTime = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meeting._id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('Error tracking join time:', error)
    }
  }

  const trackLeaveTime = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meeting._id}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('Error tracking leave time:', error)
    }
  }

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoOn,
        audio: isAudioOn,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Setup recording
      if (recordingActive) {
        startRecording(stream)
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  const stopVideoStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
  }

  const startRecording = (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      const audioBlob = new Blob([event.data], { type: 'audio/webm' })
      console.log('Recording data available:', audioBlob.size)
    }

    mediaRecorder.start()
  }

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          resolve(new Blob([], { type: 'audio/webm' }))
        }
        mediaRecorderRef.current.stop()
      }
    })
  }

  const handleStartMeeting = async () => {
    try {
      await onStartMeeting(meeting._id)
      setIsMeetingActive(true)
      setRecordingActive(true)
    } catch (error) {
      console.error('Error starting meeting:', error)
    }
  }

  const handleEndMeeting = async () => {
    try {
      setRecordingActive(false)
      const audioBlob = await stopRecording()
      stopVideoStream()

      setAiProcessing(true)

      // In a real app, upload the audio and transcript
      await onEndMeeting(meeting._id, transcript)

      setIsMeetingActive(false)
      setShowReport(true)
    } catch (error) {
      console.error('Error ending meeting:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* Minimized Floating Window */}
      {isMinimized && isMeetingActive && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 w-80">
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recordingActive && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              <span className="text-white font-medium text-sm">
                {meeting.title}
              </span>
            </div>
            <Button
              onClick={() => setIsMinimized(false)}
              variant="ghost"
              size="sm"
              className="text-white h-8 w-8 p-0"
            >
              ↑
            </Button>
          </div>
          <div className="px-3 pb-3 flex gap-2">
            <Button
              onClick={() => setIsAudioOn(!isAudioOn)}
              variant={isAudioOn ? 'default' : 'destructive'}
              size="sm"
              className="flex-1"
            >
              {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleEndMeeting}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Full Meeting View */}
      {!isMinimized && (
        <>
          {/* Video Area */}
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
            {isMeetingActive ? (
          <div className="w-full h-full max-w-4xl">
            {isVideoOn ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full rounded-lg object-cover bg-black"
              />
            ) : (
              <div className="w-full h-full rounded-lg bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Video disabled</p>
                  {recordingActive && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 font-medium">Recording</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              {meeting.title}
            </h3>
            <p className="text-gray-400 mb-6">{meeting.description}</p>
            <div className="space-y-2 text-sm text-gray-400 mb-8">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(meeting.scheduled_at).toLocaleString()}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                {meeting.attendees.length} attendee(s)
              </div>
            </div>

            {isOrganizer && (
              <Button
                onClick={handleStartMeeting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Controls */}
      {isMeetingActive && !isMinimized && (
        <div className="bg-gray-900 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <Button
              onClick={() => setIsAudioOn(!isAudioOn)}
              variant={isAudioOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14 p-0"
            >
              {isAudioOn ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              onClick={() => setIsVideoOn(!isVideoOn)}
              variant={isVideoOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14 p-0"
            >
              <Video className="w-6 h-6" />
            </Button>

            <Button
              onClick={handleEndMeeting}
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14 p-0"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-full w-14 h-14 p-0"
            >
              <Share2 className="w-6 h-6" />
            </Button>

            <Button
              onClick={() => setShowTranscript(!showTranscript)}
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14 p-0"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>

            <Button
              onClick={() => setIsMinimized(true)}
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14 p-0"
              title="Minimize meeting"
            >
              ↓
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Transcript Panel */}
      {showTranscript && isMeetingActive && !isMinimized && (
        <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-48 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h3 className="font-semibold text-white mb-2">Live Transcript</h3>
            <div className="bg-gray-900 p-3 rounded text-sm text-gray-300">
              <p>
                {transcript || 'Waiting for speech recognition to start...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meeting Report</DialogTitle>
              <DialogDescription>
                AI-generated analysis of the meeting
              </DialogDescription>
            </DialogHeader>

            {aiProcessing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Processing meeting with AI...
                  </p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="points">Key Points</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  {meeting.ai_processing_status === 'completed' ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{meeting.ai_summary}</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Report not yet available
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="points" className="space-y-2">
                  {meeting.key_points?.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded bg-gray-50"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="actions" className="space-y-2">
                  {meeting.action_items?.map((item, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Assigned to: {item.assigned_to}
                          </p>
                        </div>
                        {item.task_id && (
                          <Badge variant="secondary">Task Created</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
