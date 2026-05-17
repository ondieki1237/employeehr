"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

export default function ApprovalsPage() {
  const approvals = [
    { id: 1, type: "Leave Request", name: "John Doe", days: 5, status: "pending", date: "2026-05-18" },
    { id: 2, type: "Leave Request", name: "Jane Smith", days: 3, status: "pending", date: "2026-05-19" },
    { id: 3, type: "Expense Claim", name: "Mike Johnson", amount: 5500, status: "pending", date: "2026-05-17" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Approvals</h2>
        <p className="mt-1 text-sm text-slate-600">Review and approve pending requests from your team</p>
      </div>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <Card key={approval.id} className="border-border/70 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900">{approval.name}</h3>
                  <Badge variant="outline">{approval.type}</Badge>
                  {approval.status === "pending" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {approval.type === "Leave Request"
                    ? `Requesting ${approval.days} days leave`
                    : `Claiming PKR ${approval.amount?.toLocaleString()}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">Submitted: {new Date(approval.date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-1.5 text-sm font-medium hover:bg-green-100 transition">
                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                  Approve
                </button>
                <button className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-sm font-medium hover:bg-red-100 transition">
                  <XCircle className="h-4 w-4 inline mr-1" />
                  Reject
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
