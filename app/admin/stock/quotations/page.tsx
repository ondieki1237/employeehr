"use client"

import { useEffect, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Product {
  _id: string
  name: string
  sellingPrice: number
  categoryDetails?: { _id: string; name: string }
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
  client: { name: string; number: string; location: string }
  items: QuotationItem[]
  subTotal: number
  convertedInvoiceId?: string
  createdAt: string
}

export default function QuotationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const [clientName, setClientName] = useState("")
  const [clientNumber, setClientNumber] = useState("")
  const [clientLocation, setClientLocation] = useState("")

  const [itemProductId, setItemProductId] = useState("")
  const [itemQuantity, setItemQuantity] = useState("1")
  const [itemUnitPrice, setItemUnitPrice] = useState("")
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([])

  const [productSearchInput, setProductSearchInput] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [quotationSearchInput, setQuotationSearchInput] = useState("")
  const [quotationSearch, setQuotationSearch] = useState("")

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const selectedProduct = products.find((product) => product._id === itemProductId)

  useEffect(() => {
    if (selectedProduct && !itemUnitPrice) {
      setItemUnitPrice(String(selectedProduct.sellingPrice || 0))
    }
  }, [selectedProduct?._id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsRes, quotationsRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers }),
        fetch(`${API_URL}/api/stock/quotations`, { headers }),
      ])
      const [productsJson, quotationsJson] = await Promise.all([productsRes.json(), quotationsRes.json()])
      setProducts(productsJson.data || [])
      setQuotations(quotationsJson.data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load quotations", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return true
    return (
      product.name.toLowerCase().includes(query) ||
      (product.categoryDetails?.name || "").toLowerCase().includes(query)
    )
  })

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

  const addItem = () => {
    if (!itemProductId || Number(itemQuantity) <= 0 || Number(itemUnitPrice) < 0) {
      toast({ title: "Invalid item", description: "Select product and valid quantity/price", variant: "destructive" })
      return
    }

    setItems((prev) => [
      ...prev,
      {
        productId: itemProductId,
        quantity: Number(itemQuantity),
        unitPrice: Number(itemUnitPrice),
      },
    ])

    setItemProductId("")
    setItemQuantity("1")
    setItemUnitPrice("")
  }

  const createQuotation = async () => {
    if (!clientName || !clientNumber || !clientLocation || items.length === 0) {
      toast({ title: "Missing data", description: "Add client details and at least one item", variant: "destructive" })
      return
    }

    const response = await fetch(`${API_URL}/api/stock/quotations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ clientName, clientNumber, clientLocation, items }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Error", description: result.message || "Failed to create quotation", variant: "destructive" })
      return
    }

    toast({ title: "Success", description: `Quotation ${result.data.quotationNumber} created` })
    setClientName("")
    setClientNumber("")
    setClientLocation("")
    setItems([])
    setShowCreate(false)
    loadData()
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
    const doc = new jsPDF()
    let y = 15

    doc.setFontSize(16)
    doc.text("Quotation", 14, y)
    y += 8

    doc.setFontSize(11)
    doc.text(`Quotation No: ${quotation.quotationNumber}`, 14, y)
    y += 6
    doc.text(`Date: ${new Date(quotation.createdAt).toLocaleString()}`, 14, y)
    y += 8

    doc.text(`Client: ${quotation.client.name}`, 14, y)
    y += 6
    doc.text(`Number: ${quotation.client.number}`, 14, y)
    y += 6
    doc.text(`Location: ${quotation.client.location}`, 14, y)
    y += 10

    doc.text("Items:", 14, y)
    y += 6
    quotation.items.forEach((item, index) => {
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
    doc.text(`Subtotal: ${quotation.subTotal.toFixed(2)}`, 14, y)

    doc.save(`quotation-${quotation.quotationNumber}.pdf`)
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
          <Button onClick={() => setShowCreate((prev) => !prev)}>{showCreate ? "Close" : "Create Quotation"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Search Quotations</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-md">
            <Label>Search</Label>
            <Input placeholder="Quotation no, client name, number or location" value={quotationSearchInput} onChange={(event) => setQuotationSearchInput(event.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setQuotationSearch(quotationSearchInput)}>Search</Button>
        </CardContent>
      </Card>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Quotation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full md:max-w-md">
                  <Label>Search Product</Label>
                  <Input
                    placeholder="Search by product or category"
                    value={productSearchInput}
                    onChange={(event) => setProductSearchInput(event.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => setProductSearch(productSearchInput)}>Search Product</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Product</Label>
                  <Select value={itemProductId} onValueChange={setItemProductId}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product._id} value={product._id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input type="number" min="0" value={itemUnitPrice} onChange={(event) => setItemUnitPrice(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={addItem}>Add Item</Button>
                </div>
              </div>
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

            <Button onClick={createQuotation}>Generate Quotation</Button>
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
