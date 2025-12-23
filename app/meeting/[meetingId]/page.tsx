'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MeetingInterface } from '@/components/meetings/meeting-interface'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from 'lucide-react'

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
}

export default function MeetingPage({ params }: { params: { meetingId: string } }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    fetchMeeting()
  }, [params.meetingId])

  const fetchMeeting = async (pwd?: string) => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')
      
      if (!token) {
        // Redirect to login with return URL
        router.push(`/auth/login?redirect=/meeting/${params.meetingId}`)
        return
      }

      setCurrentUserId(userId || '')

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/by-meeting-id/${params.meetingId}`)
      if (pwd) {
        url.searchParams.append('password', pwd)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.message?.includes('password')) {
          setPasswordRequired(true)
          throw new Error('Password required')
        }
        throw new Error(data.message || 'Failed to load meeting')
      }

      setMeeting(data.data)
      setPasswordRequired(false)
    } catch (err: any) {
      console.error('Error fetching meeting:', err)
      if (err.message !== 'Password required') {
        setError(err.message || 'Failed to load meeting')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMeeting(password)
  }

  const handleStartMeeting = async (meetingId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/start`,
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
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/end`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading meeting...</p>
        </div>
      </div>
    )
  }

  if (passwordRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Password Required</h2>
          <p className="text-gray-400 mb-6">
            This meeting is password protected. Please enter the password to join.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter meeting password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button type="submit" className="w-full">
              Join Meeting
            </Button>
          </form>
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
      onStartMeeting={handleStartMeeting}
      onEndMeeting={handleEndMeeting}
    />
  )
}
