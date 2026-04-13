"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ClientActivity {
  type: "quotation" | "invoice" | "payment" | "sale"
  reference: string
  amount: number
  date: string
  status?: string
  paymentMethod?: string
  paidAmount?: number
  debtAmount?: number
  externalReference?: string
}

interface AccountsClientRow {
  key: string
  client: {
    name: string
    number: string
    location: string
  }
  quotationsCount: number
  quotationsValue: number
  invoicesCount: number
  purchasesValue: number
  paidAmount: number
  debtAmount: number
  salesCount: number
  salesValue: number
  lastActivityAt?: string
  activities: ClientActivity[]
}

export default function AccountsClientsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<AccountsClientRow[]>([])
  const [selectedClientKey, setSelectedClientKey] = useState("")

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await stockApi.getAccountsClients()
      const data = response.data || []
      setRows(data)
      if (!selectedClientKey && data.length > 0) setSelectedClientKey(data[0].key)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load accounts clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((row) =>
      [row.client?.name, row.client?.number, row.client?.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [rows, search])

  const selectedClient = useMemo(
    () => rows.find((row) => row.key === selectedClientKey) || null,
    [rows, selectedClientKey],
  )

  if (loading) return <div className="p-6">Loading clients...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounts · Clients</h1>
        <p className="text-sm text-muted-foreground">
          View client activities, purchases, quotations, debt position, and payment history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search client by name, number, location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-[560px] overflow-auto space-y-2">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clients found.</p>
              ) : (
                filteredRows.map((row) => (
                  <button
                    key={row.key}
                    onClick={() => setSelectedClientKey(row.key)}
                    className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                      selectedClientKey === row.key ? "border-primary bg-muted/40" : "border-border"
                    }`}
                  >
                    <div className="font-medium">{row.client.name}</div>
                    <div className="text-xs text-muted-foreground">{row.client.number} · {row.client.location}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>Purchases: {row.purchasesValue.toFixed(2)}</div>
                      <div>Quotations: {row.quotationsCount}</div>
                      <div>Paid: {row.paidAmount.toFixed(2)}</div>
                      <div className="font-medium text-primary">Debt: {row.debtAmount.toFixed(2)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedClient ? (
              <p className="text-sm text-muted-foreground">Select a client to view details.</p>
            ) : (
              <>
                <div className="rounded border bg-muted/30 p-3 text-sm space-y-1">
                  <p><span className="font-medium">Client:</span> {selectedClient.client.name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedClient.client.number}</p>
                  <p><span className="font-medium">Location:</span> {selectedClient.client.location}</p>
                  <p><span className="font-medium">Total Purchases:</span> {selectedClient.purchasesValue.toFixed(2)}</p>
                  <p><span className="font-medium">Total Paid:</span> {selectedClient.paidAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Outstanding Debt:</span> {selectedClient.debtAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Quotations:</span> {selectedClient.quotationsCount} ({selectedClient.quotationsValue.toFixed(2)})</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Date</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Reference</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Details</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedClient.activities || []).length === 0 ? (
                        <tr>
                          <td className="py-2" colSpan={6}>No activities found.</td>
                        </tr>
                      ) : (
                        selectedClient.activities.map((activity, index) => (
                          <tr key={`${activity.type}-${activity.reference}-${index}`} className="border-b">
                            <td className="py-2">{new Date(activity.date).toLocaleString()}</td>
                            <td className="py-2 capitalize">{activity.type}</td>
                            <td className="py-2">{activity.reference || "-"}</td>
                            <td className="py-2">{Number(activity.amount || 0).toFixed(2)}</td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {activity.type === "invoice"
                                ? `Paid ${Number(activity.paidAmount || 0).toFixed(2)} · Debt ${Number(activity.debtAmount || 0).toFixed(2)}`
                                : activity.type === "payment"
                                  ? `${String(activity.paymentMethod || "").toUpperCase()}${activity.externalReference ? ` · ${activity.externalReference}` : ""}`
                                  : (activity.status || "-")}
                            </td>
                            <td className="py-2">
                              {activity.type === "invoice" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/invoices?q=${encodeURIComponent(activity.reference || "")}`
                                  }}
                                >
                                  Open Invoice
                                </Button>
                              ) : activity.type === "quotation" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.location.href = `/admin/stock/quotations?q=${encodeURIComponent(activity.reference || "")}`
                                  }}
                                >
                                  Open Quotation
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
