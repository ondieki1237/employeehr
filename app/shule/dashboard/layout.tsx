"use client"
import React from 'react'
import Link from 'next/link'
import { getSession, logout } from '@/components/shule/auth-utils'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  React.useEffect(() => {
    const s = getSession()
    if (!s) router.replace('/shule/login')
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/shule')
  }

  const session = typeof window !== 'undefined' ? getSession() : null

  return (
    <div className="space-y-6">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shule" className="font-semibold">Shule</Link>
          <Link href="/shule/dashboard" className="text-sm text-gray-600">Dashboard</Link>
        </div>
        <div className="flex items-center gap-4">
          {session && <span className="text-sm text-gray-700">{session.email} — {session.role}</span>}
          <button onClick={handleLogout} className="text-sm text-gray-600">Logout</button>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
