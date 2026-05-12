"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function FacilitatorsPage() {
  return (
    <ManagerSectionPage
      title="Facilitators"
      description="Manage teachers, teaching allocations, timetables, and supervisory support."
      actions={[
        { label: "Assign Classes", href: "/manager/resources" },
        { label: "Review Performance", href: "/manager/evaluations" },
      ]}
      items={[
        { title: "Teacher Allocation", description: "Assign facilitators to classes and sessions." },
        { title: "Timetables", description: "Organize lesson schedules and availability." },
        { title: "Support", description: "Track supervision and ongoing staff needs." },
      ]}
    />
  )
}
