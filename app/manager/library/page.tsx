"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function LibraryPage() {
  return (
    <ManagerSectionPage
      title="Library"
      description="Maintain catalog records, borrowing activity, and access to shared academic materials."
      actions={[
        { label: "Catalog Resources", href: "/manager/resources" },
        { label: "Borrowing Reports", href: "/manager/supervision" },
      ]}
      items={[
        { title: "Catalog", description: "Organize books and learning materials by category." },
        { title: "Borrowing", description: "Track issued items, returns, and overdue records." },
        { title: "Access", description: "Manage usage rules and resource availability." },
      ]}
    />
  )
}
