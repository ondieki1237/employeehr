"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function ResourcesPage() {
  return (
    <ManagerSectionPage
      title="Resources"
      description="Manage school resources, learning materials, shared assets, and operational inventory."
      actions={[
        { label: "Open Library", href: "/manager/library" },
        { label: "Manage Fees", href: "/manager/fees" },
      ]}
      items={[
        { title: "Learning Materials", description: "Notes, documents, and reference content." },
        { title: "Assets", description: "Shared equipment and school resources." },
        { title: "Requests", description: "Track resource requests and approvals." },
      ]}
    />
  )
}
