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

export default function LibraryPage() {
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
          Library
        </h1>
        <p className="max-w-3xl text-sm leading-6" style={{ color: branding.textColor + "cc" }}>
          Manage book catalog, borrowing records, and library operations.
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
          <Link href="#">Add Book</Link>
        </Button>
        <Button
          asChild
          style={{
            borderColor: branding.primaryColor,
            color: branding.primaryColor,
          }}
          className="border"
        >
          <Link href="#">View Borrowed</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Catalog", description: "Manage library book collection and learning resources." },
          { title: "Borrowing", description: "Track book borrowing records and return due dates." },
          { title: "Management", description: "Oversee library operations and resource allocation." },
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
