"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { AlertCircle, Lock, Unlock, Trash2, Plus } from "lucide-react"
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
  createdAt?: string
}

const AVAILABLE_PAGES = [
  "dashboard",
  "attendance",
  "leave",
  "performance",
  "kpis",
  "feedback",
  "meetings",
  "stock",
  "payroll",
  "recruitment",
  "communications",
  "reports",
]

const OWNER_EMAIL = "bellarinseth@gmail.com"

export default function OwnerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null)
  const [freezeReason, setFreezeReason] = useState("")
  const [searching, setSearching] = useState("")

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
      const res = await fetch(`${API_URL}/api/owner/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error("Failed to load companies")
      }

      const data = await res.json()
      setCompanies(data.data || [])
    } catch (error: any) {
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
    } catch (error: any) {
      toast({ description: error.message || "Failed to update pages", variant: "destructive" })
    }
  }

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searching.toLowerCase()) || c.email.toLowerCase().includes(searching.toLowerCase()),
  )

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
          <h1 className="text-4xl font-bold tracking-tight">System Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage all registered companies and their access permissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{companies.filter((c) => !c.isFrozen).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Frozen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{companies.filter((c) => c.isFrozen).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {companies.filter((c) => c.status === "suspended").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div>
          <Input
            placeholder="Search companies by name or email..."
            value={searching}
            onChange={(e) => setSearching(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Companies List */}
        <div className="space-y-4">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No companies found</p>
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company) => (
              <Card key={company._id} className={company.isFrozen ? "border-red-200 bg-red-50" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle>{company.name}</CardTitle>
                        {company.isFrozen && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">Frozen</span>}
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{company.subscription}</span>
                      </div>
                      <CardDescription className="mt-1">{company.email}</CardDescription>
                      {company.isFrozen && company.frozenReason && (
                        <div className="flex items-start gap-2 mt-2 text-sm text-red-700 bg-red-100 p-2 rounded">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>{company.frozenReason}</div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedCompanyId(expandedCompanyId === company._id ? null : company._id)}
                    >
                      {expandedCompanyId === company._id ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {expandedCompanyId === company._id && (
                  <CardContent className="space-y-6 border-t pt-6">
                    {/* Company Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Industry</label>
                        <p className="text-muted-foreground">{company.industry || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <p className="text-muted-foreground capitalize">{company.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <p className="text-muted-foreground">{company.phone || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registered</label>
                        <p className="text-muted-foreground">{new Date(company.createdAt!).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Page Access Control */}
                    <div>
                      <label className="text-sm font-bold mb-3 block">Accessible Pages</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AVAILABLE_PAGES.map((page) => (
                          <label key={page} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={company.enabledPages?.includes(page) ?? true}
                              onCheckedChange={(checked) => {
                                const currentPages = company.enabledPages || AVAILABLE_PAGES
                                const newPages = checked
                                  ? [...currentPages, page]
                                  : currentPages.filter((p) => p !== page)
                                handleUpdatePages(company._id, newPages)
                              }}
                            />
                            <span className="text-sm capitalize">{page}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Freeze/Unfreeze Section */}
                    <div className="border-t pt-4">
                      <label className="text-sm font-bold mb-3 block">Account Control</label>
                      {company.isFrozen ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleUnfreezeCompany(company._id)}
                        >
                          <Unlock className="h-4 w-4" />
                          Unfreeze Account
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="Reason for freezing (optional)"
                            value={selectedCompany?._id === company._id ? freezeReason : ""}
                            onChange={(e) => {
                              setSelectedCompany(company)
                              setFreezeReason(e.target.value)
                            }}
                            className="w-full"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-2"
                            onClick={() => {
                              setSelectedCompany(company)
                              handleFreezeCompany(company._id)
                            }}
                          >
                            <Lock className="h-4 w-4" />
                            Freeze Account
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
