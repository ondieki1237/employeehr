import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"
import { StockEntry } from "../models/StockEntry"
import { StockSale } from "../models/StockSale"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockCourier } from "../models/StockCourier"
import { DispatchNotification } from "../models/DispatchNotification"
import { Company } from "../models/Company"
import { User } from "../models/User"
import emailService from "../services/email.service"
import { smsService } from "../services/sms.service"

const ADMIN_ROLES = ["company_admin", "hr"]

function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role)
}

function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

function canManageDispatchForInvoice(req: AuthenticatedRequest, invoice: any) {
  const userId = String(req.user?.userId || "")
  if (!userId) return false
  if (isAdminRole(req.user?.role)) return true
  return String(invoice?.dispatch?.assignedToUserId || "") === userId
}

function computePackingCompletion(
  packingItems: Array<{ requiredQuantity: number; packedQuantity: number }>,
) {
  if (!packingItems.length) return false
  return packingItems.every((item) => Number(item.packedQuantity || 0) >= Number(item.requiredQuantity || 0))
}

function withOptionalDispatchObjects(baseDispatch: any, sourceDispatch: any) {
  const nextDispatch: any = { ...baseDispatch }
  if (sourceDispatch?.courier) nextDispatch.courier = sourceDispatch.courier
  if (sourceDispatch?.delivery) nextDispatch.delivery = sourceDispatch.delivery
  if (sourceDispatch?.transportMeans) nextDispatch.transportMeans = sourceDispatch.transportMeans
  if (sourceDispatch?.dispatchedAt) nextDispatch.dispatchedAt = sourceDispatch.dispatchedAt
  if (sourceDispatch?.dispatchedByUserId) nextDispatch.dispatchedByUserId = sourceDispatch.dispatchedByUserId
  return nextDispatch
}

async function buildQuotationItems(
  orgId: string,
  items: Array<{ productId?: string; productName?: string; quantity: number; unitPrice?: number; isOutsourced?: boolean }>,
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required")
  }

  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))]
  const products = await StockProduct.find({ _id: { $in: productIds }, org_id: orgId }).lean()
  const productMap = new Map(products.map((product) => [String(product._id), product]))

  return items.map((item) => {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Invalid quantity")
    }

    const isOutsourced = Boolean(item.isOutsourced)
    if (isOutsourced) {
      const manualName = String(item.productName || "").trim()
      if (!manualName) {
        throw new Error("Outsourced items require a product name")
      }

      const unitPrice = Number(item.unitPrice)
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for ${manualName}`)
      }

      const fallbackId = `outsourced:${manualName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`

      return {
        productId: String(item.productId || fallbackId),
        productName: manualName,
        quantity,
        unitPrice,
        lineTotal: Number((quantity * unitPrice).toFixed(2)),
        isOutsourced: true,
      }
    }

    const product = productMap.get(String(item.productId))
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`)
    }

    if (!String(product._id)) {
      throw new Error(`Invalid product selection for ${product.name}`)
    }

    const unitPrice = item.unitPrice !== undefined && item.unitPrice !== null
      ? Number(item.unitPrice)
      : Number(product.sellingPrice)

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for ${product.name}`)
    }

    return {
      productId: String(product._id),
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
      isOutsourced: false,
    }
  })
}

async function sendLowStockAlert(product: any, orgId: string) {
  if (product.currentQuantity > product.minAlertQuantity) return

  const recipients = await User.find({
    org_id: orgId,
    role: { $in: ADMIN_ROLES },
    status: "active",
  })
    .select("email firstName")
    .lean()

  if (!recipients.length) return

  const subject = `Low Stock Alert: ${product.name}`
  const html = `
    <h2>Low Stock Alert</h2>
    <p>The product <strong>${product.name}</strong> has reached the alert threshold.</p>
    <p><strong>Remaining Quantity:</strong> ${product.currentQuantity}</p>
    <p><strong>Alert Threshold:</strong> ${product.minAlertQuantity}</p>
    <p>Advice: Please restock this product soon.</p>
  `

  await Promise.all(
    recipients.map((recipient) =>
      emailService.sendEmail({
        to: recipient.email,
        subject,
        html,
        companyId: orgId,
      }),
    ),
  )
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildDispatchClientMessage(params: {
  clientName?: string
  invoiceNumber: string
  deliveryNoteNumber: string
  courierName: string
  courierContactNumber: string
  officeContactNumber: string
}) {
  const greetingName = String(params.clientName || "Client").trim() || "Client"
  return [
    `Hello ${greetingName}, your package for invoice ${params.invoiceNumber} (DN ${params.deliveryNoteNumber}) has been dispatched.`,
    `Courier: ${params.courierName} (${params.courierContactNumber}).`,
    `For inquiries, call office: ${params.officeContactNumber}.`,
    "Thank you.",
  ].join(" ")
}

async function sendExpiryReminderEmail(product: any, orgId: string) {
  if (!product.expiryEnabled || !product.expiryDate) return false
  if (Number(product.currentQuantity) <= 0) return false

  const reminderDays = Number.isFinite(Number(product.expiryReminderDays))
    ? Number(product.expiryReminderDays)
    : 7

  const today = new Date()
  const todayKey = toDateKey(today)
  const expiryDate = new Date(product.expiryDate)

  const reminderDate = new Date(expiryDate)
  reminderDate.setDate(reminderDate.getDate() - Math.max(0, reminderDays))

  if (today < reminderDate) return false
  if (product.expiryLastReminderOn === todayKey) return false

  const recipients = await User.find({
    org_id: orgId,
    role: { $in: ADMIN_ROLES },
    status: "active",
  })
    .select("email firstName")
    .lean()

  if (!recipients.length) return false

  const isExpired = today > expiryDate
  const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const subject = isExpired
    ? `Expired Stock Alert: ${product.name}`
    : `Expiry Reminder: ${product.name} (${Math.max(daysLeft, 0)} day(s) left)`

  const html = `
    <h2>${isExpired ? "Expired Product In Stock" : "Product Expiry Reminder"}</h2>
    <p><strong>Product:</strong> ${product.name}</p>
    <p><strong>Current Quantity:</strong> ${product.currentQuantity}</p>
    <p><strong>Expiry Date:</strong> ${expiryDate.toDateString()}</p>
    <p><strong>Reminder Window:</strong> ${reminderDays} day(s) before expiry</p>
    <p>${isExpired ? "This product is expired and still available in stock." : "This product is nearing expiry and still in stock."}</p>
  `

  await Promise.all(
    recipients.map((recipient) =>
      emailService.sendEmail({
        to: recipient.email,
        subject,
        html,
        companyId: orgId,
      }),
    ),
  )

  product.expiryLastReminderOn = todayKey
  await product.save()
  return true
}

export class StockController {
  static async runExpiryReminderCheck() {
    const products = await StockProduct.find({
      expiryEnabled: true,
      expiryDate: { $ne: null },
      currentQuantity: { $gt: 0 },
      isActive: true,
    })

    let remindersSent = 0
    for (const product of products) {
      const sent = await sendExpiryReminderEmail(product, product.org_id)
      if (sent) remindersSent += 1
    }

    return { checked: products.length, remindersSent }
  }

  static async checkExpiringProducts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can run expiry checks" })
      }

      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const products = await StockProduct.find({
        org_id,
        expiryEnabled: true,
        expiryDate: { $ne: null },
        currentQuantity: { $gt: 0 },
        isActive: true,
      })

      let remindersSent = 0
      for (const product of products) {
        const sent = await sendExpiryReminderEmail(product, org_id)
        if (sent) remindersSent += 1
      }

      return res.status(200).json({
        success: true,
        message: "Expiry check completed",
        data: { checked: products.length, remindersSent },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to run expiry checks" })
    }
  }

  static async createQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId
      if (!org_id || !createdBy) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { clientName, clientNumber, clientLocation, items } = req.body
      if (!clientName || !clientNumber || !clientLocation) {
        return res.status(400).json({ success: false, message: "Client name, number, and location are required" })
      }

      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const subTotal = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

      const quotation = await StockQuotation.create({
        org_id,
        quotationNumber: generateDocumentNumber("QTN"),
        client: {
          name: String(clientName).trim(),
          number: String(clientNumber).trim(),
          location: String(clientLocation).trim(),
        },
        items: normalizedItems,
        subTotal,
        status: "draft",
        createdBy,
      })

      return res.status(201).json({ success: true, data: quotation })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create quotation" })
    }
  }

  static async getQuotations(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const quotations = await StockQuotation.find({ org_id }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: quotations })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch quotations" })
    }
  }

  static async updateQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft quotations can be edited" })
      }

      const { clientName, clientNumber, clientLocation, items } = req.body
      if (!clientName || !clientNumber || !clientLocation) {
        return res.status(400).json({ success: false, message: "Client name, number, and location are required" })
      }

      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const subTotal = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

      quotation.client = {
        name: String(clientName).trim(),
        number: String(clientNumber).trim(),
        location: String(clientLocation).trim(),
      }
      quotation.items = normalizedItems as any
      quotation.subTotal = subTotal

      await quotation.save()

      return res.status(200).json({ success: true, data: quotation })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update quotation" })
    }
  }

  static async getClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const [quotations, invoices, sales] = await Promise.all([
        StockQuotation.find({ org_id }).select("client").lean(),
        StockInvoice.find({ org_id }).select("client").lean(),
        StockSale.find({ org_id, isWalkInClient: { $ne: true } })
          .select("buyerName buyerNumber buyerLocation")
          .lean(),
      ])

      const clientMap = new Map<string, { name: string; number: string; location: string }>()

      for (const quotation of quotations) {
        const client = (quotation as any).client
        if (!client?.name || !client?.number || !client?.location) continue
        const key = `${client.name}|${client.number}|${client.location}`.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            name: client.name,
            number: client.number,
            location: client.location,
          })
        }
      }

      for (const invoice of invoices) {
        const client = (invoice as any).client
        if (!client?.name || !client?.number || !client?.location) continue
        const key = `${client.name}|${client.number}|${client.location}`.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            name: client.name,
            number: client.number,
            location: client.location,
          })
        }
      }

      for (const sale of sales) {
        const name = (sale as any).buyerName
        const number = (sale as any).buyerNumber
        const location = (sale as any).buyerLocation
        if (!name || !number || !location) continue
        const key = `${name}|${number}|${location}`.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, { name, number, location })
        }
      }

      return res.status(200).json({ success: true, data: Array.from(clientMap.values()) })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch clients" })
    }
  }

  static async convertQuotationToInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status === "converted" && quotation.convertedInvoiceId) {
        const existingInvoice = await StockInvoice.findById(quotation.convertedInvoiceId).lean()
        return res.status(200).json({ success: true, data: existingInvoice })
      }

      const stockManagedItems = quotation.items.filter((item: any) => !item.isOutsourced)
      const productIds = [...new Set(stockManagedItems.map((item) => item.productId).filter(Boolean))]
      const products = await StockProduct.find({ _id: { $in: productIds }, org_id })
      const productMap = new Map(products.map((product) => [String(product._id), product]))

      for (const item of stockManagedItems) {
        const product = productMap.get(String(item.productId))
        if (!product) {
          return res.status(400).json({ success: false, message: `Product not found for quotation item: ${item.productName}` })
        }
        if (product.currentQuantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${item.productName}. Available: ${product.currentQuantity}, requested: ${item.quantity}`,
          })
        }
      }

      const invoice = await StockInvoice.create({
        org_id,
        invoiceNumber: generateDocumentNumber("INV"),
        deliveryNoteNumber: generateDocumentNumber("DN"),
        quotationId: String(quotation._id),
        quotationNumber: quotation.quotationNumber,
        client: quotation.client,
        items: quotation.items,
        subTotal: quotation.subTotal,
        status: "issued",
        dispatch: {
          status: "not_assigned",
          packingItems: quotation.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requiredQuantity: item.quantity,
            packedQuantity: 0,
          })),
          packingCompleted: false,
          inquiries: [],
        },
        createdBy: actorId,
      })

      const receiptNumber = generateDocumentNumber("RCP")

      const salesToCreate = stockManagedItems.map((item) => {
        const product = productMap.get(String(item.productId))!
        product.currentQuantity -= item.quantity

        return {
          org_id,
          productId: item.productId,
          quantitySold: item.quantity,
          soldPrice: item.unitPrice,
          soldBy: actorId,
          buyerName: quotation.client.name,
          buyerNumber: quotation.client.number,
          buyerLocation: quotation.client.location,
          isWalkInClient: false,
          isSalesCompany: false,
          quotationId: String(quotation._id),
          invoiceId: String(invoice._id),
          receiptNumber,
          remainingQuantity: product.currentQuantity,
        }
      })

      if (products.length > 0) {
        await Promise.all(products.map((product) => product.save()))
        await Promise.all(products.map((product) => sendLowStockAlert(product, org_id)))
      }

      if (salesToCreate.length > 0) {
        await StockSale.insertMany(salesToCreate)
      }

      quotation.status = "converted"
      quotation.convertedInvoiceId = String(invoice._id)
      await quotation.save()

      return res.status(201).json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to convert quotation" })
    }
  }

  static async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const invoices = await StockInvoice.find({ org_id }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch invoices" })
    }
  }

  static async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      return res.status(200).json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch invoice" })
    }
  }

  static async assignInvoiceToDispatch(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can assign dispatch" })
      }

      const { invoiceId } = req.params
      const { assignedToUserId } = req.body
      if (!assignedToUserId) {
        return res.status(400).json({ success: false, message: "assignedToUserId is required" })
      }

      const [invoice, user] = await Promise.all([
        StockInvoice.findOne({ _id: invoiceId, org_id }).lean(),
        User.findOne({ _id: assignedToUserId, org_id }).select("_id role firstName lastName"),
      ])

      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      if (!user) return res.status(404).json({ success: false, message: "Assigned user not found" })

      const packingItems =
        invoice.dispatch?.packingItems?.length > 0
          ? invoice.dispatch.packingItems
          : invoice.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              requiredQuantity: item.quantity,
              packedQuantity: 0,
            }))

      const updatedInvoice = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            "dispatch.status": "assigned",
            "dispatch.assignedToUserId": String(assignedToUserId),
            "dispatch.assignedByUserId": String(actorId),
            "dispatch.assignedAt": new Date(),
            "dispatch.packingItems": packingItems,
            "dispatch.packingCompleted": false,
            "dispatch.inquiries": invoice.dispatch?.inquiries || [],
          },
          $unset: {
            "dispatch.courier": 1,
            "dispatch.delivery": 1,
            "dispatch.transportMeans": 1,
            "dispatch.dispatchedAt": 1,
            "dispatch.dispatchedByUserId": 1,
          },
        },
        { new: true },
      )

      return res.status(200).json({ success: true, data: updatedInvoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to assign dispatch" })
    }
  }

  static async getMyDispatchInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        query["dispatch.assignedToUserId"] = String(userId)
      }

      const invoices = await StockInvoice.find(query).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch dispatch invoices" })
    }
  }

  static async updateDispatchPacking(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const { items } = req.body

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to update this dispatch" })
      }

      const currentPacking = invoice.dispatch?.packingItems || []
      const packedMap = new Map<string, number>()
      if (Array.isArray(items)) {
        for (const item of items) {
          packedMap.set(String(item.productId), Math.max(0, Number(item.packedQuantity || 0)))
        }
      }

      const nextPacking = currentPacking.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        requiredQuantity: Number(item.requiredQuantity),
        packedQuantity: packedMap.has(String(item.productId))
          ? Math.min(Number(item.requiredQuantity), Number(packedMap.get(String(item.productId))))
          : Number(item.packedQuantity || 0),
      }))

      const packingCompleted = computePackingCompletion(nextPacking)

      const updatedInvoice = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            "dispatch.status": packingCompleted ? "packed" : "packing",
            "dispatch.packingItems": nextPacking,
            "dispatch.packingCompleted": packingCompleted,
            ...(packingCompleted && { "dispatch.packingCompletedAt": new Date() }),
          },
        },
        { new: true },
      )

      return res.status(200).json({ success: true, data: updatedInvoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update packing" })
    }
  }

  static async getCouriers(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      const couriers = await StockCourier.find({ org_id, isActive: true }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: couriers })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch couriers" })
    }
  }

  static async createCourier(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { name, contactName, contactNumber } = req.body
      if (!name || !contactName || !contactNumber) {
        return res.status(400).json({ success: false, message: "Courier name, contact name and contact number are required" })
      }

      const courier = await StockCourier.create({
        org_id,
        name: String(name).trim(),
        contactName: String(contactName).trim(),
        contactNumber: String(contactNumber).trim(),
        createdBy: String(actorId),
      })

      return res.status(201).json({ success: true, data: courier })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create courier" })
    }
  }

  static async markInvoiceDispatched(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const {
        transportMeans,
        courierId,
        courierName,
        courierContactName,
        courierContactNumber,
      } = req.body

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to dispatch this invoice" })
      }

      const packingItems = invoice.dispatch?.packingItems || []
      if (!computePackingCompletion(packingItems)) {
        return res.status(400).json({ success: false, message: "All items must be fully packed before dispatch" })
      }

      if (!transportMeans) {
        return res.status(400).json({ success: false, message: "transportMeans is required" })
      }

      let courierPayload: any
      if (courierId) {
        const courier = await StockCourier.findOne({ _id: courierId, org_id })
        if (!courier) {
          return res.status(404).json({ success: false, message: "Courier not found" })
        }
        courierPayload = {
          courierId: String(courier._id),
          name: courier.name,
          contactName: courier.contactName,
          contactNumber: courier.contactNumber,
          isNewCourier: false,
        }
      } else {
        if (!courierName || !courierContactName || !courierContactNumber) {
          return res.status(400).json({ success: false, message: "Provide courier details or select an existing courier" })
        }
        const newCourier = await StockCourier.create({
          org_id,
          name: String(courierName).trim(),
          contactName: String(courierContactName).trim(),
          contactNumber: String(courierContactNumber).trim(),
          createdBy: String(userId),
        })
        courierPayload = {
          courierId: String(newCourier._id),
          name: newCourier.name,
          contactName: newCourier.contactName,
          contactNumber: newCourier.contactNumber,
          isNewCourier: true,
        }
      }

      const updatedInvoice = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            "dispatch.status": "dispatched",
            "dispatch.packingItems": packingItems,
            "dispatch.packingCompleted": true,
            "dispatch.packingCompletedAt": invoice.dispatch?.packingCompletedAt || new Date(),
            "dispatch.dispatchedAt": new Date(),
            "dispatch.dispatchedByUserId": String(userId),
            "dispatch.transportMeans": String(transportMeans).trim(),
            "dispatch.courier": courierPayload,
            "dispatch.inquiries": invoice.dispatch?.inquiries || [],
          },
        },
        { new: true },
      )

      let smsNotification: {
        attempted: boolean
        success: boolean
        message: string
        notificationId?: string
      } = {
        attempted: false,
        success: false,
        message: "Dispatch SMS skipped",
      }

      if (updatedInvoice?.dispatch?.courier) {
        const officeNumber = String((await Company.findById(org_id).select("phone").lean())?.phone || process.env.DISPATCH_OFFICE_NUMBER || "").trim()
        const clientNumber = String(updatedInvoice?.client?.number || "").trim()

        if (!clientNumber) {
          smsNotification = {
            attempted: false,
            success: false,
            message: "Client phone number is missing on invoice",
          }
        } else if (!officeNumber) {
          smsNotification = {
            attempted: false,
            success: false,
            message: "Office phone number is missing (company.phone or DISPATCH_OFFICE_NUMBER)",
          }
        } else {
          const message = buildDispatchClientMessage({
            clientName: updatedInvoice.client?.name,
            invoiceNumber: updatedInvoice.invoiceNumber,
            deliveryNoteNumber: updatedInvoice.deliveryNoteNumber,
            courierName: updatedInvoice.dispatch.courier.name,
            courierContactNumber: updatedInvoice.dispatch.courier.contactNumber,
            officeContactNumber: officeNumber,
          })

          const notification = await DispatchNotification.create({
            org_id,
            invoiceId: String(updatedInvoice._id),
            invoiceNumber: updatedInvoice.invoiceNumber,
            clientName: updatedInvoice.client?.name,
            clientNumber,
            courierName: updatedInvoice.dispatch.courier.name,
            courierContactNumber: updatedInvoice.dispatch.courier.contactNumber,
            officeContactNumber: officeNumber,
            message,
            provider: "africastalking",
            status: "queued",
            attempts: 0,
            createdBy: String(userId),
          })

          const smsResult = await smsService.sendDispatchSms({
            to: clientNumber,
            message,
          })

          const now = new Date()
          if (smsResult.success) {
            await DispatchNotification.updateOne(
              { _id: notification._id },
              {
                $set: {
                  status: "sent",
                  sentAt: now,
                  lastAttemptAt: now,
                  providerMessageId: smsResult.providerMessageId,
                  providerRawResponse: smsResult.providerRawResponse,
                },
                $inc: { attempts: 1 },
                $unset: { errorMessage: 1 },
              },
            )
            smsNotification = {
              attempted: true,
              success: true,
              message: "Dispatch SMS sent to client",
              notificationId: String(notification._id),
            }
          } else {
            await DispatchNotification.updateOne(
              { _id: notification._id },
              {
                $set: {
                  status: "failed",
                  lastAttemptAt: now,
                  errorMessage: smsResult.error,
                  providerRawResponse: smsResult.providerRawResponse,
                },
                $inc: { attempts: 1 },
              },
            )
            smsNotification = {
              attempted: true,
              success: false,
              message: smsResult.error || "Failed to send dispatch SMS",
              notificationId: String(notification._id),
            }
          }
        }
      }

      return res.status(200).json({ success: true, data: updatedInvoice, smsNotification })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to dispatch invoice" })
    }
  }

  static async getDispatchNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to view dispatch notifications" })
      }

      const notifications = await DispatchNotification.find({ org_id, invoiceId: String(invoice._id) })
        .sort({ createdAt: -1 })
        .lean()

      return res.status(200).json({ success: true, data: notifications })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch dispatch notifications" })
    }
  }

  static async retryDispatchNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { notificationId } = req.params
      const notification = await DispatchNotification.findOne({ _id: notificationId, org_id })
      if (!notification) {
        return res.status(404).json({ success: false, message: "Notification log not found" })
      }

      const invoice = await StockInvoice.findOne({ _id: notification.invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to retry this dispatch notification" })
      }

      const smsResult = await smsService.sendDispatchSms({
        to: notification.clientNumber,
        message: notification.message,
      })

      const now = new Date()
      if (smsResult.success) {
        notification.status = "sent"
        notification.sentAt = now
        notification.lastAttemptAt = now
        notification.providerMessageId = smsResult.providerMessageId
        notification.providerRawResponse = smsResult.providerRawResponse
        notification.errorMessage = undefined
      } else {
        notification.status = "failed"
        notification.lastAttemptAt = now
        notification.errorMessage = smsResult.error
        notification.providerRawResponse = smsResult.providerRawResponse
      }

      notification.attempts = Number(notification.attempts || 0) + 1
      await notification.save()

      return res.status(200).json({
        success: true,
        data: notification,
        smsResult: {
          success: smsResult.success,
          message: smsResult.success ? "Dispatch SMS resent successfully" : (smsResult.error || "Dispatch SMS resend failed"),
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to retry dispatch notification" })
    }
  }

  static async addDispatchInquiry(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const { mode, note } = req.body

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to add inquiry" })
      }

      if (!["client", "courier"].includes(String(mode))) {
        return res.status(400).json({ success: false, message: "mode must be client or courier" })
      }

      const inquiries = (invoice.dispatch?.inquiries || []).map((i: any) => ({
        mode: i.mode,
        method: i.method,
        note: i.note,
        createdBy: i.createdBy,
        createdAt: new Date(i.createdAt),
      }))
      inquiries.push({
        mode: mode,
        method: "call",
        note: note ? String(note).trim() : undefined,
        createdBy: String(userId),
        createdAt: new Date(),
      })

      const updatedInvoice = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            "dispatch.inquiries": inquiries,
          },
        },
        { new: true },
      )

      return res.status(200).json({ success: true, data: updatedInvoice.dispatch?.inquiries || [] })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to add inquiry" })
    }
  }

  static async confirmInvoiceDelivery(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const { condition, arrivalTime, everythingPacked, note } = req.body

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to confirm delivery" })
      }

      if (!invoice.dispatch || invoice.dispatch.status !== "dispatched") {
        return res.status(400).json({ success: false, message: "Invoice must be dispatched before delivery confirmation" })
      }

      if (!["good", "not_good"].includes(String(condition))) {
        return res.status(400).json({ success: false, message: "condition must be good or not_good" })
      }

      const updatedInvoice = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            "dispatch.status": "delivered",
            "dispatch.delivery": {
              received: true,
              condition,
              arrivalTime: arrivalTime ? new Date(arrivalTime) : new Date(),
              everythingPacked: Boolean(everythingPacked),
              note: note ? String(note).trim() : undefined,
              confirmedBy: String(userId),
              confirmedAt: new Date(),
            },
          },
        },
        { new: true },
      )

      return res.status(200).json({ success: true, data: updatedInvoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to confirm delivery" })
    }
  }

  static async getDispatchAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can view dispatch analytics" })
      }

      const invoices = await StockInvoice.find({ org_id }).lean()
      const counts = {
        total: invoices.length,
        not_assigned: 0,
        assigned: 0,
        packing: 0,
        packed: 0,
        dispatched: 0,
        delivered: 0,
      } as Record<string, number>

      let totalPackingRatio = 0
      let packingSamples = 0

      invoices.forEach((invoice: any) => {
        const status = String(invoice.dispatch?.status || "not_assigned")
        if (counts[status] !== undefined) counts[status] += 1

        const packingItems = invoice.dispatch?.packingItems || []
        if (packingItems.length > 0) {
          const required = packingItems.reduce((sum: number, item: any) => sum + Number(item.requiredQuantity || 0), 0)
          const packed = packingItems.reduce((sum: number, item: any) => sum + Number(item.packedQuantity || 0), 0)
          if (required > 0) {
            totalPackingRatio += Math.min(1, packed / required)
            packingSamples += 1
          }
        }
      })

      const completionRate = counts.total > 0 ? Number(((counts.delivered / counts.total) * 100).toFixed(2)) : 0
      const averagePackingProgress = packingSamples > 0 ? Number(((totalPackingRatio / packingSamples) * 100).toFixed(2)) : 0

      return res.status(200).json({
        success: true,
        data: {
          counts,
          completionRate,
          averagePackingProgress,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch dispatch analytics" })
    }
  }

  static async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId

      if (!org_id || !createdBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can create categories" })
      }

      const { name, description } = req.body
      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" })
      }

      const existing = await StockCategory.findOne({ org_id, name: String(name).trim() })
      if (existing) {
        return res.status(409).json({ success: false, message: "Category already exists" })
      }

      const category = await StockCategory.create({
        org_id,
        name: String(name).trim(),
        description: description ? String(description).trim() : undefined,
        createdBy,
      })

      return res.status(201).json({ success: true, data: category })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create category" })
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const categories = await StockCategory.find({ org_id }).sort({ name: 1 }).lean()
      return res.status(200).json({ success: true, data: categories })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch categories" })
    }
  }

  static async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId

      if (!org_id || !createdBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can create products" })
      }

      const {
        name,
        category,
        startingPrice,
        sellingPrice,
        minAlertQuantity,
        currentQuantity = 0,
        assignedUsers = [],
        isOutsourced = false,
        expiryEnabled = false,
        expiryDate,
        expiryReminderDays = 7,
      } = req.body

      if (!name || !category) {
        return res.status(400).json({ success: false, message: "Product name and category are required" })
      }

      if (Number(startingPrice) < 0 || Number(sellingPrice) < 0 || Number(minAlertQuantity) < 0 || Number(currentQuantity) < 0) {
        return res.status(400).json({ success: false, message: "Price and quantity values must be positive" })
      }

      if (expiryEnabled && !expiryDate) {
        return res.status(400).json({ success: false, message: "Expiry date is required when expiry checker is enabled" })
      }

      if (Number(expiryReminderDays) < 0) {
        return res.status(400).json({ success: false, message: "Expiry reminder days must be zero or positive" })
      }

      const categoryExists = await StockCategory.findOne({ _id: category, org_id })
      if (!categoryExists) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }

      const product = await StockProduct.create({
        org_id,
        name: String(name).trim(),
        category,
        startingPrice: Number(startingPrice),
        sellingPrice: Number(sellingPrice),
        minAlertQuantity: Number(minAlertQuantity),
        currentQuantity: Number(currentQuantity),
        assignedUsers: Array.isArray(assignedUsers) ? assignedUsers : [],
        isOutsourced: Boolean(isOutsourced),
        expiryEnabled: Boolean(expiryEnabled),
        expiryDate: expiryEnabled && expiryDate ? new Date(expiryDate) : null,
        expiryReminderDays: Number(expiryReminderDays),
        expiryLastReminderOn: null,
        createdBy,
      })

      return res.status(201).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create product" })
    }
  }

  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const products = await StockProduct.find({ org_id })
        .sort({ createdAt: -1 })
        .lean()

      const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))]
      const categories = await StockCategory.find({ _id: { $in: categoryIds }, org_id }).lean()
      const categoryMap = new Map(categories.map((category) => [String(category._id), category]))

      const data = products.map((product) => ({
        ...product,
        categoryDetails: categoryMap.get(String(product.category)) || null,
      }))

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch products" })
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can update products" })
      }

      const { id } = req.params
      const {
        name,
        category,
        startingPrice,
        sellingPrice,
        minAlertQuantity,
        currentQuantity,
        assignedUsers,
        isOutsourced,
        isActive,
        expiryEnabled,
        expiryDate,
        expiryReminderDays,
      } = req.body

      const payload: any = {}
      if (name !== undefined) payload.name = String(name).trim()
      if (category !== undefined) payload.category = category
      if (startingPrice !== undefined) payload.startingPrice = Number(startingPrice)
      if (sellingPrice !== undefined) payload.sellingPrice = Number(sellingPrice)
      if (minAlertQuantity !== undefined) payload.minAlertQuantity = Number(minAlertQuantity)
      if (currentQuantity !== undefined) payload.currentQuantity = Number(currentQuantity)
      if (assignedUsers !== undefined) payload.assignedUsers = Array.isArray(assignedUsers) ? assignedUsers : []
      if (isOutsourced !== undefined) payload.isOutsourced = Boolean(isOutsourced)
      if (isActive !== undefined) payload.isActive = Boolean(isActive)
      if (expiryEnabled !== undefined) payload.expiryEnabled = Boolean(expiryEnabled)
      if (expiryDate !== undefined) payload.expiryDate = expiryDate ? new Date(expiryDate) : null
      if (expiryReminderDays !== undefined) payload.expiryReminderDays = Number(expiryReminderDays)

      if (payload.expiryEnabled === true && !payload.expiryDate) {
        return res.status(400).json({ success: false, message: "Expiry date is required when expiry checker is enabled" })
      }

      if (
        payload.startingPrice < 0 ||
        payload.sellingPrice < 0 ||
        payload.minAlertQuantity < 0 ||
        payload.currentQuantity < 0 ||
        payload.expiryReminderDays < 0
      ) {
        return res.status(400).json({ success: false, message: "Price and quantity values must be positive" })
      }

      const product = await StockProduct.findOneAndUpdate({ _id: id, org_id }, { $set: payload }, { new: true })
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" })
      }

      return res.status(200).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update product" })
    }
  }

  static async addStock(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId

      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const {
        productId,
        quantityAdded,
        note,
        isOutsourced,
        outsourcedCompany,
        expiryEnabled,
        expiryDate,
        expiryReminderDays,
      } = req.body

      if (!productId || Number(quantityAdded) <= 0) {
        return res.status(400).json({ success: false, message: "productId and positive quantityAdded are required" })
      }

      if (Boolean(isOutsourced) && !String(outsourcedCompany || "").trim()) {
        return res.status(400).json({ success: false, message: "outsourcedCompany is required when stock entry is outsourced" })
      }

      const product = await StockProduct.findOne({ _id: productId, org_id })
      if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      const canManage =
        isAdminRole(req.user?.role) ||
        product.assignedUsers.map(String).includes(String(actorId))

      if (!canManage) {
        return res.status(403).json({ success: false, message: "You are not assigned to manage this product" })
      }

      product.currentQuantity += Number(quantityAdded)

      if (expiryEnabled !== undefined) {
        product.expiryEnabled = Boolean(expiryEnabled)
      }
      if (expiryDate !== undefined) {
        product.expiryDate = expiryDate ? new Date(expiryDate) : null
        product.expiryLastReminderOn = null
      }
      if (expiryReminderDays !== undefined) {
        product.expiryReminderDays = Number(expiryReminderDays)
      }

      if (product.expiryEnabled && !product.expiryDate) {
        return res.status(400).json({ success: false, message: "Expiry date is required when expiry checker is enabled" })
      }

      if (Number(product.expiryReminderDays || 0) < 0) {
        return res.status(400).json({ success: false, message: "Expiry reminder days must be zero or positive" })
      }

      await product.save()

      const stockEntry = await StockEntry.create({
        org_id,
        productId,
        quantityAdded: Number(quantityAdded),
        isOutsourced: Boolean(isOutsourced),
        outsourcedCompany: Boolean(isOutsourced) ? String(outsourcedCompany).trim() : undefined,
        expiryEnabled: product.expiryEnabled,
        expiryDate: product.expiryDate || null,
        expiryReminderDays: Number(product.expiryReminderDays || 7),
        addedBy: actorId,
        note: note ? String(note) : undefined,
      })

      await sendLowStockAlert(product, org_id)
      await sendExpiryReminderEmail(product, org_id)

      return res.status(201).json({
        success: true,
        data: {
          stockEntry,
          product,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to add stock" })
    }
  }

  static async createSale(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const {
        productId,
        quantitySold,
        soldPrice,
        isSalesCompany = false,
        salesEmployeeId,
        isWalkInClient = false,
        buyerName,
        buyerNumber,
        buyerLocation,
        quotationId,
        invoiceId,
      } = req.body

      if (!productId || Number(quantitySold) <= 0 || Number(soldPrice) < 0) {
        return res.status(400).json({ success: false, message: "productId, positive quantitySold and soldPrice are required" })
      }

      if (isSalesCompany && !salesEmployeeId) {
        return res.status(400).json({ success: false, message: "salesEmployeeId is required when isSalesCompany is true" })
      }

      if (!isWalkInClient && (!buyerName || !buyerNumber || !buyerLocation)) {
        return res.status(400).json({ success: false, message: "Buyer details are required unless walk-in client is selected" })
      }

      const product = await StockProduct.findOne({ _id: productId, org_id })
      if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      const canManage =
        isAdminRole(req.user?.role) ||
        product.assignedUsers.map(String).includes(String(actorId))

      if (!canManage) {
        return res.status(403).json({ success: false, message: "You are not assigned to sell this product" })
      }

      if (product.currentQuantity < Number(quantitySold)) {
        return res.status(400).json({ success: false, message: "Cannot sell more than available stock" })
      }

      product.currentQuantity -= Number(quantitySold)
      await product.save()

      const sale = await StockSale.create({
        org_id,
        productId,
        quantitySold: Number(quantitySold),
        soldPrice: Number(soldPrice),
        soldBy: actorId,
        buyerName: isWalkInClient ? "Walk-in Client" : String(buyerName || "").trim(),
        buyerNumber: isWalkInClient ? undefined : String(buyerNumber || "").trim(),
        buyerLocation: isWalkInClient ? undefined : String(buyerLocation || "").trim(),
        isWalkInClient: Boolean(isWalkInClient),
        isSalesCompany: Boolean(isSalesCompany),
        salesEmployeeId: isSalesCompany ? String(salesEmployeeId) : undefined,
        quotationId: quotationId ? String(quotationId) : undefined,
        invoiceId: invoiceId ? String(invoiceId) : undefined,
        receiptNumber: generateDocumentNumber("RCP"),
        remainingQuantity: product.currentQuantity,
      })

      await sendLowStockAlert(product, org_id)

      return res.status(201).json({ success: true, data: { sale, product } })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to record sale" })
    }
  }

  static async getSales(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        query.soldBy = req.user?.userId
      }

      const sales = await StockSale.find(query).sort({ createdAt: -1 }).lean()

      const productIds = [...new Set(sales.map((sale) => sale.productId).filter(Boolean))]
      const userIds = [
        ...new Set(
          sales
            .flatMap((sale) => [sale.soldBy, sale.salesEmployeeId])
            .filter(Boolean)
            .map(String),
        ),
      ]

      const [products, users] = await Promise.all([
        StockProduct.find({ _id: { $in: productIds }, org_id }).lean(),
        User.find({ _id: { $in: userIds }, org_id }).select("firstName lastName email").lean(),
      ])

      const productMap = new Map(products.map((product) => [String(product._id), product]))
      const userMap = new Map(users.map((user) => [String(user._id), user]))

      const data = sales.map((sale) => ({
        ...sale,
        product: productMap.get(String(sale.productId)) || null,
        soldByUser: sale.soldBy ? userMap.get(String(sale.soldBy)) || null : null,
        salesEmployee: sale.salesEmployeeId ? userMap.get(String(sale.salesEmployeeId)) || null : null,
      }))

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch sales" })
    }
  }

  static async getStockEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        query.addedBy = req.user?.userId
      }

      const entries = await StockEntry.find(query).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: entries })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch stock entries" })
    }
  }
}
