"use client"

import { useEffect, useMemo, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface Product {
  _id: string
  name: string
  currentQuantity: number
  minAlertQuantity: number
  sellingPrice: number
}

interface Employee {
  _id: string
  firstName: string
  lastName: string
}

interface Sale {
  _id: string
  quantitySold: number
  soldPrice: number
  remainingQuantity: number
  createdAt: string
  product?: { name: string }
}

interface Quotation {
  _id: string
  quotationNumber: string
  status: "draft" | "pending_approval" | "converted" | "cancelled"
  client: {
    name: string
    number: string
    location: string
  }
  subTotal: number
  createdAt: string
}

interface Invoice {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  quotationNumber?: string
  status: "issued" | "paid" | "cancelled"
  client: {
    name: string
    number: string
    location: string
  }
  subTotal: number
  createdAt: string
}

export default function EmployeeStockPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const [stockForm, setStockForm] = useState({ productId: "", quantityAdded: "", note: "" })
  const [saleForm, setSaleForm] = useState({
    productId: "",
    quantitySold: "",
    soldPrice: "",
    isSalesCompany: false,
    salesEmployeeId: "",
  })

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, usersRes, salesRes, quotationsRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/stock/sales`, { headers }),
        fetch(`${API_URL}/api/stock/quotations`, { headers }),
        fetch(`${API_URL}/api/stock/invoices`, { headers }),
      ])

      const [productsJson, usersJson, salesJson, quotationsJson, invoicesJson] = await Promise.all([
        productsRes.json(),
        usersRes.json(),
        salesRes.json(),
        quotationsRes.json(),
        invoicesRes.json(),
      ])

      setProducts(productsJson.data || [])
      setEmployees(usersJson.data || [])
      setSales(salesJson.data || [])
      setQuotations(quotationsJson.data || [])
      setInvoices(invoicesJson.data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load stock data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const addStock = async () => {
    const response = await fetch(`${API_URL}/api/stock/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: stockForm.productId,
        quantityAdded: Number(stockForm.quantityAdded),
        note: stockForm.note,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Stock Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setStockForm({ productId: "", quantityAdded: "", note: "" })
    toast({ title: "Success", description: "Stock entry added" })
    fetchData()
  }

  const recordSale = async () => {
    const response = await fetch(`${API_URL}/api/stock/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: saleForm.productId,
        quantitySold: Number(saleForm.quantitySold),
        soldPrice: Number(saleForm.soldPrice),
        isSalesCompany: saleForm.isSalesCompany,
        salesEmployeeId: saleForm.isSalesCompany ? saleForm.salesEmployeeId : undefined,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Sale Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setSaleForm({ productId: "", quantitySold: "", soldPrice: "", isSalesCompany: false, salesEmployeeId: "" })
    toast({ title: "Success", description: "Sale recorded" })
    fetchData()
  }

  if (loading) {
    return <div className="p-6">Loading stock workspace...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stock Sales Workspace</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={stockForm.productId} onValueChange={(value) => setStockForm((prev) => ({ ...prev, productId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity Added</Label>
              <Input type="number" min="1" value={stockForm.quantityAdded} onChange={(event) => setStockForm((prev) => ({ ...prev, quantityAdded: event.target.value }))} />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={stockForm.note} onChange={(event) => setStockForm((prev) => ({ ...prev, note: event.target.value }))} />
            </div>
            <Button onClick={addStock}>Submit Stock Entry</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={saleForm.productId} onValueChange={(value) => setSaleForm((prev) => ({ ...prev, productId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity Sold</Label>
              <Input type="number" min="1" value={saleForm.quantitySold} onChange={(event) => setSaleForm((prev) => ({ ...prev, quantitySold: event.target.value }))} />
            </div>
            <div>
              <Label>Sold Price</Label>
              <Input type="number" min="0" value={saleForm.soldPrice} onChange={(event) => setSaleForm((prev) => ({ ...prev, soldPrice: event.target.value }))} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saleForm.isSalesCompany} onCheckedChange={(value) => setSaleForm((prev) => ({ ...prev, isSalesCompany: Boolean(value) }))} />
              <span>Is sales company?</span>
            </label>

            {saleForm.isSalesCompany && (
              <div>
                <Label>Select employee</Label>
                <Select value={saleForm.salesEmployeeId} onValueChange={(value) => setSaleForm((prev) => ({ ...prev, salesEmployeeId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={recordSale}>Submit Sale</Button>
          </CardContent>
        </Card>
      </div>

      <Card id="my-quotations">
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2">Min Alert</th>
                  <th className="py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-b">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{product.currentQuantity}</td>
                    <td className="py-2">{product.minAlertQuantity}</td>
                    <td className="py-2">{product.sellingPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="my-invoices">
        <CardHeader>
          <CardTitle>My Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Date</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Quantity</th>
                  <th className="py-2">Sold Price</th>
                  <th className="py-2">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id} className="border-b">
                    <td className="py-2">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td className="py-2">{sale.product?.name || "-"}</td>
                    <td className="py-2">{sale.quantitySold}</td>
                    <td className="py-2">{sale.soldPrice}</td>
                    <td className="py-2">{sale.remainingQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Date</th>
                  <th className="py-2">Quotation No</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>No quotations found</td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr key={quotation._id} className="border-b">
                      <td className="py-2">{new Date(quotation.createdAt).toLocaleDateString()}</td>
                      <td className="py-2">{quotation.quotationNumber}</td>
                      <td className="py-2">{quotation.client?.name || "-"}</td>
                      <td className="py-2">{Number(quotation.subTotal || 0).toFixed(2)}</td>
                      <td className="py-2 capitalize">{String(quotation.status || "").replace("_", " ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Date</th>
                  <th className="py-2">Invoice No</th>
                  <th className="py-2">Delivery Note</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={6}>No invoices found</td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice._id} className="border-b">
                      <td className="py-2">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                      <td className="py-2">{invoice.invoiceNumber}</td>
                      <td className="py-2">{invoice.deliveryNoteNumber}</td>
                      <td className="py-2">{invoice.client?.name || "-"}</td>
                      <td className="py-2">{Number(invoice.subTotal || 0).toFixed(2)}</td>
                      <td className="py-2 capitalize">{invoice.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
