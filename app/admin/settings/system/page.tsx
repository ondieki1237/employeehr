"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Settings } from "lucide-react"

export default function SystemSettingsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Settings className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">High-level system configuration</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/settings/company")}>Company Branding</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use Company Branding to control primary/secondary colors and logo. These apply across all users in your organization.</p>
            <Button className="mt-2" onClick={() => router.push("/admin/settings/company")}>Go to Company Branding</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults (Coming soon)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            - Default landing pages per role<br />
            - Locale and timezone<br />
            - Email templates overrides
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
