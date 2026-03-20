"use client"

import { useEffect, useMemo, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
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
      const [invoicesResponse, brandingResponse] = await Promise.all([
        fetch(`${API_URL}/api/stock/invoices`, { headers }),
        fetch(`${API_URL}/api/company/branding`, { headers }),
      ])
      const [invoicesData, brandingData] = await Promise.all([invoicesResponse.json(), brandingResponse.json()])
      setInvoices(invoicesData.data || [])
      setBranding(brandingData.data || {})
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoicePdf = (invoice: Invoice) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"
    generateInvoicePdf({
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
    })
  }

  const handleDownloadDeliveryNotePdf = (invoice: Invoice) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"
    generateDeliveryNotePdf({
      invoiceNumber: invoice.invoiceNumber,
      deliveryNoteNumber: invoice.deliveryNoteNumber,
      createdAt: invoice.createdAt,
      client: invoice.client,
      items: invoice.items,
      branding,
      preparedBy,
      watermarkText: invoice.status === "paid" ? "PAID" : invoice.status === "cancelled" ? "CANCELLED" : undefined,
    })
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
                  <th className="py-2">Delivery Note #</th>
                  <th className="py-2">Quotation #</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Items</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="border-b align-top">
                    <td className="py-2">{invoice.invoiceNumber}</td>
                    <td className="py-2">{invoice.deliveryNoteNumber}</td>
                    <td className="py-2">{invoice.quotationNumber || "-"}</td>
                    <td className="py-2">
                      <div className="font-medium">{invoice.client.name}</div>
                      <div className="text-xs text-muted-foreground">{invoice.client.number}</div>
                      <div className="text-xs text-muted-foreground">{invoice.client.location}</div>
                    </td>
                    <td className="py-2">{invoice.items.length}</td>
                    <td className="py-2">{invoice.subTotal.toFixed(2)}</td>
                    <td className="py-2 capitalize">{invoice.status}</td>
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
