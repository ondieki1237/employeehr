"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { ArrowLeft, Plus } from "lucide-react"

interface Client {
  key: string
  name: string
  number: string
  location: string
  contactPerson?: string
  source: "stock" | "accounts"
}

export default function NewComplaintPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    clientId: "",
    clientKey: "",
    clientName: "",
    clientNumber: "",
    clientLocation: "",
    title: "",
    description: "",
    complaintCategory: "",
    priority: "medium",
  })

  const { toast } = useToast()

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const [stockRes, accountsRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/clients`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/stock/accounts/clients`, { headers: getAuthHeaders() }),
      ])

      if (!stockRes.ok) throw new Error("Failed to fetch clients")

      const stockResult = await stockRes.json()
      const accountsResult = accountsRes.ok ? await accountsRes.json() : { data: [] }

      const mergedMap = new Map<string, Client>()

      for (const item of stockResult.data || []) {
        const name = String(item?.name || item?.sourceName || "").trim()
        const number = String(item?.number || item?.sourceNumber || "").trim()
        const location = String(item?.location || item?.sourceLocation || "").trim()
        if (!name || !number || !location) continue
        const key = `${name}|${number}|${location}`.toLowerCase()
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            key,
            name,
            number,
            location,
            contactPerson: item?.contactPerson,
            source: "stock",
          })
        }
      }

      for (const row of accountsResult.data || []) {
        const name = String(row?.client?.name || "").trim()
        const number = String(row?.client?.number || "").trim()
        const location = String(row?.client?.location || "").trim()
        if (!name || !number || !location) continue
        const key = `${name}|${number}|${location}`.toLowerCase()
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            key,
            name,
            number,
            location,
            source: "accounts",
          })
        }
      }

      setClients(Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load clients",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const submitComplaint = async () => {
    if (!formData.clientId || !formData.title || !formData.description || !formData.complaintCategory) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch(`${API_URL}/api/complaints`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create complaint")
      const result = await response.json()

      toast({
        title: "Success",
        description: "Complaint created successfully",
      })

      router.push(`/admin/accounts/complaints/${result.data._id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create complaint",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitComplaint()
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Client Complaint</h1>
          <p className="text-sm text-muted-foreground">
            Register and track a new client complaint
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Client <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => {
                  const selected = clients.find((client) => client.key === value)
                  setFormData({
                    ...formData,
                    clientId: value,
                    clientKey: value,
                    clientName: selected?.name || "",
                    clientNumber: selected?.number || "",
                    clientLocation: selected?.location || "",
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.key} value={client.key}>
                      {client.name} ({client.number}) - {client.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Complaint Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Brief summary of the complaint"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Detailed description of the complaint"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={5}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.complaintCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, complaintCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complaint category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor_service">Poor Service</SelectItem>
                  <SelectItem value="delayed_delivery">Delayed Delivery</SelectItem>
                  <SelectItem value="billing_issues">Billing Issues</SelectItem>
                  <SelectItem value="product_defects">Product Defects</SelectItem>
                  <SelectItem value="staff_misconduct">Staff Misconduct</SelectItem>
                  <SelectItem value="technical_problems">Technical Problems</SelectItem>
                  <SelectItem value="warranty_claims">Warranty Claims</SelectItem>
                  <SelectItem value="refund_requests">Refund Requests</SelectItem>
                  <SelectItem value="quality_issues">Quality Issues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitComplaint}
                disabled={creating}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Complaint
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
