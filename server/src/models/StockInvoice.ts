import mongoose, { Schema } from "mongoose"

interface IInvoiceItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface IInvoiceClient {
  name: string
  number: string
  location: string
}

export interface IStockInvoice {
  _id?: string
  org_id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  quotationId?: string
  quotationNumber?: string
  client: IInvoiceClient
  items: IInvoiceItem[]
  subTotal: number
  status: "issued" | "paid" | "cancelled"
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const stockInvoiceSchema = new Schema<IStockInvoice>(
  {
    org_id: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    deliveryNoteNumber: { type: String, required: true, index: true },
    quotationId: { type: String },
    quotationNumber: { type: String },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
    },
    items: { type: [invoiceItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["issued", "paid", "cancelled"],
      default: "issued",
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockInvoiceSchema.index({ org_id: 1, invoiceNumber: 1 }, { unique: true })
stockInvoiceSchema.index({ org_id: 1, deliveryNoteNumber: 1 }, { unique: true })

export const StockInvoice = mongoose.model<IStockInvoice>("StockInvoice", stockInvoiceSchema)
