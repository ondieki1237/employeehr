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

type StockView = "add-inventory" | "sales" | "status" | "analytics" | "history"

interface Category {
  _id: string
  name: string
  description?: string
}

interface Product {
  _id: string
  name: string
  category: string
  startingPrice: number
  sellingPrice: number
  minAlertQuantity: number
  currentQuantity: number
  assignedUsers: string[]
  categoryDetails?: { _id: string; name: string }
}

interface Employee {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface Sale {
  _id: string
  quantitySold: number
  soldPrice: number
  remainingQuantity: number
  receiptNumber?: string
  buyerName?: string
  buyerNumber?: string
  buyerLocation?: string
  isWalkInClient?: boolean
  createdAt: string
  product?: { _id: string; name: string }
  soldByUser?: { firstName: string; lastName: string; email: string }
  salesEmployee?: { firstName: string; lastName: string; email: string }
}

interface StockEntry {
  _id: string
  productId: string
  quantityAdded: number
  addedBy: string
  note?: string
  createdAt: string
}

export function StockManagerContent({ view }: { view: StockView }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [entries, setEntries] = useState<StockEntry[]>([])

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" })
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    startingPrice: "",
    sellingPrice: "",
    minAlertQuantity: "",
    currentQuantity: "0",
    assignedUsers: [] as string[],
  })
  const [stockForm, setStockForm] = useState({ productId: "", quantityAdded: "", note: "" })
  const [saleForm, setSaleForm] = useState({
    productId: "",
    quantitySold: "",
    soldPrice: "",
    isSalesCompany: false,
    salesEmployeeId: "",
    isWalkInClient: false,
    buyerName: "",
    buyerNumber: "",
    buyerLocation: "",
  })
  const [salesSearch, setSalesSearch] = useState("")
  const [inventorySearch, setInventorySearch] = useState("")

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [categoriesRes, productsRes, usersRes, salesRes, entriesRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/categories`, { headers }),
        fetch(`${API_URL}/api/stock/products`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/stock/sales`, { headers }),
        fetch(`${API_URL}/api/stock/entries`, { headers }),
      ])

      const [categoriesJson, productsJson, usersJson, salesJson, entriesJson] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
        usersRes.json(),
        salesRes.json(),
        entriesRes.json(),
      ])

      setCategories(categoriesJson.data || [])
      setProducts(productsJson.data || [])
      setEmployees((usersJson.data || []).filter((user: Employee) => ["employee", "manager", "hr", "company_admin"].includes(user.role)))
      setSales(salesJson.data || [])
      setEntries(entriesJson.data || [])
    } catch {
      toast({ title: "Error", description: "Failed to load inventory data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const lowStockProducts = products.filter((product) => product.currentQuantity <= product.minAlertQuantity)
  const totalInventoryUnits = products.reduce((sum, product) => sum + (product.currentQuantity || 0), 0)
  const totalStockValue = products.reduce((sum, product) => sum + (product.currentQuantity || 0) * (product.sellingPrice || 0), 0)
  const totalSalesValue = sales.reduce((sum, sale) => sum + (sale.quantitySold || 0) * (sale.soldPrice || 0), 0)
  const productNameById = new Map(products.map((product) => [product._id, product.name]))
  const categoryNameById = new Map(categories.map((category) => [category._id, category.name]))

  const normalizedSalesSearch = salesSearch.trim().toLowerCase()
  const normalizedInventorySearch = inventorySearch.trim().toLowerCase()

  const matchesProductAndCategory = (product: Product, query: string) => {
    if (!query) return true
    const categoryName = product.categoryDetails?.name || categoryNameById.get(product.category) || ""
    return (
      product.name.toLowerCase().includes(query) ||
      categoryName.toLowerCase().includes(query)
    )
  }

  const filteredProductsForSales = products.filter((product) => matchesProductAndCategory(product, normalizedSalesSearch))
  const filteredSales = sales.filter((sale) => {
    if (!normalizedSalesSearch) return true
    const productName = (sale.product?.name || "").toLowerCase()
    const productCategory =
      (sale.product as any)?.categoryDetails?.name?.toLowerCase?.() ||
      categoryNameById.get((sale.product as any)?.category || "")?.toLowerCase() ||
      ""
    return (
      productName.includes(normalizedSalesSearch) ||
      productCategory.includes(normalizedSalesSearch)
    )
  })

  const filteredProductsForInventory = products.filter((product) => matchesProductAndCategory(product, normalizedInventorySearch))
  const filteredLowStockProducts = lowStockProducts.filter((product) => matchesProductAndCategory(product, normalizedInventorySearch))
  const filteredEntries = entries.filter((entry) => {
    if (!normalizedInventorySearch) return true
    const productName = (productNameById.get(entry.productId) || "").toLowerCase()
    return productName.includes(normalizedInventorySearch)
  })

  const escapeCsv = (value: string | number | null | undefined) => {
    const stringValue = String(value ?? "")
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const exportAsCsv = (fileName: string, headersRow: string[], rows: Array<Array<string | number | null | undefined>>) => {
    const csv = [headersRow.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const createCategory = async () => {
    if (!categoryForm.name.trim()) return
    const response = await fetch(`${API_URL}/api/stock/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify(categoryForm),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Category Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setCategoryForm({ name: "", description: "" })
    toast({ title: "Success", description: "Category created" })
    fetchAll()
  }

  const createProduct = async () => {
    const response = await fetch(`${API_URL}/api/stock/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...productForm,
        startingPrice: Number(productForm.startingPrice),
        sellingPrice: Number(productForm.sellingPrice),
        minAlertQuantity: Number(productForm.minAlertQuantity),
        currentQuantity: Number(productForm.currentQuantity || 0),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Product Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setProductForm({
      name: "",
      category: "",
      startingPrice: "",
      sellingPrice: "",
      minAlertQuantity: "",
      currentQuantity: "0",
      assignedUsers: [],
    })
    toast({ title: "Success", description: "Product created" })
    fetchAll()
  }

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
    toast({ title: "Success", description: "Stock added" })
    fetchAll()
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
        isWalkInClient: saleForm.isWalkInClient,
        buyerName: saleForm.isWalkInClient ? undefined : saleForm.buyerName,
        buyerNumber: saleForm.isWalkInClient ? undefined : saleForm.buyerNumber,
        buyerLocation: saleForm.isWalkInClient ? undefined : saleForm.buyerLocation,
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Sale Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setSaleForm({
      productId: "",
      quantitySold: "",
      soldPrice: "",
      isSalesCompany: false,
      salesEmployeeId: "",
      isWalkInClient: false,
      buyerName: "",
      buyerNumber: "",
      buyerLocation: "",
    })
    toast({ title: "Success", description: "Sale recorded" })
    fetchAll()
  }

  if (loading) {
    return <div>Loading inventory manager...</div>
  }

  return (
    <div className="space-y-6">
      {view === "add-inventory" && (
        <>
          <h1 className="text-2xl font-bold">Add Inventory</h1>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Create Category</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={categoryForm.description} onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <Button onClick={createCategory}>Add Category</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Add Stock</CardTitle></CardHeader>
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
                <Button onClick={addStock}>Add Stock Entry</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Create Product</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label>Name</Label>
                  <Input value={productForm.name} onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={productForm.category} onValueChange={(value) => setProductForm((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Starting Price</Label>
                  <Input type="number" min="0" value={productForm.startingPrice} onChange={(event) => setProductForm((prev) => ({ ...prev, startingPrice: event.target.value }))} />
                </div>
                <div>
                  <Label>Selling Price</Label>
                  <Input type="number" min="0" value={productForm.sellingPrice} onChange={(event) => setProductForm((prev) => ({ ...prev, sellingPrice: event.target.value }))} />
                </div>
                <div>
                  <Label>Minimum Product Alert</Label>
                  <Input type="number" min="0" value={productForm.minAlertQuantity} onChange={(event) => setProductForm((prev) => ({ ...prev, minAlertQuantity: event.target.value }))} />
                </div>
                <div>
                  <Label>Initial Stock</Label>
                  <Input type="number" min="0" value={productForm.currentQuantity} onChange={(event) => setProductForm((prev) => ({ ...prev, currentQuantity: event.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Assign Users</Label>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {employees.map((employee) => {
                    const checked = productForm.assignedUsers.includes(employee._id)
                    return (
                      <label key={employee._id} className="flex items-center gap-2 text-sm border rounded p-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setProductForm((prev) => ({
                              ...prev,
                              assignedUsers: value
                                ? [...prev.assignedUsers, employee._id]
                                : prev.assignedUsers.filter((userId) => userId !== employee._id),
                            }))
                          }}
                        />
                        <span>{employee.firstName} {employee.lastName}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <Button onClick={createProduct}>Create Product</Button>
            </CardContent>
          </Card>
        </>
      )}

      {view === "sales" && (
        <>
          <h1 className="text-2xl font-bold">Sales</h1>
          <Card>
            <CardHeader><CardTitle>Search & Export</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-md">
                <Label>Search products or categories</Label>
                <Input
                  placeholder="Search by product or category"
                  value={salesSearch}
                  onChange={(event) => setSalesSearch(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportAsCsv(
                    "sales-data.csv",
                    ["Date", "Receipt", "Product", "Category", "Qty Sold", "Sold Price", "Buyer", "Buyer Number", "Buyer Location", "Sold By", "Sales Company Employee", "Remaining"],
                    filteredSales.map((sale) => {
                      const categoryName =
                        (sale.product as any)?.categoryDetails?.name ||
                        categoryNameById.get((sale.product as any)?.category || "") ||
                        ""
                      return [
                        new Date(sale.createdAt).toISOString(),
                        sale.receiptNumber || "",
                        sale.product?.name || "",
                        categoryName,
                        sale.quantitySold,
                        sale.soldPrice,
                        sale.isWalkInClient ? "Walk-in Client" : sale.buyerName || "",
                        sale.buyerNumber || "",
                        sale.buyerLocation || "",
                        sale.soldByUser ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}` : "",
                        sale.salesEmployee ? `${sale.salesEmployee.firstName} ${sale.salesEmployee.lastName}` : "",
                        sale.remainingQuantity,
                      ]
                    }),
                  )
                }
              >
                Export Sales (Excel)
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Record Sale</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Product</Label>
                <Select value={saleForm.productId} onValueChange={(value) => setSaleForm((prev) => ({ ...prev, productId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {filteredProductsForSales.map((product) => (
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
              <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-3">
                <Checkbox checked={saleForm.isWalkInClient} onCheckedChange={(value) => setSaleForm((prev) => ({ ...prev, isWalkInClient: Boolean(value) }))} />
                <span>Walk-in client (no buyer details)</span>
              </label>
              {!saleForm.isWalkInClient && (
                <>
                  <div>
                    <Label>Buyer Name</Label>
                    <Input value={saleForm.buyerName} onChange={(event) => setSaleForm((prev) => ({ ...prev, buyerName: event.target.value }))} />
                  </div>
                  <div>
                    <Label>Buyer Number</Label>
                    <Input value={saleForm.buyerNumber} onChange={(event) => setSaleForm((prev) => ({ ...prev, buyerNumber: event.target.value }))} />
                  </div>
                  <div>
                    <Label>Buyer Location</Label>
                    <Input value={saleForm.buyerLocation} onChange={(event) => setSaleForm((prev) => ({ ...prev, buyerLocation: event.target.value }))} />
                  </div>
                </>
              )}
              <label className="flex items-center gap-2 text-sm md:col-span-2 lg:col-span-3">
                <Checkbox checked={saleForm.isSalesCompany} onCheckedChange={(value) => setSaleForm((prev) => ({ ...prev, isSalesCompany: Boolean(value) }))} />
                <span>Is sales company?</span>
              </label>
              {saleForm.isSalesCompany && (
                <div className="md:col-span-2 lg:col-span-3">
                  <Label>Select employee whose sale this is</Label>
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
              <div className="md:col-span-2 lg:col-span-3">
                <Button onClick={recordSale}>Save Sale</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Date</th>
                      <th className="py-2">Receipt #</th>
                      <th className="py-2">Product</th>
                      <th className="py-2">Qty Sold</th>
                      <th className="py-2">Sold Price</th>
                      <th className="py-2">Buyer</th>
                      <th className="py-2">Sold By</th>
                      <th className="py-2">Sales Company Employee</th>
                      <th className="py-2">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale._id} className="border-b">
                        <td className="py-2">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="py-2">{sale.receiptNumber || "-"}</td>
                        <td className="py-2">{sale.product?.name || "-"}</td>
                        <td className="py-2">{sale.quantitySold}</td>
                        <td className="py-2">{sale.soldPrice}</td>
                        <td className="py-2">{sale.isWalkInClient ? "Walk-in Client" : sale.buyerName || "-"}</td>
                        <td className="py-2">{sale.soldByUser ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}` : "-"}</td>
                        <td className="py-2">{sale.salesEmployee ? `${sale.salesEmployee.firstName} ${sale.salesEmployee.lastName}` : "-"}</td>
                        <td className="py-2">{sale.remainingQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {view === "status" && (
        <>
          <h1 className="text-2xl font-bold">Inventory Status</h1>
          <Card>
            <CardHeader><CardTitle>Search & Export</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-md">
                <Label>Search products or categories</Label>
                <Input
                  placeholder="Search by product or category"
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  exportAsCsv(
                    "inventory-status.csv",
                    ["Product", "Category", "Stock", "Min Alert", "Selling Price"],
                    filteredProductsForInventory.map((product) => [
                      product.name,
                      product.categoryDetails?.name || categoryNameById.get(product.category) || "",
                      product.currentQuantity,
                      product.minAlertQuantity,
                      product.sellingPrice,
                    ]),
                  )
                }
              >
                Export Inventory (Excel)
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
            <CardContent>
              {filteredLowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low-stock products right now.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {filteredLowStockProducts.map((product) => (
                    <li key={product._id} className="border rounded p-2">
                      {product.name}: {product.currentQuantity} remaining (alert at {product.minAlertQuantity})
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Products Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Product</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Stock</th>
                      <th className="py-2">Min Alert</th>
                      <th className="py-2">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductsForInventory.map((product) => (
                      <tr key={product._id} className="border-b">
                        <td className="py-2">{product.name}</td>
                        <td className="py-2">{product.categoryDetails?.name || "-"}</td>
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
        </>
      )}

      {view === "analytics" && (
        <>
          <h1 className="text-2xl font-bold">Inventory Analytics</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm">Total Products</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Inventory Units</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalInventoryUnits}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Low Stock Items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{lowStockProducts.length}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Sales Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalSalesValue.toFixed(2)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Estimated Inventory Value</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStockValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </>
      )}

      {view === "history" && (
        <>
          <h1 className="text-2xl font-bold">Inventory History</h1>
          <Card>
            <CardHeader><CardTitle>Export History</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  exportAsCsv(
                    "inventory-entries.csv",
                    ["Date", "Product", "Quantity Added", "Note"],
                    filteredEntries.map((entry) => [
                      new Date(entry.createdAt).toISOString(),
                      productNameById.get(entry.productId) || entry.productId,
                      entry.quantityAdded,
                      entry.note || "",
                    ]),
                  )
                }
              >
                Export Stock Entries (Excel)
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  exportAsCsv(
                    "inventory-sales-history.csv",
                    ["Date", "Receipt", "Product", "Qty Sold", "Sold Price", "Buyer", "Sold By", "Remaining"],
                    filteredSales.map((sale) => [
                      new Date(sale.createdAt).toISOString(),
                      sale.receiptNumber || "",
                      sale.product?.name || "",
                      sale.quantitySold,
                      sale.soldPrice,
                      sale.isWalkInClient ? "Walk-in Client" : sale.buyerName || "",
                      sale.soldByUser ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}` : "",
                      sale.remainingQuantity,
                    ]),
                  )
                }
              >
                Export Sales History (Excel)
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Stock Entries</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Date</th>
                      <th className="py-2">Product</th>
                      <th className="py-2">Quantity Added</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry._id} className="border-b">
                        <td className="py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                        <td className="py-2">{productNameById.get(entry.productId) || entry.productId}</td>
                        <td className="py-2">{entry.quantityAdded}</td>
                        <td className="py-2">{entry.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Date</th>
                      <th className="py-2">Receipt #</th>
                      <th className="py-2">Product</th>
                      <th className="py-2">Qty Sold</th>
                      <th className="py-2">Sold Price</th>
                      <th className="py-2">Buyer</th>
                      <th className="py-2">Sold By</th>
                      <th className="py-2">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale._id} className="border-b">
                        <td className="py-2">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="py-2">{sale.receiptNumber || "-"}</td>
                        <td className="py-2">{sale.product?.name || "-"}</td>
                        <td className="py-2">{sale.quantitySold}</td>
                        <td className="py-2">{sale.soldPrice}</td>
                        <td className="py-2">{sale.isWalkInClient ? "Walk-in Client" : sale.buyerName || "-"}</td>
                        <td className="py-2">{sale.soldByUser ? `${sale.soldByUser.firstName} ${sale.soldByUser.lastName}` : "-"}</td>
                        <td className="py-2">{sale.remainingQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
