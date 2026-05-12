"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function SupervisionPage() {
  return (
    <ManagerSectionPage
      title="Supervision"
      description="Handle approvals, discipline, oversight reports, and general school management duties."
      actions={[
        { label: "Discipline View", href: "/manager/students" },
        { label: "Staff Review", href: "/manager/facilitators" },
      ]}
      items={[
        { title: "Approvals", description: "Review and approve operational requests." },
        { title: "Reports", description: "Monitor school activity and exceptions." },
        { title: "Oversight", description: "Keep track of key manager actions and follow-ups." },
      ]}
    />
  )
}
