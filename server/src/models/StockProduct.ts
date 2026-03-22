import mongoose, { Schema } from "mongoose"

export interface IStockProduct {
  _id?: string
  org_id: string
  name: string
  category: string
  startingPrice: number
  sellingPrice: number
  minAlertQuantity: number
  currentQuantity: number
  assignedUsers: string[]
  expiryEnabled?: boolean
  expiryDate?: Date | null
  expiryReminderDays?: number
  expiryLastReminderOn?: string | null
  createdBy: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const stockProductSchema = new Schema<IStockProduct>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    startingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    minAlertQuantity: { type: Number, required: true, min: 0, default: 0 },
    currentQuantity: { type: Number, required: true, min: 0, default: 0 },
    assignedUsers: [{ type: String }],
    expiryEnabled: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    expiryReminderDays: { type: Number, min: 0, default: 7 },
    expiryLastReminderOn: { type: String, default: null },
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

stockProductSchema.index({ org_id: 1, category: 1 })
stockProductSchema.index({ org_id: 1, name: 1 })
stockProductSchema.index({ org_id: 1, expiryEnabled: 1, expiryDate: 1 })

export const StockProduct = mongoose.model<IStockProduct>("StockProduct", stockProductSchema)
