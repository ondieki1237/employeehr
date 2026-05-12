"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/components/shule/auth-utils'

export default function DashboardIndex() {
  const router = useRouter()

  React.useEffect(() => {
    const s = getSession()
    if (!s) return router.replace('/shule/login')
    // route by role
    if (s.role === 'manager') router.replace('/shule/dashboard/manager')
    if (s.role === 'facilitator') router.replace('/shule/dashboard/facilitator')
    if (s.role === 'student') router.replace('/shule/dashboard/student')
  }, [])

  return <div>Redirecting to your dashboard...</div>
}
