"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

interface BrandingData {
  primaryColor?: string
  textColor?: string
}

export default function SupervisionPage() {
  const [branding, setBranding] = useState<BrandingData>({
    primaryColor: "#2563eb",
    textColor: "#1f2937",
  })

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await api.company.getBranding()
        if (res?.success && res.data) {
          setBranding({
            primaryColor: res.data.primaryColor || "#2563eb",
            textColor: res.data.textColor || "#1f2937",
          })
        }
      } catch (error) {
        console.error("Failed to fetch branding:", error)
      }
    }
    fetchBranding()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: branding.primaryColor }}>
          Supervision
        </h1>
        <p className="max-w-3xl text-sm leading-6" style={{ color: branding.textColor + "cc" }}>
          Approve leaves, manage discipline, and review supervisor actions.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          style={{
            borderColor: branding.primaryColor,
            color: branding.primaryColor,
          }}
          className="border"
        >
          <Link href="#">Review Request</Link>
        </Button>
        <Button
          asChild
          style={{
            borderColor: branding.primaryColor,
            color: branding.primaryColor,
          }}
          className="border"
        >
          <Link href="#">View Pending</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Leave Requests", description: "Review and approve staff and student leave requests." },
          { title: "Discipline", description: "Manage student discipline cases and corrective actions." },
          { title: "Approvals", description: "Track pending approvals and supervisor actions." },
        ].map((item) => (
          <Card
            key={item.title}
            className="border-border/70 bg-white p-5 shadow-sm"
            style={{
              borderColor: branding.primaryColor + "20",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: branding.primaryColor }}>
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: branding.textColor + "cc" }}>
              {item.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
