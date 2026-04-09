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

type StockView = "add-inventory" | "sales" | "status" | "analytics" | "history" | "outsourced"

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
  isOutsourced?: boolean
  expiryEnabled?: boolean
  expiryDate?: string | null
  expiryReminderDays?: number
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
  isOutsourced?: boolean
  outsourcedCompany?: string
  addedBy: string
  note?: string
  createdAt: string
}

interface QuotationItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  isOutsourced?: boolean
}

interface Quotation {
  _id: string
  quotationNumber: string
  status: "draft" | "converted" | "cancelled"
  items: QuotationItem[]
  subTotal: number
  createdAt: string
}

interface Invoice {
  _id: string
  invoiceNumber: string
  quotationId?: string
  items: QuotationItem[]
  subTotal: number
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
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" })
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    startingPrice: "",
    sellingPrice: "",
    minAlertQuantity: "",
    currentQuantity: "0",
    assignedUsers: [] as string[],
    isOutsourced: false,
    expiryEnabled: false,
    expiryDate: "",
    expiryReminderDays: "7",
  })
  const [stockForm, setStockForm] = useState({
    productId: "",
    quantityAdded: "",
    note: "",
    outsourcedOnly: false,
    isOutsourced: false,
    outsourcedCompany: "",
    expiryEnabled: false,
    expiryDate: "",
    expiryReminderDays: "7",
  })
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
      const [categoriesRes, productsRes, usersRes, salesRes, entriesRes, quotationsRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/categories`, { headers }),
        fetch(`${API_URL}/api/stock/products`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/stock/sales`, { headers }),
        fetch(`${API_URL}/api/stock/entries`, { headers }),
        fetch(`${API_URL}/api/stock/quotations`, { headers }),
        fetch(`${API_URL}/api/stock/invoices`, { headers }),
      ])

      const [categoriesJson, productsJson, usersJson, salesJson, entriesJson, quotationsJson, invoicesJson] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
        usersRes.json(),
        salesRes.json(),
        entriesRes.json(),
        quotationsRes.json(),
        invoicesRes.json(),
      ])

      setCategories(categoriesJson.data || [])
      setProducts(productsJson.data || [])
      setEmployees((usersJson.data || []).filter((user: Employee) => ["employee", "manager", "hr", "company_admin"].includes(user.role)))
      setSales(salesJson.data || [])
      setEntries(entriesJson.data || [])
      setQuotations(quotationsJson.data || [])
      setInvoices(invoicesJson.data || [])
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

  const avgSellingPrice = products.length > 0
    ? products.reduce((sum, product) => sum + Number(product.sellingPrice || 0), 0) / products.length
    : 0

  const avgMarginPercent = products.length > 0
    ? products.reduce((sum, product) => {
      const start = Number(product.startingPrice || 0)
      const sell = Number(product.sellingPrice || 0)
      if (start <= 0) return sum
      return sum + ((sell - start) / start) * 100
    }, 0) / products.length
    : 0

  const topStockValueProducts = products
    .map((product) => ({
      ...product,
      stockValue: Number(product.currentQuantity || 0) * Number(product.sellingPrice || 0),
    }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 8)

  const salesByProduct = useMemo(() => {
    const map = new Map<string, { productName: string; quantitySold: number; salesValue: number }>()
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "")
      if (!productId) return
      const existing = map.get(productId) || {
        productName: sale.product?.name || "Unknown",
        quantitySold: 0,
        salesValue: 0,
      }
      existing.quantitySold += Number(sale.quantitySold || 0)
      existing.salesValue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
      map.set(productId, existing)
    })
    return Array.from(map.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
  }, [sales])

  const projectionRows = useMemo(() => {
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - 30)

    const salesWindowMap = new Map<string, number>()
    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt)
      if (saleDate < windowStart || saleDate > now) return
      const productId = String(sale.product?._id || "")
      if (!productId) return
      salesWindowMap.set(productId, (salesWindowMap.get(productId) || 0) + Number(sale.quantitySold || 0))
    })

    return products
      .map((product) => {
        const sold30 = salesWindowMap.get(product._id) || 0
        const projected30Demand = sold30
        const projectedAfter30 = Number(product.currentQuantity || 0) - projected30Demand
        const dailyRate = sold30 / 30
        const daysOfCover = dailyRate > 0 ? Number(product.currentQuantity || 0) / dailyRate : null

        return {
          productId: product._id,
          productName: product.name,
          currentStock: Number(product.currentQuantity || 0),
          sold30,
          projected30Demand,
          projectedAfter30,
          daysOfCover,
        }
      })
      .sort((a, b) => a.projectedAfter30 - b.projectedAfter30)
      .slice(0, 10)
  }, [products, sales])

  const outsourcedStats = useMemo(() => {
    const productMeta = new Map(
      products.map((product) => [
        product._id,
        {
          name: product.name,
          sellingPrice: Number(product.sellingPrice || 0),
          currentQuantity: Number(product.currentQuantity || 0),
          isOutsourced: Boolean(product.isOutsourced),
        },
      ]),
    )

    const outsourcedProductIds = new Set(products.filter((product) => Boolean(product.isOutsourced)).map((product) => product._id))

    const isOutsourcedItem = (item: { productId?: string; productName?: string; isOutsourced?: boolean }) => {
      if (item.isOutsourced) return true
      const matchedProduct = item.productId ? productMeta.get(String(item.productId)) : undefined
      return Boolean(matchedProduct?.isOutsourced)
    }

    const outsourcedEntries = entries.filter((entry) => Boolean(entry.isOutsourced || String(entry.outsourcedCompany || "").trim()))
    const outsourcedSuppliers = new Set(
      outsourcedEntries
        .map((entry) => String(entry.outsourcedCompany || "").trim())
        .filter(Boolean),
    )

    const supplierBreakdown = new Map<string, { company: string; entries: number; quantity: number }>()
    outsourcedEntries.forEach((entry) => {
      const company = String(entry.outsourcedCompany || "").trim() || "Unspecified"
      const current = supplierBreakdown.get(company) || { company, entries: 0, quantity: 0 }
      current.entries += 1
      current.quantity += Number(entry.quantityAdded || 0)
      supplierBreakdown.set(company, current)
    })

    const outsourcedQuotationItems = quotations.flatMap((quotation) =>
      (quotation.items || [])
        .filter((item) => isOutsourcedItem(item))
        .map((item) => ({ ...item, quotationId: quotation._id, status: quotation.status })),
    )

    const outsourcedInvoiceItems = invoices.flatMap((invoice) =>
      (invoice.items || [])
        .filter((item) => isOutsourcedItem(item))
        .map((item) => ({ ...item, invoiceId: invoice._id })),
    )

    const productMap = new Map<string, { name: string; quantity: number; value: number }>()

    const outsourcedSalesMap = new Map<string, { name: string; quantitySold: number; salesValue: number }>()
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "")
      if (!productId || !outsourcedProductIds.has(productId)) return
      const current = outsourcedSalesMap.get(productId) || {
        name: sale.product?.name || "Unknown",
        quantitySold: 0,
        salesValue: 0,
      }
      current.quantitySold += Number(sale.quantitySold || 0)
      current.salesValue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
      outsourcedSalesMap.set(productId, current)
    })

    outsourcedEntries.forEach((entry) => {
      const key = entry.productId || "unknown"
      const product = productMeta.get(String(entry.productId))
      const existing = productMap.get(key) || {
        name: product?.name || String(entry.productId),
        quantity: 0,
        value: 0,
      }
      const qty = Number(entry.quantityAdded || 0)
      existing.quantity += qty
      existing.value += qty * Number(product?.sellingPrice || 0)
      productMap.set(key, existing)
    })

    outsourcedQuotationItems.forEach((item) => {
      const key = item.productId || item.productName || "unknown"
      const existing = productMap.get(key) || { name: item.productName || "Unknown", quantity: 0, value: 0 }
      existing.quantity += Number(item.quantity || 0)
      existing.value += Number(item.lineTotal || 0)
      productMap.set(key, existing)
    })

    const topOutsourcedProducts = Array.from(productMap.values()).sort((a, b) => b.value - a.value).slice(0, 10)

    const outsourcedSalesRows = Array.from(outsourcedSalesMap.entries())
      .map(([productId, row]) => ({ productId, ...row }))
      .sort((a, b) => b.salesValue - a.salesValue)

    const outsourcedSalesValue = outsourcedSalesRows.reduce((sum, row) => sum + row.salesValue, 0)
    const outsourcedSalesUnits = outsourcedSalesRows.reduce((sum, row) => sum + row.quantitySold, 0)
    const contributionToTotalSalesPercent = totalSalesValue > 0 ? (outsourcedSalesValue / totalSalesValue) * 100 : 0

    const now = new Date()
    const start30 = new Date(now)
    start30.setDate(start30.getDate() - 30)
    const sales30Map = new Map<string, number>()
    sales.forEach((sale) => {
      const productId = String(sale.product?._id || "")
      if (!productId || !outsourcedProductIds.has(productId)) return
      const saleDate = new Date(sale.createdAt)
      if (saleDate < start30 || saleDate > now) return
      sales30Map.set(productId, (sales30Map.get(productId) || 0) + Number(sale.quantitySold || 0))
    })

    const importRecommendations = Array.from(outsourcedProductIds)
      .map((productId) => {
        const info = productMeta.get(productId)
        if (!info) return null
        const sold30 = sales30Map.get(productId) || 0
        const projectedAfter30 = info.currentQuantity - sold30
        const dailyRate = sold30 / 30
        const daysOfCover = dailyRate > 0 ? info.currentQuantity / dailyRate : null

        const shouldRecommend = sold30 >= 3 && (projectedAfter30 < 0 || (daysOfCover !== null && daysOfCover < 20))
        if (!shouldRecommend) return null

        const reason = projectedAfter30 < 0
          ? "Demand exceeds projected stock in 30 days"
          : "Low stock cover for current demand"

        return {
          productId,
          name: info.name,
          sold30,
          currentStock: info.currentQuantity,
          projectedAfter30,
          daysOfCover,
          reason,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => a.projectedAfter30 - b.projectedAfter30)
      .slice(0, 8)

    return {
      outsourcedStockEntriesCount: outsourcedEntries.length,
      outsourcedUnitsAdded: outsourcedEntries.reduce((sum, entry) => sum + Number(entry.quantityAdded || 0), 0),
      outsourcedSuppliersCount: outsourcedSuppliers.size,
      outsourcedProductsCount: outsourcedProductIds.size,
      quotationsWithOutsourced: quotations.filter((q) => (q.items || []).some((i) => isOutsourcedItem(i))).length,
      outsourcedQuotationItemsCount: outsourcedQuotationItems.length,
      outsourcedInvoiceItemsCount: outsourcedInvoiceItems.length,
      outsourcedValue: outsourcedQuotationItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
      outsourcedSalesValue,
      outsourcedSalesUnits,
      contributionToTotalSalesPercent,
      leadingOutsourcedProduct: outsourcedSalesRows[0] || null,
      importRecommendations,
      supplierBreakdown: Array.from(supplierBreakdown.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      topOutsourcedProducts,
    }
  }, [entries, invoices, products, quotations, sales, totalSalesValue])

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
        isOutsourced: Boolean(productForm.isOutsourced),
        expiryDate: productForm.expiryEnabled ? productForm.expiryDate : undefined,
        expiryReminderDays: Number(productForm.expiryReminderDays || 0),
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
      isOutsourced: false,
      expiryEnabled: false,
      expiryDate: "",
      expiryReminderDays: "7",
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
        isOutsourced: stockForm.isOutsourced,
        outsourcedCompany: stockForm.isOutsourced ? stockForm.outsourcedCompany : undefined,
        expiryEnabled: stockForm.expiryEnabled,
        expiryDate: stockForm.expiryEnabled ? stockForm.expiryDate : undefined,
        expiryReminderDays: Number(stockForm.expiryReminderDays || 0),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast({ title: "Stock Error", description: result.message || "Failed", variant: "destructive" })
      return
    }
    setStockForm({
      productId: "",
      quantityAdded: "",
      note: "",
      outsourcedOnly: false,
      isOutsourced: false,
      outsourcedCompany: "",
      expiryEnabled: false,
      expiryDate: "",
      expiryReminderDays: "7",
    })
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
                      {products
                        .filter((product) => (stockForm.outsourcedOnly ? Boolean(product.isOutsourced) : true))
                        .map((product) => (
                        <SelectItem key={product._id} value={product._id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.outsourcedOnly}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        outsourcedOnly: Boolean(value),
                        productId: "",
                      }))
                    }
                  />
                  <span>Outsourced products only</span>
                </label>
                <div>
                  <Label>Quantity Added</Label>
                  <Input type="number" min="1" value={stockForm.quantityAdded} onChange={(event) => setStockForm((prev) => ({ ...prev, quantityAdded: event.target.value }))} />
                </div>
                <div>
                  <Label>Note</Label>
                  <Input value={stockForm.note} onChange={(event) => setStockForm((prev) => ({ ...prev, note: event.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.isOutsourced}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        isOutsourced: Boolean(value),
                        outsourcedCompany: value ? prev.outsourcedCompany : "",
                      }))
                    }
                  />
                  <span>This stock entry is outsourced</span>
                </label>
                {stockForm.isOutsourced && (
                  <div>
                    <Label>Outsourced From Company</Label>
                    <Input
                      placeholder="Enter supplier / local company"
                      value={stockForm.outsourcedCompany}
                      onChange={(event) => setStockForm((prev) => ({ ...prev, outsourcedCompany: event.target.value }))}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={stockForm.expiryEnabled}
                    onCheckedChange={(value) =>
                      setStockForm((prev) => ({
                        ...prev,
                        expiryEnabled: Boolean(value),
                        expiryDate: value ? prev.expiryDate : "",
                      }))
                    }
                  />
                  <span>Expiry checker for this stock entry</span>
                </label>
                {stockForm.expiryEnabled && (
                  <>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={stockForm.expiryDate}
                        onChange={(event) => setStockForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Reminder Days Before Expiry</Label>
                      <Input
                        type="number"
                        min="0"
                        value={stockForm.expiryReminderDays}
                        onChange={(event) => setStockForm((prev) => ({ ...prev, expiryReminderDays: event.target.value }))}
                      />
                    </div>
                  </>
                )}
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

              <div className="space-y-3 border rounded-md p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={productForm.isOutsourced}
                    onCheckedChange={(value) =>
                      setProductForm((prev) => ({
                        ...prev,
                        isOutsourced: Boolean(value),
                      }))
                    }
                  />
                  <span>Mark product as outsourced</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={productForm.expiryEnabled}
                    onCheckedChange={(value) =>
                      setProductForm((prev) => ({
                        ...prev,
                        expiryEnabled: Boolean(value),
                        expiryDate: value ? prev.expiryDate : "",
                      }))
                    }
                  />
                  <span>Enable expiry checker for this product</span>
                </label>

                {productForm.expiryEnabled && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={productForm.expiryDate}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Reminder Days Before Expiry</Label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.expiryReminderDays}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, expiryReminderDays: event.target.value }))}
                      />
                    </div>
                  </div>
                )}
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

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Estimated Inventory Value</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalStockValue.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Average Selling Price</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{avgSellingPrice.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Average Margin %</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{avgMarginPercent.toFixed(1)}%</p></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Top products by stock value</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {topStockValueProducts.map((product) => (
                    <div key={product._id} className="flex items-center justify-between border rounded px-3 py-2">
                      <span>{product.name}</span>
                      <span className="font-medium">{product.stockValue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top selling products</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {salesByProduct.slice(0, 8).map((item) => (
                    <div key={item.productId} className="flex items-center justify-between border rounded px-3 py-2">
                      <span>{item.productName}</span>
                      <span className="font-medium">{item.quantitySold} sold</span>
                    </div>
                  ))}
                  {salesByProduct.length === 0 && <p className="text-muted-foreground">No sales yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>30-day stock projection</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Product</th>
                      <th className="py-2">Current Stock</th>
                      <th className="py-2">Sold (30d)</th>
                      <th className="py-2">Projected Demand (30d)</th>
                      <th className="py-2">Projected Stock After 30d</th>
                      <th className="py-2">Stock Cover (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectionRows.map((row) => (
                      <tr key={row.productId} className="border-b">
                        <td className="py-2">{row.productName}</td>
                        <td className="py-2">{row.currentStock}</td>
                        <td className="py-2">{row.sold30}</td>
                        <td className="py-2">{row.projected30Demand}</td>
                        <td className={`py-2 ${row.projectedAfter30 < 0 ? "text-red-600 font-semibold" : ""}`}>{row.projectedAfter30}</td>
                        <td className="py-2">{row.daysOfCover ? row.daysOfCover.toFixed(1) : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {view === "outsourced" && (
        <>
          <h1 className="text-2xl font-bold">Outsourced Product Analytics</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Stock Entries</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedStockEntriesCount}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Units Added</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedUnitsAdded}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Supplier Companies</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedSuppliersCount}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Value (Quotes)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedValue.toFixed(2)}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Products</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedProductsCount}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Sales Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedSalesValue.toFixed(2)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Sales Contribution</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.contributionToTotalSalesPercent.toFixed(1)}%</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Units Sold</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedSalesUnits}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-sm">Quotations with Outsourced</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.quotationsWithOutsourced}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Quotation Items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedQuotationItemsCount}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Outsourced Invoice Items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{outsourcedStats.outsourcedInvoiceItemsCount}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Leading outsourced performer</CardTitle></CardHeader>
            <CardContent>
              {!outsourcedStats.leadingOutsourcedProduct ? (
                <p className="text-sm text-muted-foreground">No outsourced sales yet.</p>
              ) : (
                <div className="flex flex-col gap-2 text-sm">
                  <p><span className="font-medium">Product:</span> {outsourcedStats.leadingOutsourcedProduct.name}</p>
                  <p><span className="font-medium">Units Sold:</span> {outsourcedStats.leadingOutsourcedProduct.quantitySold}</p>
                  <p><span className="font-medium">Sales Value:</span> {outsourcedStats.leadingOutsourcedProduct.salesValue.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top outsourced products</CardTitle></CardHeader>
            <CardContent>
              {outsourcedStats.topOutsourcedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outsourced products recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Product</th>
                        <th className="py-2">Quantity</th>
                        <th className="py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outsourcedStats.topOutsourcedProducts.map((product, index) => (
                        <tr key={`${product.name}-${index}`} className="border-b">
                          <td className="py-2">{product.name}</td>
                          <td className="py-2">{product.quantity}</td>
                          <td className="py-2">{product.value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Recommended outsourced products to import</CardTitle></CardHeader>
              <CardContent>
                {outsourcedStats.importRecommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No urgent import recommendations right now.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2">Product</th>
                          <th className="py-2">Sold 30d</th>
                          <th className="py-2">Stock</th>
                          <th className="py-2">Projected 30d</th>
                          <th className="py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outsourcedStats.importRecommendations.map((item) => (
                          <tr key={item.productId} className="border-b">
                            <td className="py-2">{item.name}</td>
                            <td className="py-2">{item.sold30}</td>
                            <td className="py-2">{item.currentStock}</td>
                            <td className={`py-2 ${item.projectedAfter30 < 0 ? "text-red-600 font-semibold" : ""}`}>{item.projectedAfter30}</td>
                            <td className="py-2">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Outsourced supplier contribution</CardTitle></CardHeader>
              <CardContent>
                {outsourcedStats.supplierBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outsourced suppliers captured yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2">Company</th>
                          <th className="py-2">Entries</th>
                          <th className="py-2">Units Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outsourcedStats.supplierBreakdown.map((supplier) => (
                          <tr key={supplier.company} className="border-b">
                            <td className="py-2">{supplier.company}</td>
                            <td className="py-2">{supplier.entries}</td>
                            <td className="py-2">{supplier.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                    ["Date", "Product", "Quantity Added", "Outsourced", "Outsourced Company", "Note"],
                    filteredEntries.map((entry) => [
                      new Date(entry.createdAt).toISOString(),
                      productNameById.get(entry.productId) || entry.productId,
                      entry.quantityAdded,
                      entry.isOutsourced ? "Yes" : "No",
                      entry.outsourcedCompany || "",
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
                      <th className="py-2">Outsourced</th>
                      <th className="py-2">Outsourced Company</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry._id} className="border-b">
                        <td className="py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                        <td className="py-2">{productNameById.get(entry.productId) || entry.productId}</td>
                        <td className="py-2">{entry.quantityAdded}</td>
                        <td className="py-2">{entry.isOutsourced ? "Yes" : "No"}</td>
                        <td className="py-2">{entry.outsourcedCompany || "-"}</td>
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
