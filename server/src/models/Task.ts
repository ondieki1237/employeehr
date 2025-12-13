import mongoose, { Schema } from "mongoose"

export interface ITask {
  _id?: string
  org_id: string
  title: string
  description: string
  assigned_to: string // user_id
  assigned_by: string // user_id (admin/manager)
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  due_date?: Date
  completed_at?: Date
  notes?: string
  attachments?: string[]
  createdAt?: Date
  updatedAt?: Date
}

const taskSchema = new Schema<ITask>(
  {
    org_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assigned_to: { type: String, required: true, index: true },
    assigned_by: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    due_date: { type: Date },
    completed_at: { type: Date },
    notes: { type: String },
    attachments: [{ type: String }],
  },
  { timestamps: true },
)

// Compound index for efficient queries
taskSchema.index({ org_id: 1, assigned_to: 1 })
taskSchema.index({ org_id: 1, status: 1 })

export const Task = mongoose.model<ITask>("Task", taskSchema)
