"use client"

import { useEffect, useRef, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  isOutsourced?: boolean
}

interface StampOption {
  _id: string
  name: string
}

export default function EmployeeQuotationsPage() {
  const { toast } = useToast()
  const createFormRef = useRef<HTMLDivElement | null>(null)

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
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [selectedExistingClient, setSelectedExistingClient] = useState("")
  const [existingClientSearch, setExistingClientSearch] = useState("")

  const [productSearch, setProductSearch] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemSoldPrice, setItemSoldPrice] = useState("")
  const [items, setItems] = useState<DraftItem[]>([])

  const [quotationSearchInput, setQuotationSearchInput] = useState("")
  const [quotationSearch, setQuotationSearch] = useState("")

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
      quotation.client.location.toLowerCase().includes(query)
    )
  })

  const filteredClients = clients.filter((client) => {
    const query = existingClientSearch.trim().toLowerCase()
    if (!query) return true
    return (
      client.name.toLowerCase().includes(query) ||
      (client.contactPerson || "").toLowerCase().includes(query) ||
      client.location.toLowerCase().includes(query)
    )
  })

  const productSuggestions = products
    .filter((product) => {
      const query = productSearch.trim().toLowerCase()
      if (!query) return false
      return (
        product.name.toLowerCase().includes(query) ||
        (product.categoryDetails?.name || "").toLowerCase().includes(query)
      )
    })
    .filter((product) => Number(product.currentQuantity || 0) > 0)
    .slice(0, 8)

  const resetForm = () => {
    setClientName("")
    setClientNumber("")
    setClientContactPerson("")
    setSelectedExistingClient("")
    setExistingClientSearch("")
    setProductSearch("")
    setItemQuantity("1")
    setItemSoldPrice("")
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
      setClientContactPerson(client.contactPerson || "")
    } catch {
      setClientName("")
      setClientNumber("")
      setClientContactPerson("")
    }
  }

  const addItemFromSuggestion = (product: Product) => {
    if (Number(itemQuantity) <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than 0", variant: "destructive" })
      return
    }

    const referencePrice = Number(product.sellingPrice || 0)
    const soldPrice = itemSoldPrice ? Number(itemSoldPrice) : referencePrice

    if (!Number.isFinite(soldPrice) || soldPrice < referencePrice) {
      toast({
        title: "Invalid sold price",
        description: `Sold price cannot be below product price (${referencePrice})`,
        variant: "destructive",
      })
      return
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        productName: product.name,
        quantity: Number(itemQuantity),
        productUnitPrice: referencePrice,
        soldUnitPrice: soldPrice,
        unitPrice: soldPrice,
        isOutsourced: false,
      },
    ])

    setProductSearch("")
    setItemQuantity("1")
    setItemSoldPrice("")
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
          clientContactPerson: clientContactPerson || "",
          clientLocation: "N/A",
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
          : `Quotation ${result.data.quotationNumber} submitted for admin approval`,
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
    if (quotation.status !== "draft") {
      toast({ title: "Not editable", description: "Only draft quotations can be edited", variant: "destructive" })
      return
    }

    setShowCreate(true)
    setEditingQuotationId(quotation._id)
    setClientName(quotation.client.name)
    setClientNumber(quotation.client.number)
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

    window.requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
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
        }
      } catch {
      }
    }

    doc.save(`quotation-${quotation.quotationNumber}.pdf`)
  }

  if (loading) return <div className="p-6">Loading quotations...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Quotations</h1>
          <p className="text-sm text-muted-foreground">Create and manage your own quotations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={loadData}>Refresh</Button>
          <Button
            type="button"
            onClick={() => {
              if (showCreate) {
                resetForm()
                return
              }
              setEditingQuotationId(null)
              setShowCreate(true)
              window.requestAnimationFrame(() => {
                createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              })
            }}
          >
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
              placeholder="Quotation no, client name or location"
              value={quotationSearchInput}
              onChange={(event) => setQuotationSearchInput(event.target.value)}
            />
          </div>
          <Button variant="outline" type="button" onClick={() => setQuotationSearch(quotationSearchInput)}>Search</Button>
        </CardContent>
      </Card>

      {showCreate && (
        <div ref={createFormRef}>
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
                    placeholder="Search by client name or contact person"
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
                          {client.name}
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
                  <Label>Contact Person (optional)</Label>
                  <Input value={clientContactPerson} onChange={(event) => setClientContactPerson(event.target.value)} />
                </div>
                {!selectedExistingClient ? (
                  <div>
                    <Label>Client Phone Number</Label>
                    <Input value={clientNumber} onChange={(event) => setClientNumber(event.target.value)} placeholder="e.g. 07XXXXXXXX" />
                  </div>
                ) : (
                  <div className="rounded-md border p-3 text-xs text-muted-foreground">
                    Existing client selected. Phone number is kept private and will be used automatically.
                  </div>
                )}
              </div>

              <div className="rounded-md border p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Type Product Name</Label>
                    <Input placeholder="Start typing product name" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} />
                  </div>
                  <div>
                    <Label>Sold Price (optional)</Label>
                    <Input type="number" min="0" value={itemSoldPrice} onChange={(event) => setItemSoldPrice(event.target.value)} placeholder="Defaults to product price" />
                  </div>
                  <div className="flex items-end rounded-md border px-3 py-2 text-xs text-muted-foreground">
                    Choose a product from the list below.
                  </div>
                </div>

                {productSearch.trim() && (
                  <div className="border rounded-md divide-y">
                    {productSuggestions.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No matching products found.</div>
                    ) : (
                      productSuggestions.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-secondary text-sm"
                          onClick={() => addItemFromSuggestion(product)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-muted-foreground">Category: {product.categoryDetails?.name || "N/A"} | Price: {product.sellingPrice}</div>
                        </button>
                      ))
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
                        const referencePrice = item.productUnitPrice ?? item.unitPrice
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
                <Button type="button" onClick={createOrUpdateQuotation} disabled={savingQuotation}>
                  {savingQuotation ? "Saving..." : editingQuotationId ? "Update Quotation" : "Generate Quotation"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Quotation List</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Quotation No</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Items</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation._id} className="border-b">
                    <td className="py-2">{quotation.quotationNumber}</td>
                    <td className="py-2">{quotation.client.name}</td>
                    <td className="py-2">{quotation.items.length}</td>
                    <td className="py-2">{quotation.subTotal.toFixed(2)}</td>
                    <td className="py-2 capitalize">{quotation.status.replace("_", " ")}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {quotation.status === "draft" || quotation.status === "converted" ? (
                          <Button size="sm" variant="outline" onClick={() => downloadQuotationPdf(quotation)}>Download PDF</Button>
                        ) : (
                          <span className="text-muted-foreground text-xs self-center">Download available after approval</span>
                        )}
                        {quotation.status === "pending_approval" ? (
                          <span className="text-muted-foreground text-xs self-center">Pending approval</span>
                        ) : quotation.status === "draft" ? (
                          <span className="text-muted-foreground text-xs self-center">Approved by admin</span>
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
