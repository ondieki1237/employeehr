"use client"
import React from 'react'
import { getSession } from '@/components/shule/auth-utils'
import { useRouter } from 'next/navigation'

export default function StudentPage() {
  const router = useRouter()
  React.useEffect(() => {
    const s = getSession()
    if (!s) return router.replace('/shule/login')
    if (s.role !== 'student') return router.replace('/shule/dashboard')
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Student Dashboard</h2>
      <p className="text-gray-600 mt-2">Your classes, assignments and grades will appear here.</p>
    </div>
  )
}
