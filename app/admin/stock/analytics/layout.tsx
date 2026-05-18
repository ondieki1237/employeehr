"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

interface Product {
  _id: string
  name: string
  sku: string
}

const analyticsPages = [
  { href: "/admin/stock/analytics/product", label: "Product", icon: "📦" },
  { href: "/admin/stock/analytics/sales", label: "Sales", icon: "💰" },
  { href: "/admin/stock/analytics/margins", label: "Margins", icon: "📊" },
  { href: "/admin/stock/analytics/trends", label: "Trends", icon: "📈" },
]

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchText, setSearchText] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      }
      const res = await fetch(`${API_URL}/api/stock/products`, { headers })
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || json || [])
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    }
  }

  useEffect(() => {
    if (searchText) {
      const q = searchText.toLowerCase()
      const filtered = products.filter((p) => {
        const name = (p?.name || "").toString().toLowerCase()
        const sku = (p?.sku || "").toString().toLowerCase()
        return name.includes(q) || sku.includes(q)
      })
      setFilteredProducts(filtered)
      setShowDropdown(filtered.length > 0)
    } else {
      setFilteredProducts([])
      setShowDropdown(false)
    }
  }, [searchText, products])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchText(product.name)
    setShowDropdown(false)
    
    // Add product param to current URL
    const params = new URLSearchParams(searchParams)
    params.set("product", product._id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm md:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory analytics</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Performance reports</h1>
              <p className="text-sm leading-6 text-slate-600">
                Analyze your inventory performance across multiple dimensions
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <div className="relative">
                <Input
                  placeholder="Search products..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onFocus={() => setShowDropdown(searchText.length > 0)}
                  className="w-full"
                />
                {showDropdown && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                    {filteredProducts.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors text-sm"
                      >
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <p className="mt-1 text-xs text-slate-500">
                  Selected: <span className="font-medium text-slate-700">{selectedProduct.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {analyticsPages.map((page) => (
              <Link
                key={page.href}
                href={`${page.href}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  pathname?.includes(page.href.split("/").pop() || "")
                    ? "bg-blue-100 text-blue-900"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                <span className="mr-2">{page.icon}</span>
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}
