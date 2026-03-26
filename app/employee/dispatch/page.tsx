"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DispatchInvoice {
  _id: string
  invoiceNumber: string
  client: { name: string }
  dispatch?: {
    status: string
    packingItems?: Array<{ requiredQuantity: number; packedQuantity: number }>
  }
  createdAt: string
}

export default function EmployeeDispatchPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<DispatchInvoice[]>([])

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/stock/dispatch/my`, { headers })
        const json = await response.json()
        setInvoices(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="p-4">Loading dispatch queue...</div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">My Dispatch Queue</h1>
      {invoices.length === 0 ? (
        <Card><CardContent className="py-8 text-sm text-muted-foreground">No dispatch invoices assigned.</CardContent></Card>
      ) : (
        invoices.map((invoice) => {
          const items = invoice.dispatch?.packingItems || []
          const required = items.reduce((sum, item) => sum + Number(item.requiredQuantity || 0), 0)
          const packed = items.reduce((sum, item) => sum + Number(item.packedQuantity || 0), 0)
          const complete = required > 0 && packed >= required
          return (
            <Card key={invoice._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{invoice.invoiceNumber}</span>
                  <Badge className={complete ? "bg-green-100 text-green-700" : packed > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                    {packed > 0 ? `${packed}/${required}` : "Not packed"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Client:</strong> {invoice.client.name}</p>
                <p><strong>Status:</strong> {invoice.dispatch?.status || "not_assigned"}</p>
                <Button className="w-full" asChild>
                  <Link href={`/employee/dispatch/${invoice._id}`}>Open Dispatch Form</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
