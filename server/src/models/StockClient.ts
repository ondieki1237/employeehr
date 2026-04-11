import mongoose, { Schema } from "mongoose"

export interface IStockClient {
  _id?: string
  org_id: string
  sourceName: string
  sourceNumber: string
  sourceLocation: string
  legalName: string
  kraPin: string
  email?: string
  branchId?: string
  hasKraDetails: boolean
  createdBy: string
  updatedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockClientSchema = new Schema<IStockClient>(
  {
    org_id: { type: String, required: true, index: true },
    sourceName: { type: String, required: true },
    sourceNumber: { type: String, required: true },
    sourceLocation: { type: String, required: true },
    legalName: { type: String, required: true },
    kraPin: { type: String, required: true },
    email: { type: String },
    branchId: { type: String },
    hasKraDetails: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockClientSchema.index(
  { org_id: 1, sourceName: 1, sourceNumber: 1, sourceLocation: 1 },
  { unique: true },
)

export const StockClient = mongoose.model<IStockClient>("StockClient", stockClientSchema)
