import mongoose, { Schema, type Document } from "mongoose"
import type { ICompany } from "../types/interfaces"

const DEFAULT_ADMIN_SECTIONS = [
  "CORE",
  "RECRUITMENT",
  "EMPLOYEE MANAGEMENT",
  "INVENTORY MANAGER",
  "ACCOUNTS",
  "PERFORMANCE",
  "SYSTEM",
]

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
    invoiceSettings: {
      invoiceEmail: { type: String },
      contactPhone: { type: String },
      officeLocation: { type: String },
      contactEmail: { type: String },
      termsAndConditions: { type: String },
      includeQuotationReference: { type: Boolean, default: true },
      includeDeliveryNoteNumber: { type: Boolean, default: true },
      includePreparedBy: { type: Boolean, default: true },
      includeVat: { type: Boolean, default: true },
      includePaymentChannels: { type: Boolean, default: true },
      paymentChannels: {
        type: [
          {
            channelName: { type: String },
            bankName: { type: String },
            accountName: { type: String },
            accountNumber: { type: String },
            branch: { type: String },
            notes: { type: String },
          },
        ],
        default: [],
      },
    },
    dispatchSmsSettings: {
      officePhone: { type: String },
      messageTemplate: { type: String },
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
    pageAccessSettings: {
      adminSectionsByRole: {
        company_admin: { type: [String], default: DEFAULT_ADMIN_SECTIONS },
        hr: { type: [String], default: DEFAULT_ADMIN_SECTIONS },
        manager: { type: [String], default: [] },
        employee: { type: [String], default: [] },
      },
      adminSectionsByUser: {
        type: Map,
        of: [String],
        default: {},
      },
    },
  },
  { timestamps: true },
)

export const Company = mongoose.model<ICompany>("Company", companySchema)
