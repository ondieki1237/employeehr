"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DispatchInvoice {
  _id: string
  invoiceNumber: string
  client: { name: string; number: string; location: string }
  dispatch?: { status: string; assignedToUserId?: string }
  createdAt: string
}

interface Analytics {
  counts: Record<string, number>
  completionRate: number
  averagePackingProgress: number
}

export default function AdminDispatchManagementPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<DispatchInvoice[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [invoicesRes, analyticsRes] = await Promise.all([
          fetch(`${API_URL}/api/stock/invoices`, { headers }),
          fetch(`${API_URL}/api/stock/dispatch/analytics`, { headers }),
        ])
        const [invoicesJson, analyticsJson] = await Promise.all([invoicesRes.json(), analyticsRes.json()])
        setInvoices(invoicesJson.data || [])
        setAnalytics(analyticsJson.data || null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-6">Loading dispatch management...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dispatch Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{analytics?.counts?.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Delivered</p><p className="text-2xl font-bold text-green-600">{analytics?.counts?.delivered || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold">{analytics?.completionRate || 0}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Packing</p><p className="text-2xl font-bold">{analytics?.averagePackingProgress || 0}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices Dispatch Overview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {invoices.map((invoice) => {
            const statusColors = 
              invoice.dispatch?.status === "delivered" ? "bg-green-100 text-green-700" :
              invoice.dispatch?.status === "dispatched" ? "bg-blue-100 text-blue-700" :
              invoice.dispatch?.status === "packed" ? "bg-purple-100 text-purple-700" :
              invoice.dispatch?.status === "packing" ? "bg-yellow-100 text-yellow-700" :
              "bg-gray-100 text-gray-700"
            
            return (
              <div key={invoice._id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{invoice.invoiceNumber}</p>
                  <p className="text-sm font-medium">{invoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.client.number} • {invoice.client.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors}>
                    {invoice.dispatch?.status === "delivered" ? "✓ Delivered" :
                     invoice.dispatch?.status === "dispatched" ? "📦 Dispatched" :
                     invoice.dispatch?.status === "packed" ? "✓ Packed" :
                     invoice.dispatch?.status === "packing" ? "📝 Packing" :
                     "Not assigned"}
                  </Badge>
                  <Button size="sm" asChild>
                    <Link href={`/admin/stock/dispatch/${invoice._id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
