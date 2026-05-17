"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Team Members</h2>
        <p className="mt-1 text-sm text-slate-600">Manage and view all team members under your supervision</p>
      </div>

      <Card className="border-border/70 bg-white p-6 shadow-sm">
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">Team member management system coming soon</p>
          <Button disabled variant="outline">
            Add Team Member
          </Button>
        </div>
      </Card>
    </div>
  )
}
