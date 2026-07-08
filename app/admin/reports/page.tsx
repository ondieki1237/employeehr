"use client"

import React, { useState } from "react"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AdminReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [includeQuotations, setIncludeQuotations] = useState(true)
  const [includeInvoices, setIncludeInvoices] = useState(true)
  const [includeStock, setIncludeStock] = useState(true)
  const [loading, setLoading] = useState(false)

  const buildQuery = () => {
    const [year, mon] = month.split("-")
    const start = new Date(Number(year), Number(mon) - 1, 1).toISOString()
    const end = new Date(Number(year), Number(mon), 1).toISOString()
    const includeParts: string[] = []
    if (includeQuotations) includeParts.push("quotations")
    if (includeInvoices) includeParts.push("invoices")
    if (includeStock) includeParts.push("stock")

    const params = new URLSearchParams()
    params.set("startDate", start)
    params.set("endDate", end)
    params.set("include", includeParts.join(","))
    return params.toString()
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const query = buildQuery()
      const url = `${API_URL}/api/reports/admin/monthly-invoice-summary/download?${query}`
      const token = getToken()
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Download failed (${response.status})`)
      }

      const blob = await response.blob()
      const filename = `monthly-summary-${month}.csv`
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(objectUrl)
      a.remove()
    } catch (error) {
      console.error("Download error:", error)
      window.alert(error instanceof Error ? error.message : "Download failed")
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (monthString: string) => {
    const [year, month] = monthString.split("-")
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Monthly Invoice Summary</h1>
        <p className="text-gray-600 mt-2">
          Choose a month and the record types you want included in the export.
        </p>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>Pick the month and data groups before downloading the summary CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Select Month</p>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="text-sm text-gray-500">
              Viewing: <span className="font-semibold text-gray-700">{getMonthName(month)}</span>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Data Types to Include</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition">
                <input
                  type="checkbox"
                  checked={includeQuotations}
                  onChange={(e) => setIncludeQuotations(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Quotations</p>
                  <p className="text-xs text-gray-500">Include sales quotation entries.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 transition">
                <input
                  type="checkbox"
                  checked={includeInvoices}
                  onChange={(e) => setIncludeInvoices(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Invoices</p>
                  <p className="text-xs text-gray-500">Include invoice entries.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition">
                <input
                  type="checkbox"
                  checked={includeStock}
                  onChange={(e) => setIncludeStock(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Stock Movements</p>
                  <p className="text-xs text-gray-500">Include inventory movement records.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Selected Data Types</p>
            <div className="flex flex-wrap gap-2">
              {includeQuotations && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border border-blue-300">
                  Quotations
                </Badge>
              )}
              {includeInvoices && (
                <Badge variant="default" className="bg-green-100 text-green-800 border border-green-300">
                  Invoices
                </Badge>
              )}
              {includeStock && (
                <Badge variant="default" className="bg-purple-100 text-purple-800 border border-purple-300">
                  Stock Movements
                </Badge>
              )}
              {!includeQuotations && !includeInvoices && !includeStock && (
                <span className="text-sm text-gray-500 italic">No data types selected</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-gray-200">
            <Button
              onClick={handleDownload}
              disabled={loading || (!includeQuotations && !includeInvoices && !includeStock)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Download CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700">
            Reports are generated based on the selected month and filters. The export includes quotation, invoice, and stock movement references only.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
