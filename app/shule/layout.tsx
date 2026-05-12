import React from 'react'

export const metadata = { title: 'Shule - School' }

export default function ShuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        {children}
      </div>
    </div>
  )
}
