"use client"
import React, { useState } from "react"

function formatDateISO(d: Date | string) {
  const dt = new Date(d)
  return dt.toISOString()
}

function toCSV(rows: Array<{ date: string; type: string; reference: string }>) {
  const header = ["date", "type", "reference"]
  const lines = [header.join(",")]
  rows.forEach((r) => {
    const line = ["\"" + r.date + "\"", r.type, "\"" + (r.reference || "") + "\""]
    lines.push(line.join(","))
  })
  return lines.join("\n")
}

export default function Page() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [includeQuotations, setIncludeQuotations] = useState(true)
  const [includeInvoices, setIncludeInvoices] = useState(true)
  const [includeStock, setIncludeStock] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchRows = async () => {
    setLoading(true)
    try {
      const [year, mon] = month.split("-")
      const start = new Date(Number(year), Number(mon) - 1, 1).toISOString()
      const end = new Date(Number(year), Number(mon), 1).toISOString()
      const includeParts = []
      if (includeQuotations) includeParts.push("quotations")
      if (includeInvoices) includeParts.push("invoices")
      if (includeStock) includeParts.push("stock")

      const res = await fetch(`/api/reports/admin/monthly-invoice-summary?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&include=${includeParts.join(",")}`)
      const payload = await res.json()
      if (!payload.success) throw new Error(payload.message || "Failed to fetch")
      return payload.data.map((r: any) => ({ date: formatDateISO(r.date), type: r.type, reference: r.reference }))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (asExcel = false) => {
    setLoading(true)
    try {
      const [year, mon] = month.split("-")
      const start = new Date(Number(year), Number(mon) - 1, 1).toISOString()
      const end = new Date(Number(year), Number(mon), 1).toISOString()
      const includeParts = []
      if (includeQuotations) includeParts.push("quotations")
      if (includeInvoices) includeParts.push("invoices")
      if (includeStock) includeParts.push("stock")

      const url = `/api/reports/admin/monthly-invoice-summary/download?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&include=${includeParts.join(",")}`
      // navigate to URL to trigger download (keeps auth cookies)
      const filename = `monthly-summary-${month}` + (asExcel ? ".xlsx" : ".csv")
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Monthly Invoices & Quotations Summary</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label>
          Month:
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={includeQuotations} onChange={(e) => setIncludeQuotations(e.target.checked)} /> Quotations
        </label>
        <label>
          <input type="checkbox" checked={includeInvoices} onChange={(e) => setIncludeInvoices(e.target.checked)} /> Invoices
        </label>
        <label>
          <input type="checkbox" checked={includeStock} onChange={(e) => setIncludeStock(e.target.checked)} /> Stock Movements
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => handleDownload(false)} disabled={loading}>Download CSV</button>
        <button onClick={() => handleDownload(true)} disabled={loading}>Download Excel</button>
      </div>
    </div>
  )
}
