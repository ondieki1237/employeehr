'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MeetingInterface } from '@/components/meetings/meeting-interface-webrtc'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader, Video, Clock, Users, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  require_password?: boolean
  organizer?: any
}

interface GuestInfo {
  firstName: string
  lastName: string
  password: string
}

export default function MeetingPage({ params }: { params: { meetingId: string } }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: '',
    lastName: '',
    password: '',
  })
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [passwordError, setPasswordError] = useState(false)
  const [timeUntilMeeting, setTimeUntilMeeting] = useState<string>('')
  const [canJoinMeeting, setCanJoinMeeting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndFetchMeeting()
  }, [params.meetingId])

  // Countdown timer for scheduled meetings
  useEffect(() => {
    if (!meeting || meeting.status === 'in-progress' || meeting.status === 'completed') {
      setCanJoinMeeting(true)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const meetingTime = new Date(meeting.scheduled_at).getTime()
      const difference = meetingTime - now

      if (difference <= 0) {
        setTimeUntilMeeting('Meeting is starting...')
        setCanJoinMeeting(true)
      } else if (difference <= 5 * 60 * 1000) {
        // Allow joining 5 minutes before
        setCanJoinMeeting(true)
        const minutes = Math.floor(difference / 60000)
        const seconds = Math.floor((difference % 60000) / 1000)
        setTimeUntilMeeting(`Starting in ${minutes}m ${seconds}s`)
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) {
          setTimeUntilMeeting(`Meeting starts in ${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeUntilMeeting(`Meeting starts in ${hours}h ${minutes}m`)
        } else {
          setTimeUntilMeeting(`Meeting starts in ${minutes}m`)
        }
        setCanJoinMeeting(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [meeting])

  const checkAuthAndFetchMeeting = async () => {
    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')

    if (token && userId) {
      // User is logged in - fetch with auth
      setIsGuest(false)
      setCurrentUserId(userId)
      const userName = localStorage.getItem('userName') || 'User'
      setCurrentUserName(userName)
      fetchMeetingAuthenticated(token)
    } else {
      // Guest user - show form
      setIsGuest(true)
      setShowGuestForm(true)
      fetchMeetingPublic()
    }
  }

  const fetchMeetingAuthenticated = async (token: string, pwd?: string) => {
    try {
      setLoading(true)
      setError(null)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'
      let url = `${baseUrl}/api/meetings/by-meeting-id/${params.meetingId}`
      if (pwd) {
        url += `?password=${encodeURIComponent(pwd)}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.message?.includes('password')) {
          setPasswordError(true)
          throw new Error('Password required')
        }
        throw new Error(data.message || 'Failed to load meeting')
      }

      setMeeting(data.data)
      setPasswordError(false)
    } catch (err: any) {
      console.error('Error fetching meeting:', err)
      if (err.message !== 'Password required') {
        setError(err.message || 'Failed to load meeting')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMeetingPublic = async (pwd?: string) => {
    try {
      setLoading(true)
      setError(null)
      setPasswordError(false)

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'
      let url = `${baseUrl}/api/meetings/by-meeting-id/${params.meetingId}`
      if (pwd) {
        url += `?password=${encodeURIComponent(pwd)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.require_password) {
          setPasswordError(true)
          setMeeting(null)
          setLoading(false)
          return
        }
        throw new Error(data.message || 'Failed to load meeting')
      }

      setMeeting(data.data)
      setPasswordError(false)
      
      // If password was provided and meeting loaded, hide the form
      if (pwd) {
        setShowGuestForm(false)
      }
    } catch (err: any) {
      console.error('Error fetching meeting:', err)
      setError(err.message || 'Failed to load meeting')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestJoin = (e: React.FormEvent) => {
    e.preventDefault()

    if (!guestInfo.firstName.trim() || !guestInfo.lastName.trim()) {
      alert('Please enter your first and last name')
      return
    }

    if (meeting?.require_password && !guestInfo.password.trim()) {
      alert('Please enter the meeting password')
      return
    }

    // If meeting requires password, verify it first
    if (meeting?.require_password) {
      fetchMeetingPublic(guestInfo.password)
    } else {
      // Generate guest user ID and set up guest
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const guestName = `${guestInfo.firstName} ${guestInfo.lastName}`
      
      setCurrentUserId(guestId)
      setCurrentUserName(guestName)
      setShowGuestForm(false)
    }
  }

  const handleStartMeeting = async (meetingId: string) => {
    if (isGuest) {
      // Guests cannot start meetings, only join
      return
    }

    try {
      const token = localStorage.getItem('token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'
      const response = await fetch(
        `${baseUrl}/api/meetings/${meetingId}/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to start meeting')
      }

      const data = await response.json()
      setMeeting(data.data)
    } catch (error) {
      console.error('Error starting meeting:', error)
      throw error
    }
  }

  const handleEndMeeting = async (meetingId: string, transcript: string) => {
    if (isGuest) {
      // Guests cannot end meetings
      return
    }

    try {
      const token = localStorage.getItem('token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'
      const response = await fetch(
        `${baseUrl}/api/meetings/${meetingId}/end`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ transcript }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to end meeting')
      }

      const data = await response.json()
      setMeeting(data.data)
    } catch (error) {
      console.error('Error ending meeting:', error)
      throw error
    }
  }

  if (loading && !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading meeting...</p>
        </div>
      </div>
    )
  }

  // Guest Join Form
  if (showGuestForm && isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-700 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Join Meeting</h2>
            {meeting && (
              <div className="space-y-2 text-sm text-gray-400">
                <p className="text-lg font-semibold text-white">{meeting.title}</p>
                {meeting.description && (
                  <p className="text-gray-400">{meeting.description}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(meeting.scheduled_at).toLocaleString()}</span>
                </div>
                {meeting.organizer && (
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Host: {meeting.organizer.firstName} {meeting.organizer.lastName}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleGuestJoin} className="space-y-4">
            {meeting?.require_password && (
              <div>
                <Label htmlFor="password" className="text-white">
                  Meeting Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter meeting password"
                  value={guestInfo.password}
                  onChange={(e) =>
                    setGuestInfo({ ...guestInfo, password: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required={meeting?.require_password}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">Invalid password. Please try again.</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="firstName" className="text-white">
                First Name *
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                value={guestInfo.firstName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, firstName: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName" className="text-white">
                Last Name *
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={guestInfo.lastName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, lastName: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white mt-1"
                required
              />
            </div>

            {meeting && timeUntilMeeting && !canJoinMeeting && (
              <Alert className="bg-yellow-900/20 border-yellow-700">
                <Clock className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  {timeUntilMeeting}
                </AlertDescription>
              </Alert>
            )}

            {meeting && timeUntilMeeting && canJoinMeeting && meeting.status !== 'in-progress' && (
              <Alert className="bg-green-900/20 border-green-700">
                <Clock className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-200">
                  {timeUntilMeeting}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!canJoinMeeting && meeting?.status !== 'in-progress'}
            >
              {canJoinMeeting || meeting?.status === 'in-progress' ? 'Join Meeting' : 'Waiting for Meeting'}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                className="text-gray-400 hover:text-white text-sm"
                onClick={() => router.push('/auth/login')}
              >
                Sign in to your account instead
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // Countdown page for guests waiting for meeting to start
  if (isGuest && meeting && !canJoinMeeting && meeting.status !== 'in-progress') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-2xl p-8 bg-gray-900 border-gray-700 shadow-2xl text-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome, {currentUserName}!
          </h2>
          
          <p className="text-xl text-gray-300 mb-6">
            You're registered for: <strong className="text-white">{meeting.title}</strong>
          </p>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <p className="text-4xl font-bold text-blue-400 mb-2">
              {timeUntilMeeting}
            </p>
            <p className="text-gray-400">
              Scheduled for {new Date(meeting.scheduled_at).toLocaleString()}
            </p>
          </div>

          {meeting.description && (
            <div className="text-left bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-2">About this meeting:</h3>
              <p className="text-gray-300">{meeting.description}</p>
            </div>
          )}

          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertDescription className="text-blue-200">
              You can join the meeting 5 minutes before the scheduled time. This page will update automatically.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-700">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Meeting not found'}</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <MeetingInterface
      meeting={meeting}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      isGuest={isGuest}
      onStartMeeting={handleStartMeeting}
      onEndMeeting={handleEndMeeting}
    />
  )
}
