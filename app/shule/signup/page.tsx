"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setSession } from '@/components/shule/auth-utils'
import { API_URL } from '@/lib/apiBase'

export default function SignUpPage() {
  const router = useRouter()
  const [school, setSchool] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
    if (!school || !slug || !email || !password) return setError('All fields required')
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/shule/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: school.trim(), slug: slug.trim(), adminEmail: email.trim().toLowerCase(), adminPassword: password, adminName: email.split('@')[0] }),
      })
      const payload = await res.json()
      if (!payload.success) throw new Error(payload.message || 'Registration failed')
      const token = payload.data?.token
      const user = payload.data?.user
      if (token && user) {
        setSession(token, user)
      }
      router.push('/shule/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-semibold">Create School Account</h2>
      <form className="space-y-4 mt-4" onSubmit={submit}>
        <div>
          <label className="text-sm">School Name</label>
          <input value={school} onChange={(e) => setSchool(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="text-sm">School Slug (used in URL)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. myschool" />
        </div>
        <div>
          <label className="text-sm">Admin Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border p-2 rounded" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button className="px-4 py-2 bg-black text-white rounded" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </div>
      </form>
    </div>
  )
}
