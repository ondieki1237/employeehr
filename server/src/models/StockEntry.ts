import mongoose, { Schema } from "mongoose"

export interface IStockEntry {
  _id?: string
  org_id: string
  productId: string
  quantityAdded: number
  expiryEnabled?: boolean
  expiryDate?: Date | null
  expiryReminderDays?: number
  addedBy: string
  note?: string
  createdAt?: Date
  updatedAt?: Date
}

const stockEntrySchema = new Schema<IStockEntry>(
  {
    org_id: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    quantityAdded: { type: Number, required: true, min: 1 },
    expiryEnabled: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    expiryReminderDays: { type: Number, min: 0, default: 7 },
    addedBy: { type: String, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
)

stockEntrySchema.index({ org_id: 1, productId: 1, createdAt: -1 })

export const StockEntry = mongoose.model<IStockEntry>("StockEntry", stockEntrySchema)
