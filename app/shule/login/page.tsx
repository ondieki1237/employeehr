"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { setSession } from '@/components/shule/auth-utils'
import { API_URL } from '@/lib/apiBase'

export default function LoginPage() {
  const router = useRouter()
  const [org, setOrg] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [apiUrl, setApiUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiUrl(API_URL)
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/shule/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: org.trim(), email: email.trim().toLowerCase(), password }),
      })
      const payload = await res.json()
      if (!payload.success) return setError(payload.message || 'Invalid credentials')
      const token = payload.data?.token
      const user = payload.data?.user
      if (token && user) setSession(token, user)
      router.push('/shule/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-semibold">Shule Login</h2>
      <form className="space-y-4 mt-4" onSubmit={submit}>
        <div>
          <label className="text-sm">School Slug</label>
          <input value={org} onChange={(e) => setOrg(e.target.value)} className="w-full border p-2 rounded" placeholder="your-school" />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border p-2 rounded" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-black text-white rounded">Login</button>
          <Link href="/shule/signup" className="text-sm text-gray-600">Create account</Link>
        </div>
      </form>
    </div>
  )
}
