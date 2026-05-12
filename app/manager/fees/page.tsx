"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function FeesPage() {
  return (
    <ManagerSectionPage
      title="Fee Management"
      description="Oversee fee structures, payments, balances, and financial accountability records."
      actions={[
        { label: "Payment Records", href: "/manager/supervision" },
        { label: "Student Accounts", href: "/manager/students" },
      ]}
      items={[
        { title: "Billing", description: "Define fee structures and billing cycles." },
        { title: "Payments", description: "Track receipts, confirmations, and pending balances." },
        { title: "Reconciliation", description: "Review financial summaries and exceptions." },
      ]}
    />
  )
}
