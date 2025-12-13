// Authentication & Users
export interface IUser {
  _id?: string
  org_id: string
  employee_id?: string // Unique employee ID for login (e.g., EMP001)
  firstName: string
  lastName: string
  email: string
  password: string
  role: "super_admin" | "company_admin" | "manager" | "employee" | "hr"
  department?: string
  position?: string // Job title
  manager_id?: string
  avatar?: string
  phone?: string
  dateOfJoining?: Date
  status: "active" | "inactive" | "pending"
  createdAt?: Date
  updatedAt?: Date
}

export interface ICompany {
  _id?: string
  name: string
  slug: string // Unique company identifier for login URLs (e.g., 'acme-corp')
  email: string
  phone: string
  website?: string
  industry: string
  employeeCount: number
  logo?: string
  primaryColor?: string // Company branding color
  secondaryColor?: string
  subscription: "starter" | "professional" | "enterprise"
  status: "active" | "suspended" | "inactive"
  createdAt?: Date
  updatedAt?: Date
}

// Performance & KPIs
export interface IKPI {
  _id?: string
  org_id: string
  name: string
  description: string
  category: string // Sales, Quality, Attendance, Customer Service, etc.
  weight: number // 0-100, percentage
  target: number
  unit: string // %, quantity, hours, etc.
  createdAt?: Date
  updatedAt?: Date
}

export interface IPerformance {
  _id?: string
  org_id: string
  user_id: string
  period: string // "2025-Q1", "2025-01", etc.
  kpi_scores: {
    kpi_id: string
    score: number // 0-100
    achieved: number
    target: number
  }[]
  overall_score: number // weighted average
  attendance_score: number
  feedback_score: number
  status: "pending" | "completed" | "reviewed"
  reviewed_by?: string
  reviewedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

// PDP (Personal Development Plan)
export interface IPDP {
  _id?: string
  org_id: string
  user_id: string
  period: string // "2025-Q1", "2025", etc.
  title: string
  description: string
  goals: {
    _id?: string
    title: string
    description: string
    linkedKPI?: string
    targetDate: Date
    progress: number // 0-100
    status: "not_started" | "in_progress" | "completed" | "at_risk"
    milestones: {
      _id?: string
      title: string
      dueDate: Date
      completed: boolean
      completedAt?: Date
    }[]
  }[]
  overallProgress: number
  status: "draft" | "submitted" | "approved" | "rejected" | "completed"
  manager_id?: string
  manager_feedback?: string
  approvedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

// Awards & Recognition
export interface IAward {
  _id?: string
  org_id: string
  name: string
  description: string
  type: "monthly" | "quarterly" | "yearly" | "special" | "recognition"
  criteria: string
  icon?: string
  created_at?: Date
  updated_at?: Date
}

export interface IAwardNomination {
  _id?: string
  org_id: string
  award_id: string
  user_id: string // recipient
  nominator_id?: string // who nominated
  period: string
  score: number // automated score
  reason: string
  status: "pending" | "approved" | "rejected"
  certificate_url?: string
  createdAt?: Date
  updatedAt?: Date
}

// Feedback & Reviews
export interface IFeedback {
  _id?: string
  org_id: string
  from_user_id: string
  to_user_id: string
  rating: number // 1-5
  type: "general" | "praise" | "constructive" | "recognition"
  feedback_text: string
  isAnonymous: boolean
  status: "pending" | "delivered"
  createdAt?: Date
  updatedAt?: Date
}

// Attendance
export interface IAttendance {
  _id?: string
  org_id: string
  user_id: string
  date: Date
  status: "present" | "absent" | "late" | "half_day" | "leave"
  hoursWorked?: number
  remarks?: string
  createdAt?: Date
  updatedAt?: Date
}

// Learning & Development
export interface ILearningRequest {
  _id?: string
  org_id: string
  user_id: string
  course_name: string
  description: string
  budget_required: number
  target_date: Date
  linked_pdp_goal?: string
  status: "pending" | "approved" | "rejected" | "completed"
  approved_by?: string
  approval_comments?: string
  completion_certificate?: string
  createdAt?: Date
  updatedAt?: Date
}

// Notifications
export interface INotification {
  _id?: string
  org_id: string
  user_id: string
  title: string
  message: string
  type: "info" | "alert" | "reminder" | "achievement"
  related_entity_type?: string // PDP, Performance, Award, etc.
  related_entity_id?: string
  isRead: boolean
  createdAt?: Date
}

// JWT Payload
export interface IJWTPayload {
  userId: string
  org_id: string
  email: string
  role: string
}

// API Response
export interface IAPIResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
}
