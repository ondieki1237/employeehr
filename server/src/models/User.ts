import mongoose, { Schema } from "mongoose"
import type { IUser } from "../types/interfaces"

const userSchema = new Schema<IUser>(
  {
    org_id: { type: String, required: true, index: true },
    employee_id: { type: String, unique: true, sparse: true }, // Unique employee ID for login (e.g., EMP001)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "company_admin", "manager", "employee", "hr"],
      default: "employee",
    },
    department: { type: String },
    position: { type: String }, // Job title
    manager_id: { type: String },
    avatar: { type: String },
    phone: { type: String },
    dateOfJoining: { type: Date },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
  },
  { timestamps: true },
)

// Compound index for org_id and email
userSchema.index({ org_id: 1, email: 1 })
// Index for employee_id lookups
userSchema.index({ employee_id: 1 })

export const User = mongoose.model<IUser>("User", userSchema)
