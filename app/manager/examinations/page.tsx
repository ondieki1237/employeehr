"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function ExaminationsPage() {
  return (
    <ManagerSectionPage
      title="Examinations"
      description="Plan examinations, monitor results, and support academic assessment workflows."
      actions={[
        { label: "Results Summary", href: "/manager/supervision" },
        { label: "Student Records", href: "/manager/students" },
      ]}
      items={[
        { title: "Exam Setup", description: "Create schedules and define assessment windows." },
        { title: "Marking", description: "Coordinate marking, moderation, and review." },
        { title: "Results", description: "Publish results and track performance trends." },
      ]}
    />
  )
}
