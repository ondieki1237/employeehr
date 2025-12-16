import mongoose, { Schema } from "mongoose"

export interface IPayroll extends Document {
    org_id: string
    user_id: string
    month: string // e.g., "2025-05"
    base_salary: number
    bonus: number
    deductions: number
    net_pay: number
    currency: string
    status: "draft" | "processed" | "paid"
    generated_at: Date
    paid_at?: Date
    createdAt: Date
    updatedAt: Date
}

const payrollSchema = new Schema<IPayroll>(
    {
        org_id: { type: String, required: true, index: true },
        user_id: { type: String, required: true, index: true },
        month: { type: String, required: true },
        base_salary: { type: Number, required: true },
        bonus: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
        net_pay: { type: Number, required: true },
        currency: { type: String, default: "KES" },
        status: {
            type: String,
            enum: ["draft", "processed", "paid"],
            default: "draft",
        },
        generated_at: { type: Date, default: Date.now },
        paid_at: { type: Date },
    },
    { timestamps: true },
)

// Unique payroll per user per month
payrollSchema.index({ user_id: 1, month: 1 }, { unique: true })

export const Payroll = mongoose.model<IPayroll>("Payroll", payrollSchema)
