import { z } from "zod"

export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
  companyName: z.string().min(2, "Company name required").max(100),
  companyIndustry: z.enum(["Technology", "Finance", "Healthcare", "Retail", "Manufacturing", "Other"]),
  adminFirstName: z.string().min(2).max(50),
  adminLastName: z.string().min(2).max(50),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const createKPISchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(500),
  category: z.enum(["Sales", "Quality", "Attendance", "Customer", "Innovation", "Leadership"]),
  weight: z.number().min(0).max(100),
  targetValue: z.number().min(0),
})

export const createPDPSchema = z.object({
  employeeId: z.string(),
  title: z.string().min(5).max(200),
  goals: z.array(z.string().min(10)),
  timeline: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
})

export const performanceEvaluationSchema = z.object({
  employeeId: z.string(),
  overallScore: z.number().min(0).max(10),
  kpiScores: z.record(z.number().min(0).max(10)),
  strengths: z.string().min(10).max(1000),
  improvements: z.string().min(10).max(1000),
})

export const feedbackSchema = z.object({
  recipientId: z.string(),
  feedbackType: z.enum(["General", "Praise", "Constructive", "Recognition"]),
  rating: z.number().min(1).max(5),
  content: z.string().min(10).max(2000),
})

export const attendanceSchema = z.object({
  employeeId: z.string(),
  date: z.string().date(),
  status: z.enum(["Present", "Absent", "Leave", "Half-day"]),
  hoursWorked: z.number().min(0).max(24).optional(),
})

export const awardNominationSchema = z.object({
  nomineeId: z.string(),
  nominatorId: z.string(),
  awardType: z.string().min(3).max(100),
  reason: z.string().min(20).max(1000),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateKPIInput = z.infer<typeof createKPISchema>
export type CreatePDPInput = z.infer<typeof createPDPSchema>
export type PerformanceEvaluationInput = z.infer<typeof performanceEvaluationSchema>
export type FeedbackInput = z.infer<typeof feedbackSchema>
export type AttendanceInput = z.infer<typeof attendanceSchema>
export type AwardNominationInput = z.infer<typeof awardNominationSchema>
