"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Lock, Unlock, Trash2, Plus, Eye, EyeOff, Search, Filter, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface Company {
  _id: string
  name: string
  email: string
  slug: string
  phone?: string
  industry?: string
  status: string
  subscription: string
  isFrozen?: boolean
  frozenReason?: string
  frozenAt?: Date
  enabledPages?: string[]
  enabledFeatures?: string[]
  maxEmployees?: number
  employeeCount?: number
  createdAt?: string
  updatedAt?: string
}

// Grouped feature sections
const FEATURE_SECTIONS = {
  "Human Resources": [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "Attendance Tracking", icon: "📍" },
    { id: "leave", label: "Leave Management", icon: "🏖️" },
    { id: "payroll", label: "Payroll", icon: "💰" },
  ],
  "Performance & Development": [
    { id: "performance", label: "Performance Reviews", icon: "⭐" },
    { id: "kpis", label: "KPIs & Goals", icon: "🎯" },
    { id: "feedback", label: "360° Feedback", icon: "💬" },
  ],
  "Operations": [
    { id: "meetings", label: "Meetings", icon: "📅" },
    { id: "communications", label: "Communications", icon: "📢" },
    { id: "stock", label: "Stock Management", icon: "📦" },
  ],
  "Analytics & Insights": [
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "recruitment", label: "Recruitment", icon: "👥" },
  ],
}

const OWNER_EMAIL = "bellarinseth@gmail.com"

export default function OwnerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<Company | null>(null)
  const [freezeReason, setFreezeReason] = useState("")
  const [searching, setSearching] = useState("")
  const [filterSubscription, setFilterSubscription] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [showFrozenOnly, setShowFrozenOnly] = useState(false)

  const user = getUser()
  const token = getToken()

  useEffect(() => {
    // Check if user is owner
    if (!user || !token) {
      setTimeout(() => {
        toast({ description: "Please log in first", variant: "destructive" })
        router.push("/auth/login")
      }, 100)
      return
    }

    const userEmail = user.email?.toLowerCase() || ""
    const ownerEmail = OWNER_EMAIL.toLowerCase()

    if (userEmail !== ownerEmail) {
      toast({ description: `Unauthorized: Owner access required. Logged in as ${user.email}`, variant: "destructive" })
      router.push("/auth/login")
      return
    }

    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      console.log("🔍 [Owner] Loading companies...")
      console.log("🔑 [Owner] Token:", token ? `${token.substring(0, 20)}...` : "NO TOKEN")
      console.log("👤 [Owner] User:", user?.email)

      const res = await fetch(`${API_URL}/api/owner/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 [Owner] API Response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("❌ [Owner] API Error:", errorData)
        throw new Error(errorData.message || "Failed to load companies")
      }

      const data = await res.json()
      console.log("✅ [Owner] Companies received:", data.total)
      console.log("📊 [Owner] Company data:", data.data)

      setCompanies(data.data || [])
    } catch (error: any) {
      console.error("❌ [Owner] Error:", error)
      toast({ description: error.message || "Failed to load companies", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleFreezeCompany = async (companyId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/freeze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: freezeReason || "Account frozen by system owner" }),
      })

      if (!res.ok) {
        throw new Error("Failed to freeze company")
      }

      toast({ description: "Company account frozen successfully" })
      setFreezeReason("")
      setSelectedCompanyForModal(null)
      loadCompanies()
    } catch (error: any) {
      toast({ description: error.message || "Failed to freeze company", variant: "destructive" })
    }
  }

  const handleUnfreezeCompany = async (companyId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/unfreeze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to unfreeze company")
      }

      toast({ description: "Company account unfrozen successfully" })
      setSelectedCompanyForModal(null)
      loadCompanies()
    } catch (error: any) {
      toast({ description: error.message || "Failed to unfreeze company", variant: "destructive" })
    }
  }

  const handleUpdatePages = async (companyId: string, enabledPages: string[]) => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/pages`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabledPages }),
      })

      if (!res.ok) {
        throw new Error("Failed to update pages")
      }

      toast({ description: "Company pages updated successfully" })
      loadCompanies()
      // Update the modal's company reference
      const updated = companies.find(c => c._id === companyId)
      if (updated) setSelectedCompanyForModal(updated)
    } catch (error: any) {
      toast({ description: error.message || "Failed to update pages", variant: "destructive" })
    }
  }

  // Filter companies
  let filteredCompanies = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(searching.toLowerCase()) ||
      c.email.toLowerCase().includes(searching.toLowerCase()) ||
      c.slug.toLowerCase().includes(searching.toLowerCase())

    const matchSubscription = !filterSubscription || c.subscription === filterSubscription
    const matchStatus = !filterStatus || c.status === filterStatus
    const matchFrozen = !showFrozenOnly || c.isFrozen

    return matchSearch && matchSubscription && matchStatus && matchFrozen
  })

  const allPages = Object.values(FEATURE_SECTIONS).flatMap(section => section.map(f => f.id))
  const subscriptions = [...new Set(companies.map(c => c.subscription))].sort()
  const statuses = [...new Set(companies.map(c => c.status))].sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading companies...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">🔐 System Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage all registered companies, features, and access permissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{companies.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{companies.filter((c) => !c.isFrozen).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900">Frozen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{companies.filter((c) => c.isFrozen).length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-900">Suspended</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{companies.filter((c) => c.status === "suspended").length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{companies.reduce((sum, c) => sum + (c.employeeCount || 0), 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies by name, email, or slug..."
              value={searching}
              onChange={(e) => setSearching(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>

            {subscriptions.length > 0 && (
              <select
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
                className="text-sm px-3 py-1 border rounded-md bg-white"
              >
                <option value="">All Subscriptions</option>
                {subscriptions.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}

            {statuses.length > 0 && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm px-3 py-1 border rounded-md bg-white"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowFrozenOnly(!showFrozenOnly)}
              className={`text-sm px-3 py-1 rounded-md border transition ${
                showFrozenOnly ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {showFrozenOnly ? "Showing Frozen Only" : "Show Frozen Only"}
            </button>
          </div>
        </div>

        {/* Companies List */}
        <div className="space-y-4">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-lg">No companies found</p>
                {(searching || filterSubscription || filterStatus || showFrozenOnly) && (
                  <button
                    onClick={() => {
                      setSearching("")
                      setFilterSubscription("")
                      setFilterStatus("")
                      setShowFrozenOnly(false)
                    }}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCompanies.map((company) => (
                <Card
                  key={company._id}
                  className={`transition cursor-pointer hover:shadow-lg ${
                    company.isFrozen ? "border-red-300 bg-red-50" : "hover:border-gray-400"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          {company.isFrozen && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                              <Lock className="h-3 w-3 mr-1" />
                              Frozen
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{company.subscription}</Badge>
                          <Badge className="capitalize">{company.status}</Badge>
                        </div>
                        <CardDescription className="mt-1 text-xs sm:text-sm">{company.email}</CardDescription>
                        {company.isFrozen && company.frozenReason && (
                          <div className="flex items-start gap-2 mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{company.frozenReason}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCompanyForModal(company)}
                        className="whitespace-nowrap gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Quick Info */}
                  <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-2 border-t pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="font-medium">Employees:</span> {company.employeeCount || 0}/{company.maxEmployees || "∞"}
                      </div>
                      <div>
                        <span className="font-medium">Industry:</span> {company.industry || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Features Enabled:</span> {company.enabledPages?.length || 0}/{allPages.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Management Modal */}
      {selectedCompanyForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col">
            {/* Header with gradient background - Fixed */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 flex items-start justify-between flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">{selectedCompanyForModal.name}</h2>
                <p className="text-blue-100 text-sm">{selectedCompanyForModal.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">{selectedCompanyForModal.subscription}</Badge>
                  <Badge className="bg-blue-400 hover:bg-blue-500 capitalize text-xs">{selectedCompanyForModal.status}</Badge>
                  {selectedCompanyForModal.isFrozen && (
                    <Badge className="bg-red-500 hover:bg-red-600 text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Frozen
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCompanyForModal(null)}
                className="text-white hover:bg-blue-800 hover:text-white rounded-full flex-shrink-0"
              >
                <span className="text-lg">✕</span>
              </Button>
            </div>

            {/* Scrollable Content Area */}
            <CardContent className="flex-1 overflow-y-auto space-y-6 p-5">
              {/* Company Info Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600 font-bold">ℹ</span>
                  Company Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedCompanyForModal.industry || "—"}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employees</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedCompanyForModal.employeeCount || 0} / {selectedCompanyForModal.maxEmployees || "∞"}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedCompanyForModal.phone || "—"}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Registered</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{new Date(selectedCompanyForModal.createdAt!).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subscription</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1 capitalize">{selectedCompanyForModal.subscription}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{selectedCompanyForModal.status}</p>
                  </div>
                </div>
              </div>

              {/* Feature Access Control */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-600 font-bold">✓</span>
                  Feature Access
                </h3>
                <div className="space-y-3">
                  {Object.entries(FEATURE_SECTIONS).map(([section, features]) => (
                    <div key={section} className="pb-3 border-b last:border-0">
                      <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">{section}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {features.map((feature) => (
                          <label
                            key={feature.id}
                            className="flex items-center gap-2 cursor-pointer p-2 rounded-md bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition text-xs"
                          >
                            <Checkbox
                              checked={selectedCompanyForModal.enabledPages?.includes(feature.id) ?? true}
                              onCheckedChange={(checked) => {
                                const currentPages = selectedCompanyForModal.enabledPages || allPages
                                const newPages = checked
                                  ? [...currentPages, feature.id]
                                  : currentPages.filter((p) => p !== feature.id)
                                handleUpdatePages(selectedCompanyForModal._id, newPages)
                              }}
                            />
                            <span className="font-medium text-gray-700">{feature.icon} {feature.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Control Section */}
              <div className={`rounded-lg p-4 border-2 ${selectedCompanyForModal.isFrozen ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${selectedCompanyForModal.isFrozen ? 'bg-red-500' : 'bg-amber-500'}`}>
                    ⚙
                  </span>
                  Account Control
                </h3>
                {selectedCompanyForModal.isFrozen ? (
                  <div className="space-y-2">
                    {selectedCompanyForModal.frozenReason && (
                      <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-800">
                        <p className="font-medium mb-1">Freeze Reason:</p>
                        <p>{selectedCompanyForModal.frozenReason}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white font-medium w-full"
                      onClick={() => handleUnfreezeCompany(selectedCompanyForModal._id)}
                    >
                      <Unlock className="h-3 w-3" />
                      Unfreeze Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Freeze Reason (Optional)</label>
                      <Input
                        placeholder="e.g., Non-payment, breach of contract"
                        value={freezeReason}
                        onChange={(e) => setFreezeReason(e.target.value)}
                        className="w-full text-xs h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 bg-red-600 hover:bg-red-700 text-white font-medium w-full"
                      onClick={() => handleFreezeCompany(selectedCompanyForModal._id)}
                    >
                      <Lock className="h-3 w-3" />
                      Freeze Account
                    </Button>
                    <p className="text-xs text-gray-600 mt-1">⚠️ Freezing will block all access</p>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Footer - Fixed */}
            <div className="border-t px-5 py-3 flex justify-end gap-2 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCompanyForModal(null)}
                className="font-medium text-xs"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
