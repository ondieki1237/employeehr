"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

interface DispatchWorkflowProps {
  invoiceId: string
  allowBackTo?: string
}

interface PackingItem {
  productId: string
  productName: string
  requiredQuantity: number
  packedQuantity: number
}

interface DispatchState {
  status: "not_assigned" | "assigned" | "packing" | "packed" | "dispatched" | "delivered"
  packingItems: PackingItem[]
  packingCompleted?: boolean
  transportMeans?: string
  dispatchedAt?: string
  dispatchedByUserId?: string
  courier?: {
    name: string
    contactName: string
    contactNumber: string
  }
  inquiries?: Array<{ mode: "client" | "courier"; method: "call"; note?: string; createdAt: string }>
  delivery?: {
    condition: "good" | "not_good"
    arrivalTime: string
    everythingPacked: boolean
    note?: string
  }
}

interface InvoiceData {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  client: { name: string; number: string; location: string }
  dispatch?: DispatchState
}

interface Courier {
  _id: string
  name: string
  contactName: string
  contactNumber: string
}

export function DispatchWorkflow({ invoiceId, allowBackTo }: DispatchWorkflowProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [packingItems, setPackingItems] = useState<PackingItem[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState("")
  const [transportMeans, setTransportMeans] = useState("")
  const [newCourier, setNewCourier] = useState({ name: "", contactName: "", contactNumber: "" })
  const [inquiryMode, setInquiryMode] = useState<"client" | "courier">("client")
  const [inquiryNote, setInquiryNote] = useState("")
  const [delivery, setDelivery] = useState({ condition: "good" as "good" | "not_good", arrivalTime: "", everythingPacked: true, note: "" })

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const dispatchStatus = invoice?.dispatch?.status || "not_assigned"
  const isPacked = invoice?.dispatch?.packingCompleted || false

  const load = async () => {
    try {
      setLoading(true)
      const [invoiceRes, courierRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/invoices/${invoiceId}`, { headers }),
        fetch(`${API_URL}/api/stock/couriers`, { headers }),
      ])
      const [invoiceJson, courierJson] = await Promise.all([invoiceRes.json(), courierRes.json()])
      if (!invoiceRes.ok) throw new Error(invoiceJson.message || "Failed to load invoice")

      setInvoice(invoiceJson.data)
      setPackingItems(invoiceJson.data?.dispatch?.packingItems || [])
      setCouriers(courierJson.data || [])
      setTransportMeans(invoiceJson.data?.dispatch?.transportMeans || "")
      if (invoiceJson.data?.dispatch?.courier?.name) {
        setNewCourier({
          name: invoiceJson.data.dispatch.courier.name,
          contactName: invoiceJson.data.dispatch.courier.contactName,
          contactNumber: invoiceJson.data.dispatch.courier.contactNumber,
        })
      }
    } catch (loadError: any) {
      setError(loadError.message || "Failed to load dispatch workflow")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [invoiceId])

  const savePacking = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/packing`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ items: packingItems.map((item) => ({ productId: item.productId, packedQuantity: item.packedQuantity })) }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to save packing")
      setInvoice(json.data)
      setPackingItems(json.data.dispatch?.packingItems || [])
      setSuccess("Packing progress saved")
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save packing")
    } finally {
      setSaving(false)
    }
  }

  const markDispatched = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      // Validate required fields
      if (!transportMeans || transportMeans.trim() === "") {
        setError("Transport means/courier type is required")
        setSaving(false)
        return
      }

      if (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber)) {
        setError("Either select a courier or fill in all new courier details")
        setSaving(false)
        return
      }

      const payload: any = { transportMeans: transportMeans.trim() }
      if (selectedCourierId) {
        payload.courierId = selectedCourierId
      } else {
        payload.courierName = newCourier.name.trim()
        payload.courierContactName = newCourier.contactName.trim()
        payload.courierContactNumber = newCourier.contactNumber.trim()
      }

      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/dispatch`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to mark dispatched")
      setInvoice(json.data)
      const smsMessage = json?.smsNotification?.message
      if (smsMessage) {
        setSuccess(`Invoice marked as dispatched. SMS: ${smsMessage}`)
      } else {
        setSuccess("Invoice marked as dispatched")
      }
    } catch (dispatchError: any) {
      setError(dispatchError.message || "Failed to mark dispatched")
    } finally {
      setSaving(false)
    }
  }

  const submitInquiry = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/inquiry`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: inquiryMode, note: inquiryNote }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to save inquiry")
      setInquiryNote("")
      setSuccess("Inquiry logged")
      await load()
    } catch (inquiryError: any) {
      setError(inquiryError.message || "Failed to log inquiry")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelivered = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/delivery`, {
        method: "POST",
        headers,
        body: JSON.stringify(delivery),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to confirm delivery")
      setInvoice(json.data)
      setSuccess("Package marked as delivered")
    } catch (deliveryError: any) {
      setError(deliveryError.message || "Failed to confirm delivery")
    } finally {
      setSaving(false)
    }
  }

  const sendClientSms = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/notify-client`, {
        method: "POST",
        headers,
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to send client SMS")
      const smsMessage = json?.smsNotification?.message || "Client SMS sent"
      setSuccess(`SMS: ${smsMessage}`)
    } catch (smsError: any) {
      setError(smsError.message || "Failed to send client SMS")
    } finally {
      setSaving(false)
    }
  }

  const statusColor = !invoice?.dispatch
    ? "bg-gray-100 text-gray-700"
    : invoice.dispatch.status === "delivered" || invoice.dispatch.status === "dispatched" || isPacked
      ? "bg-green-100 text-green-700"
      : invoice.dispatch.status === "packing"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700"

  if (loading) return <div className="p-4">Loading dispatch workflow...</div>
  if (!invoice) return <div className="p-4">Invoice not found.</div>

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {allowBackTo && (
        <Button variant="outline" onClick={() => (window.location.href = allowBackTo)}>
          Back
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Dispatch Workflow - {invoice.invoiceNumber}</span>
            <Badge className={statusColor}>{invoice.dispatch?.status || "not_assigned"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Client:</strong> {invoice.client.name}</p>
          <p><strong>Phone:</strong> {invoice.client.number}</p>
          <p><strong>Location:</strong> {invoice.client.location}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
            <div className={`flex items-center gap-2 ${dispatchStatus === "not_assigned" || dispatchStatus === "assigned" || dispatchStatus === "packing" || dispatchStatus === "packed" ? "text-blue-600" : "text-green-600"}`}>
              <span>1️⃣ Packing</span>
            </div>
            <div className={`flex items-center gap-2 ${dispatchStatus === "packed" || dispatchStatus === "dispatched" || dispatchStatus === "delivered" ? "text-blue-600" : "text-gray-400"}`}>
              <span>2️⃣ Dispatch</span>
            </div>
            <div className={`flex items-center gap-2 ${dispatchStatus === "dispatched" || dispatchStatus === "delivered" ? "text-blue-600" : "text-gray-400"}`}>
              <span>3️⃣ Inquiries</span>
            </div>
            <div className={`flex items-center gap-2 ${dispatchStatus === "delivered" ? "text-green-600" : "text-gray-400"}`}>
              <span>4️⃣ Delivery</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {success && (
        <Alert><AlertDescription>{success}</AlertDescription></Alert>
      )}

      {(dispatchStatus === "not_assigned" || dispatchStatus === "assigned" || dispatchStatus === "packing" || dispatchStatus === "packed") && (
        <Card>
          <CardHeader><CardTitle>Step 1: Packing Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {packingItems.map((item, index) => {
              const complete = Number(item.packedQuantity) >= Number(item.requiredQuantity)
              return (
                <div key={item.productId} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Required: {item.requiredQuantity}</p>
                    </div>
                    <Checkbox checked={complete} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Packed Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.requiredQuantity}
                        value={item.packedQuantity}
                        onChange={(event) => {
                          const next = Math.max(0, Number(event.target.value || 0))
                          setPackingItems((prev) => prev.map((entry, i) => i === index ? { ...entry, packedQuantity: next } : entry))
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium">
                      {item.packedQuantity}/{item.requiredQuantity} packed
                    </div>
                  </div>
                </div>
              )
            })}
            <Button onClick={savePacking} disabled={saving} className="w-full">
              {dispatchStatus === "packed" ? "Packaging Complete ✓" : "Save & Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {(dispatchStatus === "packed" || dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
        <Card>
          <CardHeader><CardTitle>Step 2: Record Dispatch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Courier Means / Transport</Label>
              <Input value={transportMeans} onChange={(event) => setTransportMeans(event.target.value)} placeholder="Motorbike, Van, Bus, etc" />
            </div>

            <div className="space-y-2">
              <Label>Select Existing Courier</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={selectedCourierId}
                onChange={(event) => setSelectedCourierId(event.target.value)}
                disabled={dispatchStatus !== "packed"}
              >
                <option value="">Use new courier details</option>
                {couriers.map((courier) => (
                  <option key={courier._id} value={courier._id}>{courier.name} - {courier.contactName}</option>
                ))}
              </select>
            </div>

            {!selectedCourierId && (
              <div className="grid grid-cols-1 gap-2">
                <Input placeholder="Courier name" value={newCourier.name} onChange={(event) => setNewCourier((prev) => ({ ...prev, name: event.target.value }))} disabled={dispatchStatus !== "packed"} />
                <Input placeholder="Contact person" value={newCourier.contactName} onChange={(event) => setNewCourier((prev) => ({ ...prev, contactName: event.target.value }))} disabled={dispatchStatus !== "packed"} />
                <Input placeholder="Contact number" value={newCourier.contactNumber} onChange={(event) => setNewCourier((prev) => ({ ...prev, contactNumber: event.target.value }))} disabled={dispatchStatus !== "packed"} />
              </div>
            )}

            {dispatchStatus === "packed" && (
              <div className="space-y-2">
                <Button 
                  onClick={markDispatched} 
                  disabled={saving || !transportMeans.trim() || (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber))} 
                  className="w-full"
                >
                  {saving ? "Processing..." : "Mark as Dispatched"}
                </Button>
                {(!transportMeans.trim() || (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber))) && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ Fill in transport means and courier details to continue
                  </p>
                )}
              </div>
            )}
            {dispatchStatus !== "packed" && dispatchStatus !== "delivered" && (
              <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                ✓ Dispatch recorded on {invoice.dispatch?.dispatchedAt ? new Date(invoice.dispatch.dispatchedAt).toLocaleString() : ""}
              </div>
            )}
            {(dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
              <Button variant="outline" onClick={sendClientSms} disabled={saving} className="w-full">
                {saving ? "Sending SMS..." : "Send / Retry Client SMS"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {(dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
        <Card>
          <CardHeader><CardTitle>Step 3: Dispatch Inquiries</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant={inquiryMode === "client" ? "default" : "outline"} onClick={() => setInquiryMode("client")} className="flex-1">Call Client</Button>
              <Button variant={inquiryMode === "courier" ? "default" : "outline"} onClick={() => setInquiryMode("courier")} className="flex-1">Call Courier</Button>
            </div>

            {inquiryMode === "client" ? (
              <a href={`tel:${invoice.client.number}`} className="text-sm underline text-blue-600">Prompt Call Client: {invoice.client.number}</a>
            ) : (
              <a href={`tel:${invoice.dispatch?.courier?.contactNumber || ""}`} className="text-sm underline text-blue-600">Prompt Call Courier: {invoice.dispatch?.courier?.contactNumber || "No courier number"}</a>
            )}

            <Input placeholder="Inquiry note" value={inquiryNote} onChange={(event) => setInquiryNote(event.target.value)} disabled={dispatchStatus === "delivered"} />
            <Button onClick={submitInquiry} disabled={saving || dispatchStatus === "delivered"} className="w-full">Log Inquiry</Button>

            <div className="space-y-2">
              {(invoice.dispatch?.inquiries || []).slice(-5).map((entry, idx) => (
                <div key={`inquiry_${idx}`} className="text-xs rounded border p-2">
                  <span className="font-semibold uppercase">{entry.mode}</span> - {entry.note || "No note"}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dispatchStatus === "dispatched" && (
        <Card>
          <CardHeader><CardTitle>Step 4: Delivery Confirmation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Condition on Arrival</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={delivery.condition}
                onChange={(event) => setDelivery((prev) => ({ ...prev, condition: event.target.value as "good" | "not_good" }))}
              >
                <option value="good">Good Condition</option>
                <option value="not_good">Not Good</option>
              </select>
            </div>

            <div>
              <Label>Arrival Time</Label>
              <Input type="datetime-local" value={delivery.arrivalTime} onChange={(event) => setDelivery((prev) => ({ ...prev, arrivalTime: event.target.value }))} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={delivery.everythingPacked} onCheckedChange={(checked) => setDelivery((prev) => ({ ...prev, everythingPacked: Boolean(checked) }))} />
              <span>Everything packed in?</span>
            </label>

            <Input placeholder="Delivery note" value={delivery.note} onChange={(event) => setDelivery((prev) => ({ ...prev, note: event.target.value }))} />
            <Button onClick={confirmDelivered} disabled={saving} className="w-full">Submit as Delivered ✓</Button>
          </CardContent>
        </Card>
      )}

      {dispatchStatus === "delivered" && (
        <Card>
          <CardHeader><CardTitle>✓ Delivery Confirmed</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Condition:</strong> {invoice.dispatch?.delivery?.condition === "good" ? "Good" : "Not Good"}</p>
            <p><strong>Arrival Time:</strong> {invoice.dispatch?.delivery?.arrivalTime ? new Date(invoice.dispatch.delivery.arrivalTime).toLocaleString() : ""}</p>
            <p><strong>Note:</strong> {invoice.dispatch?.delivery?.note || "—"}</p>
            <Button variant="outline" className="w-full" onClick={() => (window.location.href = allowBackTo || "/employee/dispatch")}>Back to Queue</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
