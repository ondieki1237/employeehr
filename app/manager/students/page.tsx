"use client"

import ManagerSectionPage from "@/components/manager/section-page"

export default function StudentsPage() {
  return (
    <ManagerSectionPage
      title="Students"
      description="Manage admissions, profiles, attendance, performance, and student support records."
      actions={[
        { label: "Add Student", href: "/manager/evaluations" },
        { label: "Attendance Overview", href: "/manager/supervision" },
      ]}
      items={[
        { title: "Admissions", description: "Track new admissions and enrollment status." },
        { title: "Profiles", description: "Maintain student records and academic details." },
        { title: "Attendance", description: "Review daily attendance and exception cases." },
      ]}
    />
  )
}
