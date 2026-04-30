"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  applyStampToPdf,
  generateQuotationPdf,
  type InvoiceDocumentSettings,
  type TenantBranding,
} from "@/lib/stock-document-pdf"

interface Product {
  _id: string
  name: string
  sellingPrice: number
  currentQuantity: number
  isOutsourced?: boolean
  categoryDetails?: { _id: string; name: string }
}

interface Client {
  name: string
  number: string
  location: string
  contactPerson?: string
}

interface QuotationItem {
  productId: string
  productName: string
  quantity: number
  productUnitPrice?: number
  soldUnitPrice?: number
  unitPrice: number
  lineTotal: number
  taxRate?: number
  totalAfterTax?: number
  isOutsourced?: boolean
}

interface Quotation {
  _id: string
  quotationNumber: string
  status: "draft" | "pending_approval" | "converted" | "cancelled"
  client: Client
  items: QuotationItem[]
  subTotal: number
  createdBy: string
  createdByName?: string
  convertedInvoiceId?: string
  createdAt: string
}

interface DraftItem {
  productId?: string
  productName?: string
  quantity: number
  productUnitPrice?: number
  soldUnitPrice?: number
  unitPrice: number
  taxRate?: number
  isOutsourced?: boolean
}

interface StampOption {
  _id: string
  name: string
}

export default function QuotationsPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [branding, setBranding] = useState<TenantBranding>({})
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceDocumentSettings>({})

  const [showCreate, setShowCreate] = useState(false)
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null)
  const [savingQuotation, setSavingQuotation] = useState(false)

  const [clientName, setClientName] = useState("")
  const [clientNumber, setClientNumber] = useState("")
  const [clientLocation, setClientLocation] = useState("")
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [selectedExistingClient, setSelectedExistingClient] = useState("")
  const [existingClientSearch, setExistingClientSearch] = useState("")

  const [productSearch, setProductSearch] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemUnitPrice, setItemUnitPrice] = useState("")
  const [itemTaxRate, setItemTaxRate] = useState("0")
  const [itemOutsourced, setItemOutsourced] = useState(false)
  const [items, setItems] = useState<DraftItem[]>([])

  const [quotationSearchInput, setQuotationSearchInput] = useState("")
  const [quotationSearch, setQuotationSearch] = useState("")

  useEffect(() => {
    const q = searchParams.get("q") || ""
    if (!q) return
    setQuotationSearchInput(q)
    setQuotationSearch(q)
  }, [searchParams])

  const getAuthHeaders = () => {
    const token = getToken()
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsRes, quotationsRes, clientsRes, brandingRes, invoiceSettingsRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/quotations`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/clients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/company/branding`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/company/invoice-settings`, { headers: getAuthHeaders() }),
      ])
      const [productsJson, quotationsJson, clientsJson, brandingJson, invoiceSettingsJson] = await Promise.all([
        productsRes.json(),
        quotationsRes.json(),
        clientsRes.json(),
        brandingRes.json(),
        invoiceSettingsRes.json(),
      ])

      setProducts(productsJson.data || [])
      setQuotations(quotationsJson.data || [])
      setClients(clientsJson.data || [])
      setBranding(brandingJson.data || {})
      setInvoiceSettings(invoiceSettingsJson.data || {})
    } catch {
      toast({ title: "Error", description: "Failed to load quotations", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredQuotations = quotations.filter((quotation) => {
    const query = quotationSearch.trim().toLowerCase()
    if (!query) return true
    return (
      quotation.quotationNumber.toLowerCase().includes(query) ||
      quotation.client.name.toLowerCase().includes(query) ||
      quotation.client.number.toLowerCase().includes(query) ||
      quotation.client.location.toLowerCase().includes(query)
    )
  })

  const pendingApprovalQuotations = filteredQuotations.filter((quotation) => quotation.status === "pending_approval")
  const activeQuotations = filteredQuotations.filter((quotation) => quotation.status !== "pending_approval")

  const filteredClients = clients.filter((client) => {
    const query = existingClientSearch.trim().toLowerCase()
    if (!query) return true
    return (
      client.name.toLowerCase().includes(query) ||
      client.location.toLowerCase().includes(query) ||
      client.number.toLowerCase().includes(query) ||
      (client.contactPerson || "").toLowerCase().includes(query)
    )
  })

  const matchingProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return false
    return (
      product.name.toLowerCase().includes(query) ||
      (product.categoryDetails?.name || "").toLowerCase().includes(query)
    )
  })

  const outOfStockHiddenCount = matchingProducts.filter((product) => Number(product.currentQuantity || 0) <= 0).length

  const productSuggestions = matchingProducts
    .filter((product) => Number(product.currentQuantity || 0) > 0)
    .slice(0, 8)

  const resetForm = () => {
    setClientName("")
    setClientNumber("")
    setClientLocation("")
    setClientContactPerson("")
    setSelectedExistingClient("")
    setExistingClientSearch("")
    setProductSearch("")
    setItemQuantity("1")
    setItemUnitPrice("")
    setItemTaxRate("0")
    setItemOutsourced(false)
    setItems([])
    setEditingQuotationId(null)
    setShowCreate(false)
  }

  const selectExistingClient = (value: string) => {
    setSelectedExistingClient(value)
    if (!value) return
    try {
      const client = JSON.parse(value) as Client
      setClientName(client.name || "")
      setClientNumber(client.number || "")
      setClientLocation(client.location || "")
      setClientContactPerson(client.contactPerson || "")
    } catch {
      setClientName("")
      setClientNumber("")
      setClientLocation("")
      setClientContactPerson("")
    }
  }

  const addItemFromSuggestion = (product: Product) => {
    if (Number(itemQuantity) <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than 0", variant: "destructive" })
      return
    }

    const unitPrice = itemUnitPrice ? Number(itemUnitPrice) : Number(product.sellingPrice || 0)
    if (unitPrice < 0) {
      toast({ title: "Invalid price", description: "Price cannot be negative", variant: "destructive" })
      return
    }

    const minimumPrice = Number(product.sellingPrice || 0)
    if (unitPrice < minimumPrice) {
      toast({ title: "Invalid sold price", description: `Sold price cannot be below minimum selling price (${minimumPrice})`, variant: "destructive" })
      return
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        quantity: Number(itemQuantity),
        productName: product.name,
        productUnitPrice: Number(product.sellingPrice || 0),
        soldUnitPrice: unitPrice,
        unitPrice,
        isOutsourced: itemOutsourced,
      },
    ])

    setProductSearch("")
    setItemQuantity("1")
    setItemUnitPrice("")
    setItemOutsourced(false)
  }

  const addOutsourcedItem = () => {
    const productName = productSearch.trim()
    if (!productName) {
      toast({ title: "Missing product name", description: "Type the outsourced product name", variant: "destructive" })
      return
    }

    if (Number(itemQuantity) <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than 0", variant: "destructive" })
      return
    }

    const unitPrice = Number(itemUnitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast({ title: "Invalid price", description: "Provide a valid unit price for outsourced item", variant: "destructive" })
      return
    }

    const fallbackId = `outsourced:${productName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
    setItems((prev) => [
      ...prev,
      {
        productId: fallbackId,
        productName,
        quantity: Number(itemQuantity),
        productUnitPrice: unitPrice,
        soldUnitPrice: unitPrice,
        unitPrice,
        isOutsourced: true,
      },
    ])

    setProductSearch("")
    setItemQuantity("1")
    setItemUnitPrice("")
    setItemOutsourced(false)
  }

  const removeDraftItem = (index: number) => {
    setItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const updateDraftItemSoldPrice = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) return item

        const minimumPrice = Number(item.productUnitPrice ?? item.unitPrice ?? 0)
        const nextSoldPrice = parsed < minimumPrice ? minimumPrice : parsed

        return {
          ...item,
          soldUnitPrice: nextSoldPrice,
          unitPrice: nextSoldPrice,
        }
      }),
    )
  }

  const createOrUpdateQuotation = async () => {
    if (!clientName || !clientNumber || items.length === 0) {
      toast({ title: "Missing data", description: "Add client name, phone number and at least one item", variant: "destructive" })
      return
    }

    try {
      setSavingQuotation(true)

      const endpoint = editingQuotationId
        ? `${API_URL}/api/stock/quotations/${editingQuotationId}`
        : `${API_URL}/api/stock/quotations`

      const method = editingQuotationId ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientName,
          clientNumber,
          clientLocation: clientLocation || "N/A",
          clientContactPerson: clientContactPerson || "",
          items,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        toast({ title: "Error", description: result.message || "Failed to save quotation", variant: "destructive" })
        return
      }

      toast({
        title: "Success",
        description: editingQuotationId
          ? `Quotation ${result.data.quotationNumber} updated`
          : `Quotation ${result.data.quotationNumber} created`,
      })

      resetForm()
      loadData()
    } catch (error) {
      console.error("Failed to save quotation:", error)
      toast({ title: "Error", description: "Failed to save quotation", variant: "destructive" })
    } finally {
      setSavingQuotation(false)
    }
  }

  const startEditQuotation = (quotation: Quotation) => {
    if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
      toast({ title: "Not editable", description: "Only draft or pending quotations can be edited", variant: "destructive" })
      return
    }

    setShowCreate(true)
    setEditingQuotationId(quotation._id)
    setClientName(quotation.client.name)
    setClientNumber(quotation.client.number)
    setClientLocation(quotation.client.location)
    setClientContactPerson(quotation.client.contactPerson || "")
    setSelectedExistingClient("")
    setItems(
      quotation.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        productUnitPrice: item.productUnitPrice ?? item.unitPrice,
        soldUnitPrice: item.soldUnitPrice ?? item.unitPrice,
        unitPrice: item.unitPrice,
        isOutsourced: Boolean(item.isOutsourced),
      })),
    )
  }

  const approveQuotation = async (quotationId: string) => {
    const response = await fetch(`${API_URL}/api/stock/quotations/${quotationId}/approve`, {
      method: "POST",
      headers: getAuthHeaders(),
    })

    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Error", description: result.message || "Failed to approve quotation", variant: "destructive" })
      return
    }

    toast({ title: "Approved", description: "Quotation moved to active quotations" })
    loadData()
  }

  const rejectQuotation = async (quotationId: string) => {
    const response = await fetch(`${API_URL}/api/stock/quotations/${quotationId}/reject`, {
      method: "POST",
      headers: getAuthHeaders(),
    })

    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Error", description: result.message || "Failed to reject quotation", variant: "destructive" })
      return
    }

    toast({ title: "Rejected", description: "Quotation has been rejected" })
    loadData()
  }

  const convertToInvoice = async (quotationId: string) => {
    const response = await fetch(`${API_URL}/api/stock/quotations/${quotationId}/convert`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Error", description: result.message || "Failed to convert quotation", variant: "destructive" })
      return
    }

    toast({
      title: "Converted",
      description: `Invoice ${result.data.invoiceNumber} created with Delivery Note ${result.data.deliveryNoteNumber}`,
    })
    loadData()
  }

  const promptStampSelection = async (): Promise<{ stampId: string; date: string } | null> => {
    const addStamp = window.confirm("Add a stamp to this PDF?")
    if (!addStamp) return null

    const defaultDate = new Date().toLocaleDateString("en-GB")
    const selectedDate = window.prompt("Enter stamp date (DD/MM/YYYY)", defaultDate)
    if (selectedDate === null) return null

    const stampsRes = await fetch(`${API_URL}/api/stamps`, { headers: getAuthHeaders() })
    const stampsJson = await stampsRes.json()
    const stamps: StampOption[] = stampsJson.data || stampsJson || []

    if (!stamps.length) {
      toast({ title: "No stamps", description: "Create a stamp first in System > Stamps", variant: "destructive" })
      return null
    }

    const stampList = stamps.map((stamp, index) => `${index + 1}. ${stamp.name}`).join("\n")
    const selected = window.prompt(`Select stamp number:\n${stampList}`, "1")
    if (!selected) return null

    const index = Number(selected) - 1
    if (Number.isNaN(index) || index < 0 || index >= stamps.length) {
      toast({ title: "Invalid stamp", description: "Please choose a valid stamp number", variant: "destructive" })
      return null
    }

    return { stampId: stamps[index]._id, date: selectedDate || defaultDate }
  }

  const downloadQuotationPdf = async (quotation: Quotation) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"

    const stampSelection = await promptStampSelection()

    const doc = generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      createdAt: quotation.createdAt,
      client: quotation.client,
      items: quotation.items,
      subTotal: quotation.subTotal,
      branding,
      invoiceSettings,
      preparedBy,
      watermarkText: quotation.status === "draft" ? "DRAFT" : quotation.status === "cancelled" ? "CANCELLED" : undefined,
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
        const stampRes = await fetch(`${API_URL}/api/stamps/${stampSelection.stampId}/svg?${query}`, { headers: getAuthHeaders() })
        if (stampRes.ok) {
          const stampSvg = await stampRes.text()
          await applyStampToPdf(doc, stampSvg, 140, 255, 55, 33)
        } else {
          const errorText = await stampRes.text()
          toast({ title: "Stamp skipped", description: errorText || "Failed to load selected stamp", variant: "destructive" })
        }
      } catch {
        toast({ title: "Stamp skipped", description: "Failed to apply stamp, downloading PDF without stamp", variant: "destructive" })
      }
    }

    doc.save(`quotation-${quotation.quotationNumber}.pdf`)
  }

  if (loading) return <div className="p-6">Loading quotations...</div>

  const currentUser = getUser()
  const canApprove = ["company_admin", "hr"].includes(String(currentUser?.role || ""))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">View existing quotations or create a new one.</p>
          {pendingApprovalQuotations.length > 0 ? (
            <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              Pending Requests: {pendingApprovalQuotations.length}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()}>Refresh</Button>
          <Button onClick={() => (showCreate ? resetForm() : setShowCreate(true))}>
            {showCreate ? "Close" : "Create Quotation"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Search Quotations</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-md">
            <Label>Search</Label>
            <Input
              placeholder="Quotation no, client name, number or location"
              value={quotationSearchInput}
              onChange={(event) => setQuotationSearchInput(event.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setQuotationSearch(quotationSearchInput)}>Search</Button>
        </CardContent>
      </Card>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>{editingQuotationId ? "Edit Quotation" : "Create Quotation"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Use Existing Client</Label>
                <Input
                  className="mb-2"
                  placeholder="Search client by name, location, number or contact person"
                  value={existingClientSearch}
                  onChange={(event) => setExistingClientSearch(event.target.value)}
                />
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedExistingClient}
                  onChange={(event) => selectExistingClient(event.target.value)}
                >
                  <option value="">-- Select existing client --</option>
                  {filteredClients.map((client) => {
                    const value = JSON.stringify(client)
                    return (
                      <option key={value} value={value}>
                        {client.name} - {client.location}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Client Name</Label>
                <Input value={clientName} onChange={(event) => setClientName(event.target.value)} />
              </div>
              <div>
                <Label>Client Number</Label>
                <Input value={clientNumber} onChange={(event) => setClientNumber(event.target.value)} />
              </div>
              <div>
                <Label>Client Location</Label>
                <Input value={clientLocation} onChange={(event) => setClientLocation(event.target.value)} />
              </div>
              <div>
                <Label>Contact Person (optional)</Label>
                <Input value={clientContactPerson} onChange={(event) => setClientContactPerson(event.target.value)} />
              </div>
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Type Product Name</Label>
                  <Input
                    placeholder="Start typing product name"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} />
                </div>
                <div>
                  <Label>Sold Price (optional override)</Label>
                  <Input type="number" min="0" value={itemUnitPrice} onChange={(event) => setItemUnitPrice(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm border rounded-md px-3 py-2 w-full h-10">
                    <Checkbox checked={itemOutsourced} onCheckedChange={(value) => setItemOutsourced(Boolean(value))} />
                    <span>Outsourced (local)</span>
                  </label>
                </div>
              </div>

              {productSearch.trim() && (
                <div className="border rounded-md divide-y">
                  {productSuggestions.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground space-y-2">
                      <p>No matching products</p>
                      {itemOutsourced ? (
                        <Button type="button" size="sm" onClick={addOutsourcedItem}>Add outsourced item "{productSearch.trim()}"</Button>
                      ) : (
                        <p className="text-xs">Tick "Outsourced (local)" to add a product that is not in inventory.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {productSuggestions.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-secondary text-sm"
                          onClick={() => addItemFromSuggestion(product)}
                        >
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.isOutsourced ? <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Outsourced</span> : null}
                          </div>
                          <div className="text-muted-foreground">
                            Category: {product.categoryDetails?.name || "N/A"} | Product Price: {product.sellingPrice} | In stock: {product.currentQuantity}
                          </div>
                        </button>
                      ))}
                      {outOfStockHiddenCount > 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">{outOfStockHiddenCount} out-of-stock product(s) hidden from selectable list.</div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 px-2">Product</th>
                      <th className="py-2 px-2">Qty</th>
                      <th className="py-2 px-2">Product Price</th>
                      <th className="py-2 px-2">Sold Price (Editable)</th>
                      <th className="py-2 px-2">Outsourced</th>
                      <th className="py-2 px-2">Total</th>
                      <th className="py-2 px-2">Drop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const name = item.productName || products.find((product) => product._id === item.productId)?.name || item.productId
                      const referencePrice = item.productUnitPrice ?? products.find((product) => product._id === item.productId)?.sellingPrice ?? item.unitPrice
                      const soldPrice = item.soldUnitPrice ?? item.unitPrice
                      return (
                        <tr key={`${item.productId}-${index}`} className="border-b">
                          <td className="py-2 px-2">{name}</td>
                          <td className="py-2 px-2">{item.quantity}</td>
                          <td className="py-2 px-2">{referencePrice}</td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min={Number(referencePrice || 0)}
                              value={soldPrice}
                              onChange={(event) => updateDraftItemSoldPrice(index, event.target.value)}
                              className="h-8"
                            />
                            <div className="mt-1 text-[10px] text-muted-foreground">Min: {referencePrice}</div>
                          </td>
                          <td className="py-2 px-2">{item.isOutsourced ? "Yes" : "No"}</td>
                          <td className="py-2 px-2">{(item.quantity * soldPrice).toFixed(2)}</td>
                          <td className="py-2 px-2">
                            <Button size="sm" type="button" variant="destructive" onClick={() => removeDraftItem(index)}>
                              Drop
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={createOrUpdateQuotation} disabled={savingQuotation}>
                {savingQuotation ? "Saving..." : editingQuotationId ? "Update Quotation" : "Generate Quotation"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Requests
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pendingApprovalQuotations.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovalQuotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending approvals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Quotation No</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Owner</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovalQuotations.map((quotation) => (
                    <tr key={quotation._id} className="border-b">
                      <td className="py-2">{quotation.quotationNumber}</td>
                      <td className="py-2">{quotation.client.name}</td>
                      <td className="py-2">{quotation.createdByName || quotation.createdBy}</td>
                      <td className="py-2">{quotation.subTotal.toFixed(2)}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadQuotationPdf(quotation)}>Download PDF</Button>
                          <Button size="sm" variant="outline" onClick={() => startEditQuotation(quotation)}>Edit</Button>
                          {canApprove ? (
                            <>
                              <Button size="sm" onClick={() => approveQuotation(quotation._id)}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectQuotation(quotation._id)}>Reject</Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs self-center">Awaiting admin approval</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quotation List</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Quotation No</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Owner</th>
                  <th className="py-2">Items</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeQuotations.map((quotation) => (
                  <tr key={quotation._id} className="border-b">
                    <td className="py-2">{quotation.quotationNumber}</td>
                    <td className="py-2">{quotation.client.name}</td>
                    <td className="py-2">{quotation.createdByName || quotation.createdBy}</td>
                    <td className="py-2">{quotation.items.length}</td>
                    <td className="py-2">{quotation.subTotal.toFixed(2)}</td>
                    <td className="py-2 capitalize">{quotation.status.replace("_", " ")}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadQuotationPdf(quotation)}>Download PDF</Button>
                        {quotation.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => startEditQuotation(quotation)}>Edit</Button>
                        )}
                        {quotation.status === "draft" ? (
                          <Button size="sm" onClick={() => convertToInvoice(quotation._id)}>Convert to Invoice</Button>
                        ) : (
                          <span className="text-muted-foreground text-xs self-center">Converted</span>
                        )}
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
