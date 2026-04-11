"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface ClientProfile {
  _id: string
  legalName: string
  kraPin: string
  email?: string
  branchId?: string
  hasKraDetails: boolean
}

interface PostInvoice {
  _id: string
  invoiceNumber: string
  createdAt: string
  subTotal: number
  client: { name: string; number: string; location: string }
  etimsStatus: "not_posted" | "posted" | "failed"
  etims?: {
    kraInvoiceId?: string
    responseMessage?: string
  }
  clientProfile: ClientProfile | null
  hasKraSaved: boolean
}

interface ClientForm {
  legalName: string
  kraPin: string
  email: string
  branchId: string
}

const EMPTY_FORM: ClientForm = {
  legalName: "",
  kraPin: "",
  email: "",
  branchId: "",
}

export default function AccountsPostsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [invoices, setInvoices] = useState<PostInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)
  const [search, setSearch] = useState("")

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await stockApi.getAccountsPosts()
      const rows = response.data || []
      setInvoices(rows)

      if (!selectedInvoiceId && rows.length > 0) {
        setSelectedInvoiceId(rows[0]._id)
      }
    } catch (error: any) {
      window.alert(error?.message || "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices

    return invoices.filter((row) =>
      [
        row.invoiceNumber,
        row.client?.name,
        row.client?.number,
        row.client?.location,
        row.clientProfile?.legalName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [invoices, search])

  const selectedInvoice = useMemo(
    () => invoices.find((row) => row._id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  )

  useEffect(() => {
    if (!selectedInvoice) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      legalName: selectedInvoice.clientProfile?.legalName || selectedInvoice.client.name || "",
      kraPin: selectedInvoice.clientProfile?.kraPin || "",
      email: selectedInvoice.clientProfile?.email || "",
      branchId: selectedInvoice.clientProfile?.branchId || "",
    })
  }, [selectedInvoiceId, selectedInvoice])

  const saveClientProfile = async () => {
    if (!selectedInvoice) return
    if (!form.legalName.trim() || !form.kraPin.trim()) {
      window.alert("Legal name and KRA PIN are required")
      return
    }

    try {
      setSaving(true)
      await stockApi.saveInvoiceClientProfile(selectedInvoice._id, {
        legalName: form.legalName.trim(),
        kraPin: form.kraPin.trim().toUpperCase(),
        email: form.email.trim() || undefined,
        branchId: form.branchId.trim() || undefined,
      })
      await loadData()
      window.alert("Client details saved")
    } catch (error: any) {
      window.alert(error?.message || "Failed to save client details")
    } finally {
      setSaving(false)
    }
  }

  const postToEtims = async () => {
    if (!selectedInvoice) return

    try {
      setPosting(true)
      const response = await stockApi.postInvoiceToEtims(selectedInvoice._id)
      await loadData()
      window.alert(response.message || "Sale posted to eTIMS")
    } catch (error: any) {
      window.alert(error?.message || "Failed to post sale to eTIMS")
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className="p-6">Loading posts...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounts · Posts</h1>
        <p className="text-sm text-muted-foreground">
          Click a client, save legal/KRA details, then manually post selected sales to eTIMS.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Posts Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search by invoice, client, number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-[520px] overflow-auto space-y-2">
              {filteredInvoices.map((row) => (
                <button
                  key={row._id}
                  onClick={() => setSelectedInvoiceId(row._id)}
                  className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                    selectedInvoiceId === row._id ? "border-primary bg-muted/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{row.invoiceNumber}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.hasKraSaved ? "default" : "secondary"}>
                        {row.hasKraSaved ? "KRA Saved" : "KRA Missing"}
                      </Badge>
                      <Badge variant={row.etimsStatus === "posted" ? "default" : "outline"}>
                        {row.etimsStatus === "posted" ? "Posted" : "Not Posted"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm mt-1">{row.client.name}</div>
                  <div className="text-xs text-muted-foreground">{row.client.number} · {row.client.location}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client KRA Details & Posting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedInvoice ? (
              <p className="text-sm text-muted-foreground">Select an invoice/client to continue.</p>
            ) : (
              <>
                <div className="rounded border p-3 bg-muted/30">
                  <p className="text-sm font-medium">Invoice: {selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm">Client: {selectedInvoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedInvoice.client.number} · {selectedInvoice.client.location}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Legal Name</Label>
                    <Input
                      value={form.legalName}
                      onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
                      placeholder="Registered legal name"
                    />
                  </div>
                  <div>
                    <Label>KRA PIN</Label>
                    <Input
                      value={form.kraPin}
                      onChange={(event) => setForm((prev) => ({ ...prev, kraPin: event.target.value.toUpperCase() }))}
                      placeholder="A123456789B"
                    />
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="client@email.com"
                    />
                  </div>
                  <div>
                    <Label>Branch ID (optional)</Label>
                    <Input
                      value={form.branchId}
                      onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
                      placeholder="001"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveClientProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Client Details"}
                  </Button>
                  {selectedInvoice.etimsStatus !== "posted" ? (
                    <Button
                      variant="outline"
                      onClick={postToEtims}
                      disabled={posting || !selectedInvoice.hasKraSaved}
                    >
                      {posting ? "Posting..." : "Post Sale to eTIMS"}
                    </Button>
                  ) : (
                    <Badge className="h-10 px-3 flex items-center">Already Posted to eTIMS</Badge>
                  )}
                </div>

                {!selectedInvoice.hasKraSaved && (
                  <p className="text-xs text-amber-700">
                    Save legal name and KRA PIN first before posting to eTIMS.
                  </p>
                )}

                {selectedInvoice.etims?.kraInvoiceId && (
                  <p className="text-sm text-green-700 font-medium">
                    KRA Invoice ID: {selectedInvoice.etims.kraInvoiceId}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
