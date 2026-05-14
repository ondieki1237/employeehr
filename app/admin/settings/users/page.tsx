"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface UserRow {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
  signatureUrl?: string
  promptStampOnPdf?: boolean
}

export default function AdminUserSettings() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const token = getToken()

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/users`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to load users")
      setUsers(json.data || [])
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to load users", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const uploadSignature = async (userId: string, file?: File | null) => {
    if (!file) return
    try {
      const form = new FormData()
      form.append("signature", file)
      const res = await fetch(`${API_URL}/api/users/${userId}/signature`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Upload failed")
      toast({ title: "Uploaded", description: "Signature uploaded" })
      loadUsers()
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Failed to upload signature", variant: "destructive" })
    }
  }

  const toggleStampPref = async (userId: string, value: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ promptStampOnPdf: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to update user")
      toast({ title: "Saved", description: "User preference updated" })
      loadUsers()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update user", variant: "destructive" })
    }
  }

  if (loading) return <div className="p-6">Loading users...</div>

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">User Settings</h1>
      <p className="text-sm text-muted-foreground">Manage user signatures and PDF stamp preferences</p>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="flex items-center gap-4 rounded-md border p-3">
                <div className="flex-1">
                  <div className="font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-muted-foreground">{user.email} {user.role ? `· ${user.role}` : ""}</div>
                </div>

                <div className="w-48">
                  <Label>Signature</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => uploadSignature(user._id, e.target.files?.[0] || null)} />
                  </div>
                  {user.signatureUrl ? <div className="text-xs text-muted-foreground mt-1">Uploaded</div> : <div className="text-xs text-muted-foreground mt-1">Not set</div>}
                </div>

                <div className="w-48 flex items-center gap-2">
                  <Label className="mb-0">Prompt Stamp</Label>
                  <Switch checked={!!user.promptStampOnPdf} onCheckedChange={(val) => toggleStampPref(user._id, Boolean(val))} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
