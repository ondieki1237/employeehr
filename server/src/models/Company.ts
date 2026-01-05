import mongoose, { Schema, type Document } from "mongoose"
import type { ICompany } from "../types/interfaces"

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true }, // Unique company identifier for login URLs
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    website: { type: String },
    industry: { type: String, required: true },
    employeeCount: { type: Number, required: true },
    logo: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    countryCode: { type: String }, // ISO 2-letter code for Holiday API (e.g., US, KE)
    primaryColor: { type: String, default: "#2563eb" }, // Company branding
    secondaryColor: { type: String, default: "#059669" },
    accentColor: { type: String, default: "#f59e0b" },
    backgroundColor: { type: String, default: "#ffffff" },
    textColor: { type: String, default: "#1f2937" },
    borderRadius: { type: String, default: "0.5rem" },
    fontFamily: { type: String, default: "system-ui" },
    buttonStyle: { type: String, enum: ["rounded", "sharp", "pill"], default: "rounded" },
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
    emailConfig: {
      enabled: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      fromName: { type: String },
      fromEmail: { type: String },
      smtp: {
        host: { type: String },
        port: { type: Number },
        secure: { type: Boolean, default: false },
        username: { type: String },
        password: { type: String }, // Should be encrypted
      },
    },
    setupProgress: {
      completed: { type: Boolean, default: false },
      currentStep: { type: String, default: "companyInfo" },
      steps: {
        companyInfo: { type: Boolean, default: false },
        branding: { type: Boolean, default: false },
        emailConfig: { type: Boolean, default: false },
        employees: { type: Boolean, default: false },
        kpis: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true },
)

export const Company = mongoose.model<ICompany>("Company", companySchema)
