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
import { MeetingReport } from '@/components/meetings/meeting-report'
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
  const [reportState, setReportState] = useState<{
    summary: string
    keyPoints: string[]
    actionItems: any[]
    transcript: string
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
    processingError: string
    sentiment: 'positive' | 'neutral' | 'negative'
    attendees?: any[]
    scheduled_start?: string
    actual_start_time?: string
    actual_end_time?: string
  }>(() => {
    const status = meeting.ai_processing_status
    if (status === 'failed') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'failed',
        processingError: '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    if (meeting.ai_processed || status === 'completed') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'completed',
        processingError: '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    if (status === 'processing') {
      return {
        summary: meeting.ai_summary || '',
        keyPoints: meeting.key_points || [],
        actionItems: meeting.action_items || [],
        transcript: meeting.transcript || '',
        processingStatus: 'processing',
        processingError: '',
        sentiment: 'neutral',
        attendees: meeting.attendees || [],
        scheduled_start: meeting.scheduled_at,
        actual_start_time: meeting.actual_start_time,
        actual_end_time: meeting.actual_end_time,
      }
    }

    return {
      summary: meeting.ai_summary || '',
      keyPoints: meeting.key_points || [],
      actionItems: meeting.action_items || [],
      transcript: meeting.transcript || '',
      processingStatus: 'pending',
      processingError: '',
      sentiment: 'neutral',
      attendees: meeting.attendees || [],
      scheduled_start: meeting.scheduled_at,
      actual_start_time: meeting.actual_start_time,
      actual_end_time: meeting.actual_end_time,
    }
  })
  const [joinTime, setJoinTime] = useState<Date | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [permissionError, setPermissionError] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isOrganizer = meeting.organizer_id === currentUserId

  const speechRecognitionRef = useRef<any>(null)
  const transcriptFinalRef = useRef<string>('')
  const transcriptInterimRef = useRef<string>('')
  const transcriptCaptureEnabledRef = useRef<boolean>(false)
  const isMeetingActiveRef = useRef<boolean>(isMeetingActive)
  const isOrganizerRef = useRef<boolean>(isOrganizer)

  useEffect(() => {
    setIsMeetingActive(meeting.status === 'in-progress')
  }, [meeting.status])

  useEffect(() => {
    isMeetingActiveRef.current = isMeetingActive
  }, [isMeetingActive])

  useEffect(() => {
    isOrganizerRef.current = isOrganizer
  }, [isOrganizer])

  // Request media permissions when meeting becomes active
  useEffect(() => {
    if (isMeetingActive && permissionStatus === 'pending') {
      requestMediaPermissions()
    }
  }, [isMeetingActive])

  // Update video stream when video/audio toggles change
  useEffect(() => {
    if (localStream && isMeetingActive) {
      updateStreamTracks()
    }
  }, [isVideoOn, isAudioOn])

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

  // Poll meeting AI report until it's ready.
  useEffect(() => {
    if (!showReport) return

    let cancelled = false
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://hrapi.codewithseth.co.ke'
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    setReportState((prev) => ({
      ...prev,
      processingStatus: prev.processingStatus === 'completed' ? 'completed' : 'processing',
      processingError: '',
    }))

    if (!token) {
      setReportState((prev) => ({
        ...prev,
        processingStatus: 'failed',
        processingError: 'You must be logged in to view the report.',
      }))
      return
    }

    let attempt = 0
    const maxAttempts = 36 // ~3 minutes @ 5s intervals

    const poll = async () => {
      attempt += 1
      try {
        const res = await fetch(`${baseUrl}/api/meetings/${meeting._id}/report`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json().catch(() => null)

        if (cancelled) return

        if (res.ok && data?.success) {
          setReportState({
            summary: data.data.summary || '',
            keyPoints: data.data.keyPoints || [],
            actionItems: data.data.actionItems || [],
            transcript: data.data.transcript || '',
            processingStatus: 'completed',
            processingError: '',
            sentiment: data.data.sentiment || 'neutral',
          })
          return
        }
      } catch {
        // ignore and retry
      }

      if (cancelled) return

      if (attempt >= maxAttempts) {
        setReportState((prev) => ({
          ...prev,
          processingStatus: 'failed',
          processingError: 'Timed out waiting for AI report generation.',
        }))
        return
      }

      setTimeout(() => {
        if (!cancelled) poll()
      }, 5000)
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [showReport, meeting._id])

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopVideoStream()
      transcriptCaptureEnabledRef.current = false
      try {
        speechRecognitionRef.current?.stop?.()
      } catch {
        // ignore
      } finally {
        speechRecognitionRef.current = null
        setRecordingActive(false)
      }
    }
  }, [])

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

  const requestMediaPermissions = async () => {
    try {
      setIsConnecting(true)
      setPermissionError('')
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: meeting.meeting_type !== 'audio' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      }

      console.log('Requesting media permissions with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      console.log('Permissions granted! Stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        label: t.label
      })))
      
      setLocalStream(stream)
      setPermissionStatus('granted')
      
      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Start transcript capture only for the organizer.
      if (isMeetingActive && isOrganizerRef.current) {
        startTranscriptRecognition()
      }
    } catch (error: any) {
      console.error('Error requesting media permissions:', error)
      setPermissionStatus('denied')
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Camera and microphone access denied. Please allow permissions in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionError('No camera or microphone found. Please check your device.')
      } else {
        setPermissionError(`Failed to access media: ${error.message}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const updateStreamTracks = () => {
    if (!localStream) return

    // Update audio tracks
    localStream.getAudioTracks().forEach(track => {
      track.enabled = isAudioOn
    })

    // Update video tracks
    localStream.getVideoTracks().forEach(track => {
      track.enabled = isVideoOn
    })
  }

  const startVideoStream = async () => {
    if (permissionStatus === 'granted' && localStream) {
      updateStreamTracks()
    } else if (permissionStatus === 'pending') {
      await requestMediaPermissions()
    }
  }

  const stopVideoStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped ${track.kind} track`)
      })
      setLocalStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const getCurrentTranscriptText = () => {
    const finalText = transcriptFinalRef.current || ''
    const interimText = transcriptInterimRef.current || ''
    return `${finalText}${interimText ? ` ${interimText}` : ''}`.trim()
  }

  const startTranscriptRecognition = () => {
    if (!isOrganizerRef.current && !isOrganizer) return

    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null

    if (!SpeechRecognitionCtor) {
      console.warn('SpeechRecognition is not supported in this browser.')
      return
    }

    try {
      transcriptFinalRef.current = ''
      transcriptInterimRef.current = ''
      transcriptCaptureEnabledRef.current = true
      setTranscript('')

      try {
        speechRecognitionRef.current?.stop?.()
      } catch {
        // ignore
      }

      const recognition = new SpeechRecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        const resultIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0

        let didAppendFinal = false
        for (let i = resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result?.[0]?.transcript ? String(result[0].transcript) : ''
          if (!text) continue

          if (result.isFinal) {
            didAppendFinal = true
            transcriptFinalRef.current = transcriptFinalRef.current
              ? `${transcriptFinalRef.current} ${text.trim()}`
              : text.trim()
            transcriptInterimRef.current = ''
          } else {
            transcriptInterimRef.current = text.trim()
          }
        }

        if (didAppendFinal || transcriptInterimRef.current) {
          setTranscript(getCurrentTranscriptText())
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error || event)
      }

      recognition.onend = () => {
        if (transcriptCaptureEnabledRef.current && isMeetingActiveRef.current && isOrganizerRef.current) {
          try {
            recognition.start()
          } catch {
            // ignore
          }
        }
      }

      speechRecognitionRef.current = recognition
      setRecordingActive(true)
      recognition.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setRecordingActive(false)
      transcriptCaptureEnabledRef.current = false
    }
  }

  const stopTranscriptRecognition = () => {
    try {
      transcriptCaptureEnabledRef.current = false
      speechRecognitionRef.current?.stop?.()
    } catch {
      // ignore
    } finally {
      speechRecognitionRef.current = null
      transcriptInterimRef.current = ''
      setRecordingActive(false)
      setTranscript(getCurrentTranscriptText())
    }
  }

  const handleStartMeeting = async () => {
    try {
      await onStartMeeting(meeting._id)
      setIsMeetingActive(true)
      // Permission request will be triggered by the useEffect
    } catch (error) {
      console.error('Error starting meeting:', error)
    }
  }

  const handleEndMeeting = async () => {
    try {
      stopTranscriptRecognition()
      stopVideoStream()

      setReportState((prev) => ({
        ...prev,
        processingStatus: 'processing',
        processingError: '',
      }))

      const transcriptToSubmit = getCurrentTranscriptText() || transcript.trim()
      await onEndMeeting(meeting._id, transcriptToSubmit)

      setIsMeetingActive(false)
      setShowReport(true)
    } catch (error) {
      console.error('Error ending meeting:', error)
    }
  }

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn)
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
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
              onClick={toggleAudio}
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
              <>
                {/* Permission Status */}
                {permissionStatus === 'pending' && isConnecting && (
                  <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                    <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Requesting Permissions
                    </h3>
                    <p className="text-gray-400">
                      Please allow access to your camera and microphone
                    </p>
                  </Card>
                )}

                {permissionStatus === 'denied' && (
                  <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Permission Denied
                    </h3>
                    <p className="text-gray-400 mb-4">{permissionError}</p>
                    <Button
                      onClick={requestMediaPermissions}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </Card>
                )}

                {permissionStatus === 'granted' && (
                  <div className="w-full h-full max-w-4xl relative">
                    {isVideoOn ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full rounded-lg object-cover bg-black"
                        />
                        {recordingActive && (
                          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 px-3 py-2 rounded-lg">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            <span className="text-white font-medium text-sm">Recording</span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg">
                          <p className="text-white text-sm font-medium">You</p>
                        </div>
                      </>
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
                )}
              </>
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
      {isMeetingActive && !isMinimized && permissionStatus === 'granted' && (
        <div className="bg-gray-900 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left side - Meeting info */}
            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {joinTime && new Date().getTime() - joinTime.getTime() > 0
                    ? `${Math.floor((new Date().getTime() - joinTime.getTime()) / 60000)}m`
                    : '0m'}
                </span>
              </div>
              {recordingActive && (
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">CAPT</span>
                </div>
              )}
            </div>

            {/* Center - Main controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={toggleAudio}
                size="lg"
                variant={isAudioOn ? 'default' : 'destructive'}
                className="rounded-full w-12 h-12 p-0"
                title={isAudioOn ? 'Mute' : 'Unmute'}
              >
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              {meeting.meeting_type !== 'audio' && (
                <Button
                  onClick={toggleVideo}
                  size="lg"
                  variant={isVideoOn ? 'default' : 'secondary'}
                  className="rounded-full w-12 h-12 p-0"
                  title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  <Video className="w-5 h-5" />
                </Button>
              )}

              <Button
                onClick={handleEndMeeting}
                size="lg"
                variant="destructive"
                className="rounded-full w-12 h-12 p-0"
                title="Leave meeting"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>

            {/* Right side - Additional controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowTranscript((prev) => !prev)}
                variant="outline"
                size="sm"
                className="text-white border-gray-600"
                title="Live transcript"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Transcript
              </Button>
              <Button
                onClick={() => setIsMinimized(true)}
                variant="ghost"
                size="sm"
                className="text-white"
                title="Minimize"
              >
                ↓
              </Button>
            </div>
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

            <MeetingReport
              title={meeting.title}
              summary={reportState.summary}
              keyPoints={reportState.keyPoints}
              actionItems={reportState.actionItems}
              transcript={reportState.transcript}
              processingStatus={reportState.processingStatus}
              processingError={reportState.processingError}
              sentiment={reportState.sentiment}
              attendees={reportState.attendees}
              scheduled_start={reportState.scheduled_start}
              actual_start_time={reportState.actual_start_time}
              actual_end_time={reportState.actual_end_time}
              meeting_type={meeting.meeting_type}
              organizer={meeting.organizer}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
