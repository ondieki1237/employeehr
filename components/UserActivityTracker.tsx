'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getToken } from '@/lib/auth'

/**
 * UserActivityTracker
 * Silently tracks user interaction heartbeats and page navigation in the background.
 * This component is invisible and does not affect the UI.
 */
export function UserActivityTracker() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string>('')

  const trackAction = async (action: 'pulse' | 'view', resource?: string) => {
    const token = getToken()
    if (!token) return

    // Avoid redundant tracking of the same view
    if (action === 'view' && resource === lastTrackedPath.current) return
    if (action === 'view') lastTrackedPath.current = resource || ''

    try {
      // Using a slightly more robust approach for the API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000')

      await fetch(`${baseUrl}/api/activity/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          resource: resource || pathname,
          details: action === 'view' ? `Section access: ${pathname}` : 'Active session heartbeat'
        })
      })
    } catch (error) {
      // Fail silently - user should never see or feel the tracker
    }
  }

  // Heartbeat & Visibility Tracking
  useEffect(() => {
    // Pulse every 2 minutes for higher resolution in the Interaction Logs
    const interval = setInterval(() => {
      trackAction('pulse')
    }, 2 * 60 * 1000)

    // Pulse when the user returns to the tab (re-engages)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackAction('pulse')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Initial engagement pulse
    trackAction('pulse')

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname]) // Re-bind pulse to current pathname context

  // Navigation Tracking
  useEffect(() => {
    trackAction('view', pathname)
  }, [pathname])

  return null // Completely invisible to the user
}
