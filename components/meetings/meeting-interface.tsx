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
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [permissionError, setPermissionError] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const isOrganizer = meeting.organizer_id === currentUserId

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

  // Cleanup media streams on unmount
  useEffect(() => {
    return () => {
      stopVideoStream()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
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

      // Start recording if meeting is active
      if (isMeetingActive) {
        startRecording(stream)
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

  const startRecording = (stream: MediaStream) => {
    try {
      audioChunksRef.current = []
      
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
      }
      
      // Fallback for browsers that don't support webm
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'audio/mp4'
      }
      
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log('Recording chunk received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error)
      }

      mediaRecorder.start(1000) // Collect data every second
      setRecordingActive(true)
      console.log('Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: audioChunksRef.current[0]?.type || 'audio/webm' 
          })
          console.log('Recording stopped. Total size:', audioBlob.size, 'bytes')
          resolve(audioBlob)
        }
        mediaRecorderRef.current.stop()
        setRecordingActive(false)
      } else {
        resolve(new Blob([], { type: 'audio/webm' }))
      }
    })
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
                  <span className="text-sm font-medium">REC</span>
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
