import mongoose, { Schema } from "mongoose"
import type { ICompany } from "../types/interfaces"

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true }, // Unique company identifier for login URLs
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    website: { type: String },
    industry: { type: String, required: true },
    employeeCount: { type: String, required: true },
    logo: { type: String },
    primaryColor: { type: String, default: "#2563eb" }, // Company branding
    secondaryColor: { type: String, default: "#059669" },
    subscription: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
)

// Index for faster slug lookups
companySchema.index({ slug: 1 })

export const Company = mongoose.model<ICompany>("Company", companySchema)
