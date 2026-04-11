"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, Save, Lock } from "lucide-react"
import { companyApi, usersApi } from "@/lib/api"
import { getUser } from "@/lib/auth"

type RoleKey = "company_admin" | "hr" | "manager" | "employee"

interface AccessState {
  company_admin: string[]
  hr: string[]
  manager: string[]
  employee: string[]
}

interface SystemUser {
  _id: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

const FALLBACK_SECTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
]

const EDITABLE_ROLES: Array<{ key: Exclude<RoleKey, "company_admin">; label: string }> = [
  { key: "hr", label: "HR" },
  { key: "manager", label: "Manager" },
  { key: "employee", label: "Employee" },
]

export default function PageAccessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [availableSections, setAvailableSections] = useState<string[]>(FALLBACK_SECTIONS)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [userOverrides, setUserOverrides] = useState<Record<string, string[]>>({})
  const [accessState, setAccessState] = useState<AccessState>({
    company_admin: FALLBACK_SECTIONS,
    hr: FALLBACK_SECTIONS,
    manager: [],
    employee: [],
  })

  const currentUser = useMemo(() => getUser(), [])
  const canEdit = currentUser?.role === "company_admin"

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setError("")

        const response = await companyApi.getPageAccess()
        if (response.success) {
          const sections = response.data?.availableSections || FALLBACK_SECTIONS
          const byRole = response.data?.adminSectionsByRole || {}
          const byUser = response.data?.adminSectionsByUser || {}

          setAvailableSections(sections)
          setAccessState({
            company_admin: byRole.company_admin || sections,
            hr: byRole.hr || sections,
            manager: byRole.manager || [],
            employee: byRole.employee || [],
          })
          setUserOverrides(byUser)
        }

        const usersResponse = await usersApi.getAll()
        if (usersResponse.success) {
          setSystemUsers(usersResponse.data || [])
        }
      } catch (loadError: any) {
        setError(loadError?.message || "Failed to load page access settings")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const toggleSectionForRole = (role: Exclude<RoleKey, "company_admin">, section: string) => {
    if (!canEdit) return

    setAccessState((prev) => {
      const exists = prev[role].includes(section)
      return {
        ...prev,
        [role]: exists ? prev[role].filter((item) => item !== section) : [...prev[role], section],
      }
    })
  }

  const selectedUser = systemUsers.find((user) => user._id === selectedUserId)

  const selectedUserRole = (selectedUser?.role || "") as Exclude<RoleKey, "company_admin"> | ""

  const selectedUserEffectiveSections = selectedUserId
    ? (userOverrides[selectedUserId] && userOverrides[selectedUserId].length > 0
        ? userOverrides[selectedUserId]
        : selectedUserRole && selectedUserRole in accessState
          ? accessState[selectedUserRole as Exclude<RoleKey, "company_admin">]
          : [])
    : []

  const toggleSectionForUser = (userId: string, section: string) => {
    if (!canEdit || !userId) return

    setUserOverrides((prev) => {
      const current = prev[userId] || []
      const exists = current.includes(section)
      const next = exists ? current.filter((item) => item !== section) : [...current, section]
      return {
        ...prev,
        [userId]: next,
      }
    })
  }

  const resetUserToRoleDefault = (userId: string) => {
    if (!canEdit || !userId) return
    setUserOverrides((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  const handleSave = async () => {
    try {
      if (!canEdit) return

      setIsSaving(true)
      setError("")
      setSuccessMessage("")

      const response = await companyApi.updatePageAccess({
        adminSectionsByRole: {
          hr: accessState.hr,
          manager: accessState.manager,
          employee: accessState.employee,
        },
        adminSectionsByUser: userOverrides,
      })

      if (response.success) {
        setSuccessMessage("Page visibility updated successfully")
      }
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save page access settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Page Access Control</h1>
          <p className="text-muted-foreground">
            Choose which admin page categories are visible to each role.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <ShieldCheck className="w-3 h-3 mr-1" />
          SYSTEM
        </Badge>
      </div>

      {!canEdit && (
        <Alert>
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Only Company Admin can update these settings. You can view but not modify.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role-based visibility matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border p-4 bg-muted/20">
            <p className="text-sm font-medium">Company Admin</p>
            <p className="text-xs text-muted-foreground mt-1">
              Company Admin always has access to all categories.
            </p>
          </div>

          {EDITABLE_ROLES.map((role) => (
            <div key={role.key} className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{role.label}</h3>
                <Badge variant="secondary">{accessState[role.key].length} selected</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableSections.map((section) => {
                  const checked = accessState[role.key].includes(section)
                  return (
                    <label
                      key={`${role.key}-${section}`}
                      className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSectionForRole(role.key, section)}
                        disabled={!canEdit}
                      />
                      <span className="text-sm">{section}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">User-specific allocation</h3>
                <p className="text-xs text-muted-foreground">
                  Override role defaults for one user.
                </p>
              </div>
              {selectedUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetUserToRoleDefault(selectedUserId)}
                  disabled={!canEdit}
                >
                  Reset User Override
                </Button>
              )}
            </div>

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select user to allocate...</option>
              {systemUsers.map((user) => {
                const firstName = user.first_name || user.firstName || ""
                const lastName = user.last_name || user.lastName || ""
                const fullName = `${firstName} ${lastName}`.trim() || user.email || user._id
                return (
                  <option key={user._id} value={user._id}>
                    {fullName} {user.role ? `(${user.role})` : ""}
                  </option>
                )
              })}
            </select>

            {selectedUserId ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {selectedUserEffectiveSections.length} section(s) visible for this user.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSections.map((section) => {
                    const checked = selectedUserEffectiveSections.includes(section)
                    return (
                      <label
                        key={`${selectedUserId}-${section}`}
                        className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSectionForUser(selectedUserId, section)}
                          disabled={!canEdit}
                        />
                        <span className="text-sm">{section}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a user to allocate page categories.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!canEdit || isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Access Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
