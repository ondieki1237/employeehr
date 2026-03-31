"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  applyStampToPdf,
  generateDeliveryNotePdf,
  generateInvoicePdf,
  type TenantBranding,
} from "@/lib/stock-document-pdf"

interface InvoiceItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface Invoice {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  quotationNumber?: string
  client: { name: string; number: string; location: string }
  items: InvoiceItem[]
  subTotal: number
  status: "issued" | "paid" | "cancelled"
  createdAt: string
  dispatch?: {
    status: "not_assigned" | "assigned" | "packing" | "packed" | "dispatched" | "delivered"
    assignedToUserId?: string
    packingItems?: Array<{ requiredQuantity: number; packedQuantity: number }>
  }
}

interface DispatchUser {
  _id: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  role?: string
}

interface StampOption {
  _id: string
  name: string
}

function exportInvoiceCsv(invoices: Invoice[]) {
  const headers = ["Invoice Number", "Delivery Note", "Quotation", "Client", "Number", "Location", "Items", "Amount", "Status", "Date"]
  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    invoice.deliveryNoteNumber,
    invoice.quotationNumber || "",
    invoice.client.name,
    invoice.client.number,
    invoice.client.location,
    String(invoice.items.length),
    invoice.subTotal.toFixed(2),
    invoice.status,
    new Date(invoice.createdAt).toISOString(),
  ])

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => {
          const stringValue = String(value ?? "")
          if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`
          return stringValue
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "invoices.csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [branding, setBranding] = useState<TenantBranding>({})
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [dispatchUsers, setDispatchUsers] = useState<DispatchUser[]>([])
  const [selectedDispatchByInvoice, setSelectedDispatchByInvoice] = useState<Record<string, string>>({})
  const [assigningInvoiceId, setAssigningInvoiceId] = useState<string | null>(null)

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const invoicesResponse = await fetch(`${API_URL}/api/stock/invoices`, { headers })
      const invoicesData = await invoicesResponse.json()
      if (!invoicesResponse.ok) {
        throw new Error(invoicesData.message || "Failed to load invoices")
      }
      setInvoices(invoicesData.data || [])

      const [brandingResult, usersResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/company/branding`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
      ])

      if (brandingResult.status === "fulfilled") {
        try {
          const brandingData = await brandingResult.value.json()
          setBranding(brandingData.data || {})
        } catch {
          setBranding({})
        }
      } else {
        setBranding({})
      }

      if (usersResult.status === "fulfilled") {
        try {
          const usersData = await usersResult.value.json()
          setDispatchUsers(usersData.data || [])
        } catch {
          setDispatchUsers([])
        }
      } else {
        setDispatchUsers([])
      }
    } catch (loadError: any) {
      setInvoices([])
      window.alert(loadError?.message || "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  const assignToDispatch = async (invoiceId: string) => {
    try {
      const assignedToUserId = selectedDispatchByInvoice[invoiceId]
      if (!assignedToUserId) {
        window.alert("Select a dispatch user first")
        return
      }

      setAssigningInvoiceId(invoiceId)
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/assign`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assignedToUserId }),
      })
      const json = await response.json()
      if (!response.ok) {
        window.alert(json.message || "Failed to assign dispatch")
        return
      }
      await loadInvoices()
    } finally {
      setAssigningInvoiceId(null)
    }
  }

  const promptStampSelection = async (): Promise<{ stampId: string; date: string } | null> => {
    const addStamp = window.confirm("Add a stamp to this PDF?")
    if (!addStamp) return null

    const defaultDate = new Date().toLocaleDateString("en-GB")
    const selectedDate = window.prompt("Enter stamp date (DD/MM/YYYY)", defaultDate)
    if (selectedDate === null) return null

    const stampsRes = await fetch(`${API_URL}/api/stamps`, { headers })
    const stampsJson = await stampsRes.json()
    const stamps: StampOption[] = stampsJson.data || stampsJson || []

    if (!stamps.length) {
      window.alert("No stamps found. Create one first in System > Stamps.")
      return null
    }

    const stampList = stamps.map((stamp, index) => `${index + 1}. ${stamp.name}`).join("\n")
    const selected = window.prompt(`Select stamp number:\n${stampList}`, "1")
    if (!selected) return null

    const index = Number(selected) - 1
    if (Number.isNaN(index) || index < 0 || index >= stamps.length) {
      window.alert("Invalid stamp selection")
      return null
    }

    return { stampId: stamps[index]._id, date: selectedDate || defaultDate }
  }

  const handleDownloadInvoicePdf = async (invoice: Invoice) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"
    const stampSelection = await promptStampSelection()

    const doc = generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber,
      quotationNumber: invoice.quotationNumber,
      createdAt: invoice.createdAt,
      client: invoice.client,
      items: invoice.items,
      subTotal: invoice.subTotal,
      branding,
      preparedBy,
      watermarkText: invoice.status === "paid" ? "PAID" : invoice.status === "cancelled" ? "CANCELLED" : undefined,
      autoSave: false,
    })

    if (stampSelection) {
      try {
        const query = new URLSearchParams({
          date: stampSelection.date,
          user: preparedBy,
          email: branding?.email || "",
          poBox: "",
        }).toString()
        const stampRes = await fetch(`${API_URL}/api/stamps/${stampSelection.stampId}/svg?${query}`, { headers })
        if (stampRes.ok) {
          const stampSvg = await stampRes.text()
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33)
        } else {
          const errorText = await stampRes.text()
          window.alert(errorText || "Failed to load selected stamp. PDF will be downloaded without stamp.")
        }
      } catch {
        window.alert("Failed to apply stamp. PDF will be downloaded without stamp.")
      }
    }

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
  }

  const handleDownloadDeliveryNotePdf = async (invoice: Invoice) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"
    const stampSelection = await promptStampSelection()

    const doc = generateDeliveryNotePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber,
      createdAt: invoice.createdAt,
      client: invoice.client,
      items: invoice.items,
      branding,
      preparedBy,
      watermarkText: invoice.status === "paid" ? "PAID" : invoice.status === "cancelled" ? "CANCELLED" : undefined,
      autoSave: false,
    })

    if (stampSelection) {
      try {
        const query = new URLSearchParams({
          date: stampSelection.date,
          user: preparedBy,
          email: branding?.email || "",
          poBox: "",
        }).toString()
        const stampRes = await fetch(`${API_URL}/api/stamps/${stampSelection.stampId}/svg?${query}`, { headers })
        if (stampRes.ok) {
          const stampSvg = await stampRes.text()
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33)
        } else {
          const errorText = await stampRes.text()
          window.alert(errorText || "Failed to load selected stamp. PDF will be downloaded without stamp.")
        }
      } catch {
        window.alert("Failed to apply stamp. PDF will be downloaded without stamp.")
      }
    }

    doc.save(`delivery-note-${invoice.deliveryNoteNumber}.pdf`)
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const filteredInvoices = invoices.filter((invoice) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.deliveryNoteNumber.toLowerCase().includes(query) ||
      (invoice.quotationNumber || "").toLowerCase().includes(query) ||
      invoice.client.name.toLowerCase().includes(query) ||
      invoice.client.number.toLowerCase().includes(query) ||
      invoice.client.location.toLowerCase().includes(query)
    )
  })

  if (loading) return <div className="p-6">Loading invoices...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Includes downloadable invoice and delivery note.</p>
        </div>
        <Button variant="outline" onClick={() => exportInvoiceCsv(filteredInvoices)}>Export Invoices (Excel)</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Search Invoices</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-md">
            <Label>Search</Label>
            <Input
              placeholder="Invoice, delivery note, quotation, client..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setSearch(searchInput)}>Search</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice List (with Delivery Notes)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Items</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Dispatch</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="border-b align-top">
                    <td className="py-2">{invoice.invoiceNumber}</td>
                    <td className="py-2">
                      <div className="font-medium">{invoice.client.name}</div>
                      <div className="text-xs text-muted-foreground">{invoice.client.number}</div>
                      <div className="text-xs text-muted-foreground">{invoice.client.location}</div>
                    </td>
                    <td className="py-2">{invoice.items.length}</td>
                    <td className="py-2">{invoice.subTotal.toFixed(2)}</td>
                    <td className="py-2 capitalize">{invoice.status}</td>
                    <td className="py-2">
                      {(() => {
                        const packingItems = invoice.dispatch?.packingItems || []
                        const required = packingItems.reduce((sum, item) => sum + Number(item.requiredQuantity || 0), 0)
                        const packed = packingItems.reduce((sum, item) => sum + Number(item.packedQuantity || 0), 0)
                        const isFullyPacked = required > 0 && packed >= required
                        const hasProgress = packed > 0
                        const dispatchState = invoice.dispatch?.status || "not_assigned"
                        const isDelivered = dispatchState === "delivered"

                        const statusLabel = isFullyPacked
                          ? `Packed ${packed}/${required}`
                          : hasProgress
                            ? `Partial ${packed}/${required}`
                            : ""

                        const statusClass = isFullyPacked
                          ? "text-green-700 bg-green-50 border-green-200"
                          : hasProgress
                            ? "text-red-700 bg-red-50 border-red-200"
                            : "text-gray-600 bg-gray-50 border-gray-200"

                        return (
                          <div className="min-w-[620px] flex items-center gap-2">
                            {!!statusLabel && (
                              <span className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium whitespace-nowrap ${statusClass}`}>
                                {statusLabel}
                              </span>
                            )}
                            {dispatchState !== "not_assigned" && (
                              <span className="text-xs capitalize whitespace-nowrap">{dispatchState}</span>
                            )}
                            {!isDelivered && (
                              <>
                                <select
                                  className="w-[220px] rounded border px-2 py-1 text-xs"
                                  value={selectedDispatchByInvoice[invoice._id] || ""}
                                  onChange={(event) =>
                                    setSelectedDispatchByInvoice((prev) => ({
                                      ...prev,
                                      [invoice._id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Assign dispatch user</option>
                                  {dispatchUsers.map((user) => {
                                    const fullName = `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || user._id
                                    return (
                                      <option key={user._id} value={user._id}>
                                        {fullName} {user.role ? `(${user.role})` : ""}
                                      </option>
                                    )
                                  })}
                                </select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => assignToDispatch(invoice._id)}
                                  disabled={assigningInvoiceId === invoice._id}
                                  className="whitespace-nowrap"
                                >
                                  To Dispatch
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" asChild className="whitespace-nowrap">
                              <Link href={`/admin/stock/dispatch/${invoice._id}`}>Open Dispatch Form</Link>
                            </Button>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-2">{new Date(invoice.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadInvoicePdf(invoice)}>Invoice PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadDeliveryNotePdf(invoice)}>Delivery Note PDF</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
