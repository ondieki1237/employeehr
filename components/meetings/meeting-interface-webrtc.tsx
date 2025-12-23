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
  Users,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle,
  VideoOff,
} from 'lucide-react'
import { useWebRTC } from '@/hooks/use-webrtc'

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
  meeting_id: string
}

interface MeetingInterfaceProps {
  meeting: Meeting
  currentUserId: string
  currentUserName?: string
  isGuest?: boolean
  onEndMeeting: (meetingId: string, transcript: string) => Promise<void>
  onStartMeeting: (meetingId: string) => Promise<void>
}

export function MeetingInterface({
  meeting,
  currentUserId,
  currentUserName,
  isGuest = false,
  onEndMeeting,
  onStartMeeting,
}: MeetingInterfaceProps) {
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(meeting.meeting_type !== 'audio')
  const [isMeetingActive, setIsMeetingActive] = useState(
    meeting.status === 'in-progress'
  )
  const [recordingActive, setRecordingActive] = useState(false)
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userName, setUserName] = useState<string>('')
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  const isOrganizer = !isGuest && meeting.organizer_id === currentUserId

  // Get current user details
  useEffect(() => {
    if (isGuest && currentUserName) {
      setUserName(currentUserName)
    } else {
      const user = meeting.attendees.find(a => a.user_id === currentUserId)?.user
      if (user) {
        setCurrentUser(user)
        setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User')
      }
    }
  }, [meeting, currentUserId, isGuest, currentUserName])

  // Initialize WebRTC
  const { remoteStreams, isConnected, participants } = useWebRTC(
    meeting.meeting_id,
    currentUserId,
    userName,
    localStream,
    isMeetingActive && permissionStatus === 'granted'
  )

  // Request media permissions when meeting becomes active
  useEffect(() => {
    if (isMeetingActive && permissionStatus === 'pending') {
      requestMediaPermissions()
    }
  }, [isMeetingActive])

  // Update stream tracks when audio/video toggles change
  useEffect(() => {
    if (localStream && isMeetingActive) {
      updateStreamTracks()
    }
  }, [isVideoOn, isAudioOn])

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      const videoElement = remoteVideoRefs.current.get(socketId)
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
      }
    })
  }, [remoteStreams])

  // Track time in meeting for KPI
  useEffect(() => {
    if (isMeetingActive && !joinTime) {
      const now = new Date()
      setJoinTime(now)
      if (!isGuest) {
        trackJoinTime()
      }
    }

    return () => {
      if (joinTime && isMeetingActive && !isGuest) {
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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
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

  const stopVideoStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped ${track.kind} track`)
      })
      setLocalStream(null)
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
  }

  const startRecording = (stream: MediaStream) => {
    try {
      audioChunksRef.current = []
      
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
      }
      
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'audio/mp4'
      }
      
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000)
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
      if (isGuest) return // Guests cannot start meetings
      await onStartMeeting(meeting._id)
      setIsMeetingActive(true)
    } catch (error) {
      console.error('Error starting meeting:', error)
    }
  }

  const handleEndMeeting = async () => {
    try {
      if (isGuest) {
        // Guests just leave
        handleLeaveMeeting()
        return
      }
      
      setRecordingActive(false)
      const audioBlob = await stopRecording()
      stopVideoStream()

      setAiProcessing(true)

      await onEndMeeting(meeting._id, transcript)

      setIsMeetingActive(false)
      setShowReport(true)
    } catch (error) {
      console.error('Error ending meeting:', error)
    }
  }

  const handleLeaveMeeting = () => {
    stopVideoStream()
    window.location.href = isGuest ? '/' : '/dashboard'
  }

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn)
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
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
          <div className="flex-1 bg-gradient-to-b from-gray-900 to-black p-4 overflow-hidden">
            {isMeetingActive ? (
              <>
                {permissionStatus === 'pending' && isConnecting && (
                  <div className="flex items-center justify-center h-full">
                    <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                      <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Requesting Permissions
                      </h3>
                      <p className="text-gray-400">
                        Please allow access to your camera and microphone
                      </p>
                    </Card>
                  </div>
                )}

                {permissionStatus === 'denied' && (
                  <div className="flex items-center justify-center h-full">
                    <Card className="w-full max-w-md p-8 text-center bg-gray-800 border-gray-700">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Permission Denied
                      </h3>
                      <p className="text-gray-400 mb-4">{permissionError}</p>
                      <Button onClick={requestMediaPermissions} className="w-full">
                        Try Again
                      </Button>
                    </Card>
                  </div>
                )}

                {permissionStatus === 'granted' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full auto-rows-fr">
                    {/* Local video */}
                    <Card className="relative overflow-hidden bg-gray-900 border-gray-700">
                      {isVideoOn ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-800">
                          <div className="text-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-2xl font-bold text-white">
                                {userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <VideoOff className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">{userName} (Video Off)</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-lg">
                        <p className="text-white text-sm font-medium">
                          {userName} (You)
                          {isGuest && <Badge className="ml-2 text-xs" variant="secondary">Guest</Badge>}
                        </p>
                      </div>
                      {!isAudioOn && (
                        <div className="absolute top-2 right-2 bg-red-600 p-2 rounded-full">
                          <MicOff className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {recordingActive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 px-2 py-1 rounded">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <span className="text-white text-xs">REC</span>
                        </div>
                      )}
                    </Card>

                    {/* Remote participants */}
                    {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
                      const participant = participants.find(p => p.socketId === socketId)
                      return (
                        <Card key={socketId} className="relative overflow-hidden bg-gray-900 border-gray-700">
                          <video
                            ref={(el) => {
                              if (el) remoteVideoRefs.current.set(socketId, el)
                            }}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
                            {participant?.userName || 'Participant'}
                          </div>
                        </Card>
                      )
                    })}

                    {/* Empty slots for invited participants */}
                    {remoteStreams.size === 0 && (
                      <Card className="flex items-center justify-center bg-gray-800 border-gray-700 border-dashed">
                        <div className="text-center text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">Waiting for participants...</p>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
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
              </div>
            )}
          </div>

          {/* Controls */}
          {isMeetingActive && !isMinimized && permissionStatus === 'granted' && (
            <div className="bg-gray-900 border-t border-gray-700 p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {joinTime && new Date().getTime() - joinTime.getTime() > 0
                        ? `${Math.floor((new Date().getTime() - joinTime.getTime()) / 60000)}m`
                        : '0m'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-white border-white">
                    {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
                  </Badge>
                  {isConnected && (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Connected
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={toggleAudio}
                    size="lg"
                    variant={isAudioOn ? 'default' : 'destructive'}
                    className="rounded-full w-12 h-12 p-0"
                  >
                    {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>

                  {meeting.meeting_type !== 'audio' && (
                    <Button
                      onClick={toggleVideo}
                      size="lg"
                      variant={isVideoOn ? 'default' : 'secondary'}
                      className="rounded-full w-12 h-12 p-0"
                    >
                      {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </Button>
                  )}

                  <Button
                    onClick={isGuest ? handleLeaveMeeting : (isOrganizer ? handleEndMeeting : handleLeaveMeeting)}
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-12 h-12 p-0"
                    title={isOrganizer && !isGuest ? 'End meeting' : 'Leave meeting'}
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsMinimized(true)}
                    variant="ghost"
                    size="sm"
                    className="text-white"
                  >
                    ↓
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
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
