"use client"

import { useEffect, useMemo, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { generateQuotationPdf, type TenantBranding } from "@/lib/stock-document-pdf"

interface Product {
  _id: string
  name: string
  sellingPrice: number
  categoryDetails?: { _id: string; name: string }
}

interface Client {
  name: string
  number: string
  location: string
}

interface QuotationItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface Quotation {
  _id: string
  quotationNumber: string
  status: "draft" | "converted" | "cancelled"
  client: Client
  items: QuotationItem[]
  subTotal: number
  convertedInvoiceId?: string
  createdAt: string
}

interface DraftItem {
  productId: string
  quantity: number
  unitPrice: number
}

export default function QuotationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [branding, setBranding] = useState<TenantBranding>({})

  const [showCreate, setShowCreate] = useState(false)
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null)

  const [clientName, setClientName] = useState("")
  const [clientNumber, setClientNumber] = useState("")
  const [clientLocation, setClientLocation] = useState("")
  const [selectedExistingClient, setSelectedExistingClient] = useState("")

  const [productSearch, setProductSearch] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemUnitPrice, setItemUnitPrice] = useState("")
  const [items, setItems] = useState<DraftItem[]>([])

  const [quotationSearchInput, setQuotationSearchInput] = useState("")
  const [quotationSearch, setQuotationSearch] = useState("")

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsRes, quotationsRes, clientsRes, brandingRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers }),
        fetch(`${API_URL}/api/stock/quotations`, { headers }),
        fetch(`${API_URL}/api/stock/clients`, { headers }),
        fetch(`${API_URL}/api/company/branding`, { headers }),
      ])
      const [productsJson, quotationsJson, clientsJson, brandingJson] = await Promise.all([
        productsRes.json(),
        quotationsRes.json(),
        clientsRes.json(),
        brandingRes.json(),
      ])

      setProducts(productsJson.data || [])
      setQuotations(quotationsJson.data || [])
      setClients(clientsJson.data || [])
      setBranding(brandingJson.data || {})
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

  const productSuggestions = products
    .filter((product) => {
      const query = productSearch.trim().toLowerCase()
      if (!query) return false
      return (
        product.name.toLowerCase().includes(query) ||
        (product.categoryDetails?.name || "").toLowerCase().includes(query)
      )
    })
    .slice(0, 8)

  const resetForm = () => {
    setClientName("")
    setClientNumber("")
    setClientLocation("")
    setSelectedExistingClient("")
    setProductSearch("")
    setItemQuantity("1")
    setItemUnitPrice("")
    setItems([])
    setEditingQuotationId(null)
    setShowCreate(false)
  }

  const selectExistingClient = (value: string) => {
    setSelectedExistingClient(value)
    if (!value) return
    const [name, number, location] = value.split("||")
    setClientName(name || "")
    setClientNumber(number || "")
    setClientLocation(location || "")
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

    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        quantity: Number(itemQuantity),
        unitPrice,
      },
    ])

    setProductSearch("")
    setItemQuantity("1")
    setItemUnitPrice("")
  }

  const createOrUpdateQuotation = async () => {
    if (!clientName || !clientNumber || !clientLocation || items.length === 0) {
      toast({ title: "Missing data", description: "Add client details and at least one item", variant: "destructive" })
      return
    }

    const endpoint = editingQuotationId
      ? `${API_URL}/api/stock/quotations/${editingQuotationId}`
      : `${API_URL}/api/stock/quotations`

    const method = editingQuotationId ? "PUT" : "POST"

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        clientName,
        clientNumber,
        clientLocation,
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
    setClientLocation(quotation.client.location)
    setSelectedExistingClient("")
    setItems(
      quotation.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    )
  }

  const convertToInvoice = async (quotationId: string) => {
    const response = await fetch(`${API_URL}/api/stock/quotations/${quotationId}/convert`, {
      method: "POST",
      headers,
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

  const downloadQuotationPdf = (quotation: Quotation) => {
    const currentUser = getUser()
    const preparedBy = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || "System User"

    generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      createdAt: quotation.createdAt,
      client: quotation.client,
      items: quotation.items,
      subTotal: quotation.subTotal,
      branding,
      preparedBy,
      watermarkText: quotation.status === "draft" ? "DRAFT" : quotation.status === "cancelled" ? "CANCELLED" : undefined,
    })
  }

  if (loading) return <div className="p-6">Loading quotations...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">View existing quotations or create a new one.</p>
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
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedExistingClient}
                  onChange={(event) => selectExistingClient(event.target.value)}
                >
                  <option value="">-- Select existing client --</option>
                  {clients.map((client) => {
                    const value = `${client.name}||${client.number}||${client.location}`
                    return (
                      <option key={value} value={value}>
                        {client.name} - {client.number} - {client.location}
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
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
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
                  <Label>Unit Price (optional override)</Label>
                  <Input type="number" min="0" value={itemUnitPrice} onChange={(event) => setItemUnitPrice(event.target.value)} />
                </div>
              </div>

              {productSearch.trim() && (
                <div className="border rounded-md divide-y">
                  {productSuggestions.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No matching products</div>
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
                      <th className="py-2 px-2">Unit Price</th>
                      <th className="py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const name = products.find((product) => product._id === item.productId)?.name || item.productId
                      return (
                        <tr key={`${item.productId}-${index}`} className="border-b">
                          <td className="py-2 px-2">{name}</td>
                          <td className="py-2 px-2">{item.quantity}</td>
                          <td className="py-2 px-2">{item.unitPrice}</td>
                          <td className="py-2 px-2">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={createOrUpdateQuotation}>{editingQuotationId ? "Update Quotation" : "Generate Quotation"}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
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
                    <td className="py-2 capitalize">{quotation.status}</td>
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
