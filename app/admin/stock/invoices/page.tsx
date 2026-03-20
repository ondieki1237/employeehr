"use client"

import { useEffect, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

function downloadInvoicePdf(invoice: Invoice) {
  const doc = new jsPDF()
  let y = 15
  doc.setFontSize(16)
  doc.text("Invoice", 14, y)
  y += 8

  doc.setFontSize(11)
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, y)
  y += 6
  doc.text(`Delivery Note: ${invoice.deliveryNoteNumber}`, 14, y)
  y += 6
  doc.text(`Quotation No: ${invoice.quotationNumber || "N/A"}`, 14, y)
  y += 6
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`, 14, y)
  y += 8

  doc.text(`Client: ${invoice.client.name}`, 14, y)
  y += 6
  doc.text(`Number: ${invoice.client.number}`, 14, y)
  y += 6
  doc.text(`Location: ${invoice.client.location}`, 14, y)
  y += 10

  doc.text("Items:", 14, y)
  y += 6
  invoice.items.forEach((item, index) => {
    doc.text(
      `${index + 1}. ${item.productName} | Qty: ${item.quantity} | Price: ${item.unitPrice.toFixed(2)} | Total: ${item.lineTotal.toFixed(2)}`,
      14,
      y,
    )
    y += 6
    if (y > 275) {
      doc.addPage()
      y = 15
    }
  })

  y += 4
  doc.setFontSize(12)
  doc.text(`Total: ${invoice.subTotal.toFixed(2)}`, 14, y)

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}

function downloadDeliveryNotePdf(invoice: Invoice) {
  const doc = new jsPDF()
  let y = 15
  doc.setFontSize(16)
  doc.text("Delivery Note", 14, y)
  y += 8

  doc.setFontSize(11)
  doc.text(`Delivery Note No: ${invoice.deliveryNoteNumber}`, 14, y)
  y += 6
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, y)
  y += 6
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`, 14, y)
  y += 8

  doc.text(`Deliver To: ${invoice.client.name}`, 14, y)
  y += 6
  doc.text(`Phone: ${invoice.client.number}`, 14, y)
  y += 6
  doc.text(`Location: ${invoice.client.location}`, 14, y)
  y += 10

  doc.text("Products for Delivery:", 14, y)
  y += 6
  invoice.items.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.productName} | Qty: ${item.quantity}`, 14, y)
    y += 6
    if (y > 275) {
      doc.addPage()
      y = 15
    }
  })

  y += 10
  doc.text("Received By: __________________________", 14, y)
  y += 8
  doc.text("Signature: _____________________________", 14, y)

  doc.save(`delivery-note-${invoice.deliveryNoteNumber}.pdf`)
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
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
      const response = await fetch(`${API_URL}/api/stock/invoices`, { headers })
      const data = await response.json()
      setInvoices(data.data || [])
    } finally {
      setLoading(false)
    }
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
                        <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(invoice)}>Invoice PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => downloadDeliveryNotePdf(invoice)}>Delivery Note PDF</Button>
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
