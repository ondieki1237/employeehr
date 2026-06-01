import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { promises as fs } from "fs"
import path from "path"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"
import { StockEntry } from "../models/StockEntry"
import { StockSale } from "../models/StockSale"
import { StockQuotation } from "../models/StockQuotation"
import { QuotationFollowUp } from "../models/QuotationFollowUp"
import { StockInvoice } from "../models/StockInvoice"
import { StockCourier } from "../models/StockCourier"
import { StockClient } from "../models/StockClient"
import { StockExpense } from "../models/StockExpense"
import { StockRepeatBill } from "../models/StockRepeatBill"
import { StockInvoicePayment } from "../models/StockInvoicePayment"
import { CreditNote } from "../models/CreditNote"
import { DispatchNotification } from "../models/DispatchNotification"
import { BulkSmsCampaign } from "../models/BulkSmsCampaign"
import { Task } from "../models/Task"
import { Company } from "../models/Company"
import { Branch } from "../models/Branch"
import { User } from "../models/User"
import emailService from "../services/email.service"
import { smsService } from "../services/sms.service"
import { mpesaService } from "../services/mpesa.service"

const ADMIN_ROLES = ["company_admin", "hr", "admin", "super_admin"]

function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role)
}

function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

function normalizeClientValue(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ")
}

function buildClientSourceKey(client: {
  name?: string
  number?: string
  location?: string
  sourceName?: string
  sourceNumber?: string
  sourceLocation?: string
}) {
  return {
    sourceName: normalizeClientValue(String(client?.sourceName || client?.name || "")),
    sourceNumber: normalizeClientValue(String(client?.sourceNumber || client?.number || "")),
    sourceLocation: normalizeClientValue(String(client?.sourceLocation || client?.location || "")),
  }
}

function parseBuyingPrice(row: Record<string, string>) {
  return parseAmount(
    row.buyingPrice ||
      row["Buying Price"] ||
      row.startingPrice ||
      row["Starting Price"] ||
      "0",
  )
}

function buildBulkSmsClientKey(phone: string, name: string, location: string) {
  return [
    normalizeClientValue(phone),
    normalizeClientValue(name),
    normalizeClientValue(location),
  ].join("|")
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

type BulkSmsAudienceClient = {
  key: string
  name: string
  phone: string
  location: string
  contactPerson?: string
  branchId?: string
  quotationsCount: number
  pendingQuotationsCount: number
  quotationNumbers: string[]
  quotedProductIds: string[]
  invoicesCount: number
  purchasesValue: number
  lastPurchaseAt?: Date
  sources: string[]
}

function upsertBulkSmsClient(
  map: Map<string, BulkSmsAudienceClient>,
  client: { name?: string; number?: string; location?: string; contactPerson?: string; branchId?: string },
  source: string,
) {
  const phone = String(client?.number || "").trim()
  const name = String(client?.name || "").trim()
  const location = String(client?.location || "").trim()
  if (!phone || !name) return null

  const key = buildBulkSmsClientKey(phone, name, location)
  const existing = map.get(key)
  if (existing) {
    if (client?.contactPerson && !existing.contactPerson) existing.contactPerson = String(client.contactPerson).trim()
    if (client?.branchId && !existing.branchId) existing.branchId = String(client.branchId).trim()
    if (!existing.sources.includes(source)) existing.sources.push(source)
    return existing
  }

  const row: BulkSmsAudienceClient = {
    key,
    name,
    phone,
    location,
    contactPerson: client?.contactPerson ? String(client.contactPerson).trim() : undefined,
    branchId: client?.branchId ? String(client.branchId).trim() : undefined,
    quotationsCount: 0,
    pendingQuotationsCount: 0,
    quotationNumbers: [],
    quotedProductIds: [],
    invoicesCount: 0,
    purchasesValue: 0,
    sources: [source],
  }
  map.set(key, row)
  return row
}

async function buildBulkSmsAudience(orgId: string, filters: Record<string, any> = {}) {
  const [savedClients, quotations, invoices, sales] = await Promise.all([
    StockClient.find({ org_id: orgId }).lean(),
    StockQuotation.find({ org_id: orgId }).select("client quotationNumber status subTotal createdAt items.productId").lean(),
    StockInvoice.find({ org_id: orgId, status: { $ne: "cancelled" } }).select("client invoiceNumber quotationNumber subTotal createdAt").lean(),
    StockSale.find({ org_id: orgId, isWalkInClient: { $ne: true } }).select("buyerName buyerNumber buyerLocation quantitySold soldPrice createdAt").lean(),
  ])

  const map = new Map<string, BulkSmsAudienceClient>()

  savedClients.forEach((client: any) => {
    upsertBulkSmsClient(
      map,
      {
        name: client.sourceName || client.legalName,
        number: client.sourceNumber,
        location: client.sourceLocation,
        branchId: String(client.branchId || ""),
      },
      "saved_client",
    )
  })

  quotations.forEach((quotation: any) => {
    const row = upsertBulkSmsClient(map, quotation.client, "quotation")
    if (!row) return
    row.quotationsCount += 1
    if (quotation.status === "draft" || quotation.status === "pending_approval") row.pendingQuotationsCount += 1
    if (quotation.quotationNumber && !row.quotationNumbers.includes(quotation.quotationNumber)) {
      row.quotationNumbers.push(quotation.quotationNumber)
    }
    if (quotation.items && Array.isArray(quotation.items)) {
      quotation.items.forEach((item: any) => {
        if (item.productId && !row.quotedProductIds.includes(String(item.productId))) {
          row.quotedProductIds.push(String(item.productId))
        }
      })
    }
  })

  invoices.forEach((invoice: any) => {
    const row = upsertBulkSmsClient(map, invoice.client, "invoice")
    if (!row) return
    row.invoicesCount += 1
    row.purchasesValue += Number(invoice.subTotal || 0)
    const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : null
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      if (!row.lastPurchaseAt || createdAt > row.lastPurchaseAt) row.lastPurchaseAt = createdAt
    }
    if (invoice.quotationNumber && !row.quotationNumbers.includes(invoice.quotationNumber)) {
      row.quotationNumbers.push(invoice.quotationNumber)
    }
  })

  sales.forEach((sale: any) => {
    const row = upsertBulkSmsClient(
      map,
      {
        name: sale.buyerName,
        number: sale.buyerNumber,
        location: sale.buyerLocation,
      },
      "sale",
    )
    if (!row) return
    row.invoicesCount += 1
    row.purchasesValue += Number(sale.soldPrice || 0) * Number(sale.quantitySold || 0)
    const createdAt = sale.createdAt ? new Date(sale.createdAt) : null
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      if (!row.lastPurchaseAt || createdAt > row.lastPurchaseAt) row.lastPurchaseAt = createdAt
    }
  })

  const search = String(filters.search || "").trim().toLowerCase()
  const audienceType = String(filters.audienceType || "all")
  const region = String(filters.region || "").trim().toLowerCase()
  const quotationProductId = String(filters.quotationProductId || "").trim()
  const branchId = String(filters.branchId || "").trim()
  const inactiveDays = Math.max(1, Number(filters.inactiveDays || 90))
  const inactiveCutoff = new Date()
  inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveDays)

  let clients = Array.from(map.values())

  if (region) {
    clients = clients.filter((client) => client.location.toLowerCase().includes(region))
  }

  if (audienceType === "pending_quotations") {
    clients = clients.filter((client) => client.pendingQuotationsCount > 0)
  } else if (audienceType === "quotation_product") {
    clients = quotationProductId
      ? clients.filter((client) => client.quotedProductIds.includes(quotationProductId))
      : []
  } else if (audienceType === "branch") {
    clients = branchId
      ? clients.filter((client) => client.branchId === branchId)
      : []
  } else if (audienceType === "inactive") {
    clients = clients.filter((client) => !client.lastPurchaseAt || client.lastPurchaseAt < inactiveCutoff)
  }

  if (search) {
    clients = clients.filter((client) =>
      [
        client.name,
        client.phone,
        client.location,
        client.contactPerson || "",
        client.quotationNumbers.join(" "),
      ].join(" ").toLowerCase().includes(search),
    )
  }

  clients = clients.sort((a, b) => a.name.localeCompare(b.name))

  return {
    clients: clients.map((client) => ({
      ...client,
      quotationNumbers: uniqueStrings(client.quotationNumbers),
      sources: uniqueStrings(client.sources),
    })),
    meta: {
      total: clients.length,
      regions: uniqueStrings(Array.from(map.values()).map((client) => client.location)),
      quotationNumbers: uniqueStrings(Array.from(map.values()).flatMap((client) => client.quotationNumbers)),
    },
  }
}

function splitPhoneList(raw: string) {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[\n,;]+/g)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  if (lines.length < 1) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? ""
    })
    return row
  })
}

function parseAmount(value: string): number {
  const normalized = String(value || "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^0-9.-]/g, "")
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseDate(value: string): Date {
  const input = String(value || "").trim()
  if (!input) return new Date()

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [day, month, year] = input.split("/").map((n) => Number(n))
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return new Date()
  return date
}

function buildPackagingTaskContext(invoice: any) {
  const invoiceNumber = String(invoice?.invoiceNumber || "").trim()
  const clientName = String(invoice?.client?.name || "Client").trim() || "Client"
  const itemCount = Array.isArray(invoice?.items) ? invoice.items.length : 0
  const packedCount = Array.isArray(invoice?.dispatch?.packingItems)
    ? invoice.dispatch.packingItems.filter((item: any) => Number(item.packedQuantity || 0) >= Number(item.requiredQuantity || 0)).length
    : 0

  return {
    title: `Packaging duty: ${invoiceNumber}`,
    description: `Pack items for ${clientName}. Invoice ${invoiceNumber} has ${itemCount} item line(s). Packed lines: ${packedCount}/${itemCount}.`,
  }
}

async function upsertPackagingDutyTask(params: {
  orgId: string
  invoice: any
  assignedToUserId: string
  assignedByUserId: string
  status: "pending" | "in_progress" | "completed"
}) {
  const { orgId, invoice, assignedToUserId, assignedByUserId, status } = params
  const context = buildPackagingTaskContext(invoice)
  const dueDate = invoice?.dispatch?.assignedAt ? new Date(invoice.dispatch.assignedAt) : new Date()

  const task = await Task.findOneAndUpdate(
    {
      org_id: orgId,
      related_entity_type: "invoice",
      related_entity_id: String(invoice._id),
      is_packaging_duty: true,
    },
    {
      $set: {
        title: context.title,
        description: context.description,
        assigned_to: String(assignedToUserId),
        assigned_by: String(assignedByUserId),
        priority: "high",
        status,
        due_date: dueDate,
        related_entity_type: "invoice",
        related_entity_id: String(invoice._id),
        source_label: "Packaging",
        source_status: String(invoice?.dispatch?.status || "assigned"),
        is_packaging_duty: true,
        notes: status === "completed" ? "Packing completed from dispatch workflow" : undefined,
        completed_at: status === "completed" ? new Date() : undefined,
      },
      $setOnInsert: {
        org_id: orgId,
      },
    },
    { upsert: true, new: true },
  )

  return task
}

function buildInvoicePaymentSummary(invoice: any, invoicePayments: any[]) {
  const sortedPayments = [...invoicePayments].sort(
    (a, b) => new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime(),
  )
  const paidAmount = sortedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const subTotal = Number(invoice?.subTotal || 0)
  const balanceRemaining = Math.max(0, Number((subTotal - paidAmount).toFixed(2)))
  const lastPayment = sortedPayments[0] || null

  // Compute a suggested next payment / debt-claiming date when there is still a balance.
  // Default policy: schedule next claim 30 days after the latest payment (or invoice creation if no payments).
  let nextPaymentDate: string | undefined = undefined
  if (balanceRemaining > 0) {
    const base = lastPayment ? new Date(lastPayment.paidAt || lastPayment.createdAt || Date.now()) : new Date(invoice.createdAt || Date.now())
    const next = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days after base
    nextPaymentDate = next.toISOString()
  }

  return {
    ...invoice,
    paidAmount: Number(paidAmount.toFixed(2)),
    balanceRemaining,
    paymentCount: sortedPayments.length,
    lastPayment,
    payments: sortedPayments,
    nextPaymentDate,
  }
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
        productUnitPrice: unitPrice,
        soldUnitPrice: unitPrice,
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

    const minimumSellingPrice = Number(product.sellingPrice)

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for ${product.name}`)
    }

    if (unitPrice < minimumSellingPrice) {
      throw new Error(`Sold price for ${product.name} cannot be below minimum selling price (${minimumSellingPrice})`)
    }

    return {
      productId: String(product._id),
      productName: product.name,
      quantity,
      productUnitPrice: Number(product.sellingPrice),
      soldUnitPrice: unitPrice,
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

const DEFAULT_DISPATCH_SMS_TEMPLATE = [
  "Hello {{clientName}}, your package for invoice {{invoiceNumber}} (DN {{deliveryNoteNumber}}) has been dispatched.",
  "Courier: {{courierName}} ({{courierContactNumber}}).",
  "For inquiries, call office: {{officeContactNumber}}.",
  "Thank you.",
].join(" ")

const DEFAULT_DELIVERY_SMS_TEMPLATE = [
  "Hello {{clientName}}, thank you for confirming delivery of invoice {{invoiceNumber}} (DN {{deliveryNoteNumber}}).",
  "We appreciate your business and hope everything arrived in good condition.",
  "For any support, call {{officeContactNumber}}.",
].join(" ")

function renderDispatchMessageTemplate(
  template: string,
  data: {
    clientName: string
    invoiceNumber: string
    deliveryNoteNumber: string
    courierName: string
    courierContactNumber: string
    officeContactNumber: string
    arrivalTime?: string
    deliveryCondition?: string
    deliveryNote?: string
  },
) {
  return template
    .replace(/\{\{\s*clientName\s*\}\}/g, data.clientName)
    .replace(/\{\{\s*invoiceNumber\s*\}\}/g, data.invoiceNumber)
    .replace(/\{\{\s*deliveryNoteNumber\s*\}\}/g, data.deliveryNoteNumber)
    .replace(/\{\{\s*courierName\s*\}\}/g, data.courierName)
    .replace(/\{\{\s*courierContactNumber\s*\}\}/g, data.courierContactNumber)
    .replace(/\{\{\s*officeContactNumber\s*\}\}/g, data.officeContactNumber)
    .replace(/\{\{\s*arrivalTime\s*\}\}/g, data.arrivalTime || "")
    .replace(/\{\{\s*deliveryCondition\s*\}\}/g, data.deliveryCondition || "")
    .replace(/\{\{\s*deliveryNote\s*\}\}/g, data.deliveryNote || "")
}

function buildDispatchClientMessage(params: {
  clientName?: string
  invoiceNumber: string
  deliveryNoteNumber: string
  courierName: string
  courierContactNumber: string
  officeContactNumber: string
  messageTemplate?: string
}) {
  const data = {
    clientName: String(params.clientName || "Client").trim() || "Client",
    invoiceNumber: String(params.invoiceNumber || "").trim(),
    deliveryNoteNumber: String(params.deliveryNoteNumber || "").trim(),
    courierName: String(params.courierName || "").trim(),
    courierContactNumber: String(params.courierContactNumber || "").trim(),
    officeContactNumber: String(params.officeContactNumber || "").trim(),
  }

  const template = String(params.messageTemplate || DEFAULT_DISPATCH_SMS_TEMPLATE).trim() || DEFAULT_DISPATCH_SMS_TEMPLATE
  return renderDispatchMessageTemplate(template, data).replace(/\s+/g, " ").trim()
}

function buildDeliveryClientMessage(params: {
  clientName?: string
  invoiceNumber: string
  deliveryNoteNumber: string
  courierName: string
  courierContactNumber: string
  officeContactNumber: string
  arrivalTime?: Date | string
  deliveryCondition?: string
  deliveryNote?: string
  messageTemplate?: string
}) {
  const arrivalDate = params.arrivalTime ? new Date(params.arrivalTime) : null
  const arrivalTime = arrivalDate && !Number.isNaN(arrivalDate.getTime())
    ? arrivalDate.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })
    : ""

  const data = {
    clientName: String(params.clientName || "Client").trim() || "Client",
    invoiceNumber: String(params.invoiceNumber || "").trim(),
    deliveryNoteNumber: String(params.deliveryNoteNumber || "").trim(),
    courierName: String(params.courierName || "").trim(),
    courierContactNumber: String(params.courierContactNumber || "").trim(),
    officeContactNumber: String(params.officeContactNumber || "").trim(),
    arrivalTime,
    deliveryCondition: String(params.deliveryCondition || "").replace("_", " ").trim(),
    deliveryNote: String(params.deliveryNote || "").trim(),
  }

  const template = String(params.messageTemplate || DEFAULT_DELIVERY_SMS_TEMPLATE).trim() || DEFAULT_DELIVERY_SMS_TEMPLATE
  return renderDispatchMessageTemplate(template, data).replace(/\s+/g, " ").trim()
}

async function sendDispatchNotificationForInvoice(params: {
  orgId: string
  userId: string
  invoice: any
}) {
  const { orgId, userId, invoice } = params

  if (!invoice?.dispatch?.courier) {
    return {
      attempted: false,
      success: false,
      message: "Courier details are missing on dispatch",
    }
  }

  const company = await Company.findById(orgId).select("name phone dispatchSmsSettings").lean()
  const officeNumber = String(company?.dispatchSmsSettings?.officePhone || company?.phone || process.env.DISPATCH_OFFICE_NUMBER || "").trim()
  const smsSenderName = String(company?.dispatchSmsSettings?.smsSenderName || company?.name || process.env.WEBSMS_DEFAULT_SENDER_NAME || "YourCompany").trim()
  const dispatchTemplate = String(company?.dispatchSmsSettings?.messageTemplate || DEFAULT_DISPATCH_SMS_TEMPLATE).trim()
  const clientNumber = String(invoice?.client?.number || "").trim()

  if (!clientNumber) {
    return {
      attempted: false,
      success: false,
      message: "Client phone number is missing on invoice",
    }
  }

  if (!officeNumber) {
    return {
      attempted: false,
      success: false,
      message: "Office phone number is missing (company.phone or DISPATCH_OFFICE_NUMBER)",
    }
  }

  const message = buildDispatchClientMessage({
    clientName: invoice.client?.name,
    invoiceNumber: invoice.invoiceNumber,
    deliveryNoteNumber: invoice.deliveryNoteNumber,
    courierName: invoice.dispatch.courier.name,
    courierContactNumber: invoice.dispatch.courier.contactNumber,
    officeContactNumber: officeNumber,
    messageTemplate: dispatchTemplate,
  })

  const notification = await DispatchNotification.create({
    org_id: orgId,
    invoiceId: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.client?.name,
    clientNumber,
    courierName: invoice.dispatch.courier.name,
    courierContactNumber: invoice.dispatch.courier.contactNumber,
    officeContactNumber: officeNumber,
    message,
    provider: "websms",
    notificationType: "dispatch",
    status: "queued",
    attempts: 0,
    createdBy: String(userId),
  })

  const smsResult = await smsService.sendDispatchSms({
    to: clientNumber,
    message,
    senderName: smsSenderName,
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
    return {
      attempted: true,
      success: true,
      message: "Dispatch SMS sent to client",
      notificationId: String(notification._id),
    }
  }

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

  console.error("Dispatch SMS failed", {
    orgId,
    invoiceId: String(invoice?._id || ""),
    invoiceNumber: String(invoice?.invoiceNumber || ""),
    clientNumber,
    error: smsResult.error,
    providerRawResponse: smsResult.providerRawResponse,
  })

  return {
    attempted: true,
    success: false,
    message: smsResult.error || "Failed to send dispatch SMS",
    notificationId: String(notification._id),
  }
}

async function sendDeliveryNotificationForInvoice(params: {
  orgId: string
  userId: string
  invoice: any
}) {
  const { orgId, userId, invoice } = params

  if (!invoice?.dispatch?.courier) {
    return {
      attempted: false,
      success: false,
      message: "Courier details are missing on dispatch",
    }
  }

  const company = await Company.findById(orgId).select("name phone dispatchSmsSettings").lean()
  const officeNumber = String(company?.dispatchSmsSettings?.officePhone || company?.phone || process.env.DISPATCH_OFFICE_NUMBER || "").trim()
  const smsSenderName = String(company?.dispatchSmsSettings?.smsSenderName || company?.name || process.env.WEBSMS_DEFAULT_SENDER_NAME || "YourCompany").trim()
  const deliveryTemplate = String(company?.dispatchSmsSettings?.deliveryMessageTemplate || DEFAULT_DELIVERY_SMS_TEMPLATE).trim()
  const clientNumber = String(invoice?.client?.number || "").trim()

  if (!clientNumber) {
    return {
      attempted: false,
      success: false,
      message: "Client phone number is missing on invoice",
    }
  }

  if (!officeNumber) {
    return {
      attempted: false,
      success: false,
      message: "Office phone number is missing (company.phone or DISPATCH_OFFICE_NUMBER)",
    }
  }

  const delivery = invoice.dispatch?.delivery || {}
  const message = buildDeliveryClientMessage({
    clientName: invoice.client?.name,
    invoiceNumber: invoice.invoiceNumber,
    deliveryNoteNumber: invoice.deliveryNoteNumber,
    courierName: invoice.dispatch.courier.name,
    courierContactNumber: invoice.dispatch.courier.contactNumber,
    officeContactNumber: officeNumber,
    arrivalTime: delivery.arrivalTime || delivery.confirmedAt,
    deliveryCondition: delivery.condition,
    deliveryNote: delivery.note,
    messageTemplate: deliveryTemplate,
  })

  const notification = await DispatchNotification.create({
    org_id: orgId,
    invoiceId: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.client?.name,
    clientNumber,
    courierName: invoice.dispatch.courier.name,
    courierContactNumber: invoice.dispatch.courier.contactNumber,
    officeContactNumber: officeNumber,
    message,
    provider: "websms",
    notificationType: "delivery",
    status: "queued",
    attempts: 0,
    createdBy: String(userId),
  })

  const smsResult = await smsService.sendDispatchSms({
    to: clientNumber,
    message,
    senderName: smsSenderName,
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
    return {
      attempted: true,
      success: true,
      message: "Delivery thank-you SMS sent to client",
      notificationId: String(notification._id),
    }
  }

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

  console.error("Delivery SMS failed", {
    orgId,
    invoiceId: String(invoice?._id || ""),
    invoiceNumber: String(invoice?.invoiceNumber || ""),
    clientNumber,
    error: smsResult.error,
    providerRawResponse: smsResult.providerRawResponse,
  })

  return {
    attempted: true,
    success: false,
    message: smsResult.error || "Failed to send delivery SMS",
    notificationId: String(notification._id),
  }
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

      const { clientName, clientNumber, clientLocation, clientContactPerson, items, ownerUserId, branchId } = req.body
      if (!clientName || !clientNumber) {
        return res.status(400).json({ success: false, message: "Client name and phone number are required" })
      }

      if (ownerUserId) {
        const owner = await User.findOne({ _id: String(ownerUserId).trim(), org_id }).select("_id firstName lastName role").lean()
        if (!owner) {
          return res.status(404).json({ success: false, message: "Selected quotation owner not found" })
        }
      }

      if (branchId) {
        const branch = await Branch.findOne({ _id: String(branchId).trim(), org_id }).select("_id name code").lean()
        if (!branch) {
          return res.status(404).json({ success: false, message: "Selected branch not found" })
        }
      }

      const normalizedLocation = String(clientLocation || "N/A").trim() || "N/A"
      const normalizedContactPerson = String(clientContactPerson || "").trim()

      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const subTotal = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

      const quotation = await StockQuotation.create({
        org_id,
        quotationNumber: generateDocumentNumber("QTN"),
        client: {
          name: String(clientName).trim(),
          number: String(clientNumber).trim(),
          location: normalizedLocation,
          contactPerson: normalizedContactPerson || undefined,
        },
        items: normalizedItems,
        subTotal,
        status: req.user?.role === "employee" ? "pending_approval" : "draft",
        createdBy,
        ownerUserId: ownerUserId ? String(ownerUserId).trim() : undefined,
        branchId: branchId ? String(branchId).trim() : undefined,
      })

      return res.status(201).json({ success: true, data: quotation })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create quotation" })
    }
  }

  static async getQuotations(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (role === "employee") {
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
        query.createdBy = String(userId)
      }

      const quotations = await StockQuotation.find(query).sort({ createdAt: -1 }).lean()

      const creatorIds = [...new Set(quotations.map((quotation: any) => String(quotation.createdBy || "")).filter(Boolean))]
      const ownerIds = [...new Set(quotations.map((quotation: any) => String(quotation.ownerUserId || "")).filter(Boolean))]
      const branchIds = [...new Set(quotations.map((quotation: any) => String(quotation.branchId || "")).filter(Boolean))]
      const [creators, owners, branches] = await Promise.all([
        creatorIds.length ? User.find({ _id: { $in: creatorIds } }).select("firstName lastName").lean() : Promise.resolve([]),
        ownerIds.length ? User.find({ _id: { $in: ownerIds } }).select("firstName lastName").lean() : Promise.resolve([]),
        branchIds.length ? Branch.find({ _id: { $in: branchIds } }).select("name code").lean() : Promise.resolve([]),
      ])
      const creatorMap = new Map(creators.map((user: any) => [String(user._id), `${user.firstName || ""} ${user.lastName || ""}`.trim()]))
      const ownerMap = new Map(owners.map((user: any) => [String(user._id), `${user.firstName || ""} ${user.lastName || ""}`.trim()]))
      const branchMap = new Map(branches.map((branch: any) => [String(branch._id), `${branch.name || ""} (${branch.code || ""})`.trim()]))

      const enriched = quotations.map((quotation: any) => ({
        ...quotation,
        createdByName: creatorMap.get(String(quotation.createdBy || "")) || undefined,
        ownerUserName: ownerMap.get(String(quotation.ownerUserId || "")) || undefined,
        branchName: branchMap.get(String(quotation.branchId || "")) || undefined,
      }))

      return res.status(200).json({ success: true, data: enriched })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch quotations" })
    }
  }

  static async updateQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can edit quotations" })
      }

      if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
        return res.status(400).json({ success: false, message: "Only draft or pending quotations can be edited" })
      }

      const { clientName, clientNumber, clientLocation, clientContactPerson, items } = req.body
      if (!clientName || !clientNumber) {
        return res.status(400).json({ success: false, message: "Client name and phone number are required" })
      }

      const normalizedLocation = String(clientLocation || "N/A").trim() || "N/A"
      const normalizedContactPerson = String(clientContactPerson || "").trim()

      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const subTotal = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

      quotation.client = {
        name: String(clientName).trim(),
        number: String(clientNumber).trim(),
        location: normalizedLocation,
        contactPerson: normalizedContactPerson || undefined,
      }
      quotation.items = normalizedItems as any
      quotation.subTotal = subTotal

      await quotation.save()

      return res.status(200).json({ success: true, data: quotation })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update quotation" })
    }
  }

  static async approveQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can approve quotations" })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status === "converted" || quotation.status === "cancelled") {
        return res.status(400).json({ success: false, message: `Cannot approve ${quotation.status} quotation` })
      }

      quotation.status = "draft"
      quotation.approvedBy = String(req.user?.userId || "")
      quotation.approvedAt = new Date()
      await quotation.save()

      return res.status(200).json({
        success: true,
        message: "Quotation approved",
        data: quotation,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to approve quotation" })
    }
  }

  static async rejectQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can reject quotations" })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status === "converted") {
        return res.status(400).json({ success: false, message: "Cannot reject converted quotation" })
      }

      quotation.status = "cancelled"
      await quotation.save()

      return res.status(200).json({
        success: true,
        message: "Quotation rejected",
        data: quotation,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to reject quotation" })
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

      const clientMap = new Map<string, { name: string; number: string; location: string; contactPerson?: string }>()

      for (const quotation of quotations) {
        const client = (quotation as any).client
        if (!client?.name || !client?.number || !client?.location) continue
        const key = `${client.name}|${client.number}|${client.location}`.toLowerCase()
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            name: client.name,
            number: client.number,
            location: client.location,
            contactPerson: client.contactPerson,
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
            contactPerson: client.contactPerson,
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
          clientMap.set(key, { name, number, location, contactPerson: undefined })
        }
      }

      return res.status(200).json({ success: true, data: Array.from(clientMap.values()) })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch clients" })
    }
  }

  static async getSavedClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const profiles = await StockClient.find({ org_id })
        .select("sourceName sourceNumber sourceLocation legalName contactPerson")
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean()

      const clients = profiles.map((profile: any) => ({
        key: `${String(profile.sourceName || "").trim().toLowerCase()}|${String(profile.sourceNumber || "").trim().toLowerCase()}|${String(profile.sourceLocation || "").trim().toLowerCase()}`,
        name: String(profile.sourceName || profile.legalName || "").trim(),
        number: String(profile.sourceNumber || "").trim(),
        location: String(profile.sourceLocation || "").trim(),
        contactPerson: profile.contactPerson,
      }))

      return res.status(200).json({ success: true, data: clients })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch saved clients" })
    }
  }

  static async getAccountsPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const invoices = await StockInvoice.find({ org_id }).sort({ createdAt: -1 }).lean()

      const clientKeys = invoices.map((invoice: any) => buildClientSourceKey(invoice.client))
      const uniqueName = [...new Set(clientKeys.map((key) => key.sourceName).filter(Boolean))]
      const uniqueNumber = [...new Set(clientKeys.map((key) => key.sourceNumber).filter(Boolean))]
      const uniqueLocation = [...new Set(clientKeys.map((key) => key.sourceLocation).filter(Boolean))]

      const profiles = await StockClient.find({
        org_id,
        sourceName: { $in: uniqueName },
        sourceNumber: { $in: uniqueNumber },
        sourceLocation: { $in: uniqueLocation },
      }).lean()

      const profileMap = new Map<string, any>()
      for (const profile of profiles) {
        const key = `${profile.sourceName}|${profile.sourceNumber}|${profile.sourceLocation}`
        profileMap.set(key, profile)
      }

      const data = invoices.map((invoice: any) => {
        const source = buildClientSourceKey(invoice.client)
        const key = `${source.sourceName}|${source.sourceNumber}|${source.sourceLocation}`
        const clientProfile = profileMap.get(key) || null

        return {
          ...invoice,
          clientProfile,
          hasKraSaved: Boolean(clientProfile?.hasKraDetails),
          etimsStatus: String(invoice?.etims?.status || "not_posted"),
        }
      })

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch posts" })
    }
  }

  static async upsertInvoiceClientProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const { legalName, kraPin, email, branchId } = req.body || {}

      if (!legalName || !kraPin) {
        return res.status(400).json({ success: false, message: "legalName and kraPin are required" })
      }

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      const source = buildClientSourceKey(invoice.client)
      if (!source.sourceName || !source.sourceNumber || !source.sourceLocation) {
        return res.status(400).json({ success: false, message: "Invoice client details are incomplete" })
      }

      const hasKraDetails = Boolean(String(legalName).trim() && String(kraPin).trim())

      const profile = await StockClient.findOneAndUpdate(
        {
          org_id,
          sourceName: source.sourceName,
          sourceNumber: source.sourceNumber,
          sourceLocation: source.sourceLocation,
        },
        {
          $set: {
            legalName: String(legalName).trim(),
            kraPin: String(kraPin).trim().toUpperCase(),
            email: String(email || "").trim() || undefined,
            branchId: String(branchId || "").trim() || undefined,
            hasKraDetails,
            updatedBy: String(actorId),
          },
          $setOnInsert: {
            org_id,
            sourceName: source.sourceName,
            sourceNumber: source.sourceNumber,
            sourceLocation: source.sourceLocation,
            createdBy: String(actorId),
          },
        },
        { upsert: true, new: true },
      )

      await StockInvoice.updateOne(
        { _id: invoiceId, org_id },
        { $set: { clientProfileId: String(profile._id) } },
      )

      return res.status(200).json({ success: true, data: profile })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to save client KRA details" })
    }
  }

  static async createOrUpdateClient(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: 'Unauthorized' })

      const { sourceName, sourceNumber, sourceLocation, legalName, contactPerson, kraPin, email, branchId } = req.body || {}

      if (!sourceName || !sourceNumber || !sourceLocation) {
        return res.status(400).json({ success: false, message: 'sourceName, sourceNumber and sourceLocation are required' })
      }

      const resolvedLegalName = String(legalName || sourceName).trim()

      const profile = await StockClient.findOneAndUpdate(
        {
          org_id,
          sourceName: String(sourceName).trim(),
          sourceNumber: String(sourceNumber).trim(),
          sourceLocation: String(sourceLocation).trim(),
        },
        {
          $set: {
            legalName: resolvedLegalName,
            contactPerson: contactPerson ? String(contactPerson).trim() : undefined,
            kraPin: kraPin ? String(kraPin).trim().toUpperCase() : undefined,
            email: email ? String(email).trim() : undefined,
            branchId: branchId ? String(branchId).trim() : undefined,
            hasKraDetails: Boolean(kraPin),
            updatedBy: String(actorId),
          },
          $setOnInsert: {
            org_id,
            sourceName: String(sourceName).trim(),
            sourceNumber: String(sourceNumber).trim(),
            sourceLocation: String(sourceLocation).trim(),
            createdBy: String(actorId),
          },
        },
        { upsert: true, new: true },
      )

      return res.status(200).json({ success: true, data: profile })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to create/update client' })
    }
  }

  static async bulkUploadClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can bulk upload clients" })
      }

      const file = req.file as any
      if (!file) {
        return res.status(400).json({ success: false, message: "CSV file is required" })
      }

      const fileContent = await fs.readFile(file.path, "utf-8")
      const rows = parseCsv(fileContent)

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: "CSV file is empty" })
      }

      let createdCount = 0
      let updatedCount = 0
      const errors: string[] = []

      for (let index = 0; index < rows.length; index += 1) {
        try {
          const row = rows[index]
          const sourceName = String(
            row.client_name ||
              row["Client Name"] ||
              row.sourceName ||
              row["Source Name"] ||
              "",
          ).trim()
          const sourceNumber = String(
            row.client_number ||
              row["Client Number"] ||
              row.sourceNumber ||
              row["Source Number"] ||
              row.client_phone ||
              row["Client Phone"] ||
              "",
          ).trim()
          const sourceLocation = String(
            row.client_location ||
              row["Client Location"] ||
              row.sourceLocation ||
              row["Source Location"] ||
              row.client_address_1 ||
              row["Client Address"] ||
              "",
          ).trim()
          const contactPerson = String(
            row.contact_person ||
              row["Contact Person"] ||
              row.contactPerson ||
              "",
          ).trim()
          const legalName = String(row.legalName || row["Legal Name"] || sourceName).trim()
          const kraPin = String(row.kraPin || row["KRA PIN"] || row.pin_no || row["PIN No"] || "").trim().toUpperCase()
          const email = String(row.email || row["Email"] || row.client_email || row["Client Email"] || "").trim()
          const branchId = String(row.branchId || row["Branch ID"] || "").trim()

          if (!sourceName || !sourceNumber || !sourceLocation) {
            errors.push(`Row ${index + 1}: Missing required fields (Client Name, Client Number, Client Location)`)
            continue
          }

          const profile = await StockClient.findOneAndUpdate(
            {
              org_id,
              sourceName,
              sourceNumber,
              sourceLocation,
            },
            {
              $set: {
                legalName,
                contactPerson: contactPerson || undefined,
                kraPin: kraPin || undefined,
                email: email || undefined,
                branchId: branchId || undefined,
                hasKraDetails: Boolean(kraPin),
                updatedBy: String(actorId),
              },
              $setOnInsert: {
                org_id,
                sourceName,
                sourceNumber,
                sourceLocation,
                createdBy: String(actorId),
              },
            },
            { upsert: true, new: true },
          )

          if (profile.isNew || !profile.updatedAt) {
            createdCount += 1
          } else {
            updatedCount += 1
          }
        } catch (rowError: any) {
          errors.push(`Row ${index + 1}: ${rowError?.message || "Unknown error"}`)
        }
      }

      // Clean up uploaded file
      try {
        await fs.unlink(file.path)
      } catch {
        // Ignore cleanup errors
      }

      return res.status(200).json({
        success: true,
        message: `Bulk upload completed: ${createdCount} created, ${updatedCount} updated${errors.length > 0 ? `, ${errors.length} errors` : ""}`,
        data: {
          totalRows: rows.length,
          createdCount,
          updatedCount,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to bulk upload clients" })
    }
  }

  static async postInvoiceToEtims(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      const source = buildClientSourceKey(invoice.client)
      const clientProfile = await StockClient.findOne({
        org_id,
        sourceName: source.sourceName,
        sourceNumber: source.sourceNumber,
        sourceLocation: source.sourceLocation,
      }).lean()

      if (!clientProfile || !clientProfile.hasKraDetails) {
        return res.status(400).json({ success: false, message: "Save client legal name and KRA PIN first" })
      }

      const etimsPayload = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.createdAt,
        client: {
          legalName: clientProfile.legalName,
          kraPin: clientProfile.kraPin,
          email: clientProfile.email || "",
          branchId: clientProfile.branchId || "",
        },
        totals: {
          subTotal: invoice.subTotal,
        },
        items: invoice.items,
      }

      const kraInvoiceId = `KRA-${String(invoice.invoiceNumber || "").replace(/[^A-Za-z0-9-]/g, "")}`
      const responseMessage = "Posted to eTIMS (VSCU manual post)"

      const updated = await StockInvoice.findOneAndUpdate(
        { _id: invoiceId, org_id },
        {
          $set: {
            clientProfileId: String(clientProfile._id),
            etims: {
              status: "posted",
              kraInvoiceId,
              postedAt: new Date(),
              postedBy: String(actorId),
              responseMessage,
            },
          },
        },
        { new: true },
      ).lean()

      return res.status(200).json({
        success: true,
        message: responseMessage,
        data: {
          invoice: updated,
          kraInvoiceId,
          payload: etimsPayload,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to post sale to eTIMS" })
    }
  }

  static async getExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const expenses = await StockExpense.find({ org_id }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: expenses })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch expenses" })
    }
  }

  static async getAccountsPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const invoices = await StockInvoice.find({ org_id, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).lean()
      const invoiceIds = invoices.map((invoice: any) => String(invoice._id))

      const payments = await StockInvoicePayment.find({
        org_id,
        invoiceId: { $in: invoiceIds },
      })
        .sort({ paidAt: -1, createdAt: -1 })
        .lean()

      const paymentsByInvoice = new Map<string, any[]>()
      for (const payment of payments) {
        const key = String(payment.invoiceId)
        const existing = paymentsByInvoice.get(key) || []
        existing.push(payment)
        paymentsByInvoice.set(key, existing)
      }

      const data = invoices.map((invoice: any) => {
        const invoicePayments = paymentsByInvoice.get(String(invoice._id)) || []
        return buildInvoicePaymentSummary(invoice, invoicePayments)
      })
        .filter((invoice: any) => Number(invoice.balanceRemaining || 0) > 0)

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch payment management data" })
    }
  }

  static async getAccountsClients(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const [quotations, invoices, sales] = await Promise.all([
        StockQuotation.find({ org_id })
          .select("quotationNumber client subTotal status createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        StockInvoice.find({ org_id, status: { $ne: "cancelled" } })
          .select("invoiceNumber client subTotal status createdAt")
          .sort({ createdAt: -1 })
          .lean(),
        StockSale.find({ org_id, isWalkInClient: { $ne: true } })
          .select("buyerName buyerNumber buyerLocation quantitySold soldPrice receiptNumber createdAt")
          .sort({ createdAt: -1 })
          .lean(),
      ])

      const invoiceIds = invoices.map((invoice: any) => String(invoice._id))
      const payments = await StockInvoicePayment.find({ org_id, invoiceId: { $in: invoiceIds } })
        .select("invoiceId invoiceNumber amount paymentMethod reference paidAt createdAt")
        .sort({ paidAt: -1, createdAt: -1 })
        .lean()

      const paymentsByInvoice = new Map<string, any[]>()
      for (const payment of payments) {
        const key = String(payment.invoiceId)
        const existing = paymentsByInvoice.get(key) || []
        existing.push(payment)
        paymentsByInvoice.set(key, existing)
      }

      const clientsMap = new Map<string, any>()

      const ensureClient = (client: { name?: string; number?: string; location?: string }) => {
        const normalized = buildClientSourceKey(client)
        if (!normalized.sourceName || !normalized.sourceNumber || !normalized.sourceLocation) return null

        const key = `${normalized.sourceName}|${normalized.sourceNumber}|${normalized.sourceLocation}`
        if (!clientsMap.has(key)) {
          clientsMap.set(key, {
            key,
            client: {
              name: String(client.name || "").trim(),
              number: String(client.number || "").trim(),
              location: String(client.location || "").trim(),
            },
            quotationsCount: 0,
            quotationsValue: 0,
            invoicesCount: 0,
            purchasesValue: 0,
            paidAmount: 0,
            debtAmount: 0,
            salesCount: 0,
            salesValue: 0,
            lastActivityAt: null,
            activities: [],
          })
        }

        return clientsMap.get(key)
      }

      for (const quotation of quotations) {
        const clientRecord = ensureClient((quotation as any).client)
        if (!clientRecord) continue

        const subTotal = Number((quotation as any).subTotal || 0)
        const createdAt = (quotation as any).createdAt

        clientRecord.quotationsCount += 1
        clientRecord.quotationsValue += subTotal
        clientRecord.activities.push({
          type: "quotation",
          reference: (quotation as any).quotationNumber,
          amount: subTotal,
          status: (quotation as any).status,
          date: createdAt,
        })

        if (!clientRecord.lastActivityAt || new Date(createdAt) > new Date(clientRecord.lastActivityAt)) {
          clientRecord.lastActivityAt = createdAt
        }
      }

      for (const invoice of invoices) {
        const clientRecord = ensureClient((invoice as any).client)
        if (!clientRecord) continue

        const subTotal = Number((invoice as any).subTotal || 0)
        const createdAt = (invoice as any).createdAt
        const invoicePayments = paymentsByInvoice.get(String((invoice as any)._id)) || []
        const paidAmount = invoicePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        const debtAmount = Math.max(0, Number((subTotal - paidAmount).toFixed(2)))

        clientRecord.invoicesCount += 1
        clientRecord.purchasesValue += subTotal
        clientRecord.paidAmount += paidAmount
        clientRecord.debtAmount += debtAmount

        clientRecord.activities.push({
          type: "invoice",
          reference: (invoice as any).invoiceNumber,
          amount: subTotal,
          paidAmount: Number(paidAmount.toFixed(2)),
          debtAmount,
          status: (invoice as any).status,
          date: createdAt,
        })

        for (const payment of invoicePayments) {
          const paymentDate = payment.paidAt || payment.createdAt
          clientRecord.activities.push({
            type: "payment",
            reference: payment.invoiceNumber || (invoice as any).invoiceNumber,
            amount: Number(payment.amount || 0),
            paymentMethod: payment.paymentMethod,
            externalReference: payment.reference,
            date: paymentDate,
          })

          if (!clientRecord.lastActivityAt || new Date(paymentDate) > new Date(clientRecord.lastActivityAt)) {
            clientRecord.lastActivityAt = paymentDate
          }
        }

        if (!clientRecord.lastActivityAt || new Date(createdAt) > new Date(clientRecord.lastActivityAt)) {
          clientRecord.lastActivityAt = createdAt
        }
      }

      for (const sale of sales) {
        const clientRecord = ensureClient({
          name: String((sale as any).buyerName || "").trim(),
          number: String((sale as any).buyerNumber || "").trim(),
          location: String((sale as any).buyerLocation || "").trim(),
        })
        if (!clientRecord) continue

        const saleAmount = Number((sale as any).soldPrice || 0) * Number((sale as any).quantitySold || 0)
        const createdAt = (sale as any).createdAt

        clientRecord.salesCount += 1
        clientRecord.salesValue += saleAmount
        clientRecord.activities.push({
          type: "sale",
          reference: (sale as any).receiptNumber,
          amount: Number(saleAmount.toFixed(2)),
          date: createdAt,
        })

        if (!clientRecord.lastActivityAt || new Date(createdAt) > new Date(clientRecord.lastActivityAt)) {
          clientRecord.lastActivityAt = createdAt
        }
      }

      const data = Array.from(clientsMap.values())
        .map((row: any) => ({
          ...row,
          quotationsValue: Number(row.quotationsValue.toFixed(2)),
          purchasesValue: Number(row.purchasesValue.toFixed(2)),
          paidAmount: Number(row.paidAmount.toFixed(2)),
          debtAmount: Number(row.debtAmount.toFixed(2)),
          salesValue: Number(row.salesValue.toFixed(2)),
          activities: (row.activities || [])
            .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
            .slice(0, 50),
        }))
        .sort((a: any, b: any) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime())

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch accounts clients" })
    }
  }

  static async getBulkSmsAudience(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can use bulk SMS" })
      }

      const audience = await buildBulkSmsAudience(org_id, req.query || {})
      return res.status(200).json({ success: true, data: audience.clients, meta: audience.meta })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to build SMS audience" })
    }
  }

  static async getBulkSmsCampaigns(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can view bulk SMS campaigns" })
      }

      const campaigns = await BulkSmsCampaign.find({ org_id }).sort({ createdAt: -1 }).limit(30).lean()
      return res.status(200).json({ success: true, data: campaigns })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch SMS campaigns" })
    }
  }

  static async sendBulkSmsCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can send bulk SMS campaigns" })
      }

      const name = String(req.body?.name || "").trim()
      const message = String(req.body?.message || "").trim()
      const filters = req.body?.filters || {}
      const selectedRecipientKeys = Array.isArray(req.body?.selectedRecipientKeys)
        ? req.body.selectedRecipientKeys.map((key: any) => String(key))
        : []

      if (!name) return res.status(400).json({ success: false, message: "Campaign name is required" })
      if (!message) return res.status(400).json({ success: false, message: "Message is required" })
      if (name.length > 120) return res.status(400).json({ success: false, message: "Campaign name is too long (max 120 characters)" })
      if (message.length > 800) return res.status(400).json({ success: false, message: "Message is too long (max 800 characters)" })

      const audience = await buildBulkSmsAudience(org_id, filters)
      let recipients = audience.clients

      if (selectedRecipientKeys.length > 0) {
        const selected = new Set(selectedRecipientKeys)
        recipients = recipients.filter((recipient) => selected.has(recipient.key))
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: "No recipients selected for this campaign" })
      }

      const recipientResults = []
      for (const recipient of recipients) {
        try {
          const smsResult = await smsService.sendDispatchSms({
            to: recipient.phone,
            message,
          })

          recipientResults.push({
            key: recipient.key,
            name: recipient.name,
            phone: recipient.phone,
            normalizedPhone: smsResult.normalizedTo,
            location: recipient.location,
            status: smsResult.success ? "sent" : "failed",
            providerMessageId: smsResult.providerMessageId,
            providerRawResponse: smsResult.providerRawResponse,
            errorMessage: smsResult.success ? undefined : smsResult.error,
            sentAt: smsResult.success ? new Date() : undefined,
          })
        } catch (sendError: any) {
          recipientResults.push({
            key: recipient.key,
            name: recipient.name,
            phone: recipient.phone,
            location: recipient.location,
            status: "failed",
            errorMessage: sendError?.message || "Failed to send SMS",
          })
        }
      }

      const sentCount = recipientResults.filter((recipient) => recipient.status === "sent").length
      const failedCount = recipientResults.filter((recipient) => recipient.status === "failed").length
      const skippedCount = recipientResults.filter((recipient) => recipient.status === "skipped").length

      const campaign = await BulkSmsCampaign.create({
        org_id,
        name,
        message,
        filters,
        audienceCount: recipients.length,
        sentCount,
        failedCount,
        skippedCount,
        status: failedCount > 0 ? (sentCount > 0 ? "completed_with_errors" : "failed") : "completed",
        recipients: recipientResults,
        createdBy: String(userId),
      })

      return res.status(201).json({
        success: true,
        message: `Campaign sent to ${sentCount}/${recipients.length} clients`,
        data: campaign,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to send bulk SMS campaign" })
    }
  }

  static async addInvoicePayment(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const { amount, paymentMethod, reference, note, paidAt } = req.body || {}

      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: "Valid payment amount is required" })
      }

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      if (invoice.status === "cancelled") {
        return res.status(400).json({ success: false, message: "Cannot add payment to cancelled invoice" })
      }

      const existingPayments = await StockInvoicePayment.find({ org_id, invoiceId: String(invoice._id) }).lean()
      const alreadyPaid = existingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const subTotal = Number(invoice.subTotal || 0)
      const balanceRemaining = Math.max(0, Number((subTotal - alreadyPaid).toFixed(2)))

      if (numericAmount > balanceRemaining) {
        return res.status(400).json({
          success: false,
          message: `Payment exceeds remaining balance (${balanceRemaining.toFixed(2)})`,
        })
      }

      const normalizedPaidAt = paidAt ? new Date(paidAt) : new Date()
      if (Number.isNaN(normalizedPaidAt.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid paidAt date" })
      }

      const payment = await StockInvoicePayment.create({
        org_id,
        invoiceId: String(invoice._id),
        invoiceNumber: String(invoice.invoiceNumber),
        amount: Number(numericAmount.toFixed(2)),
        paymentMethod: String(paymentMethod || "cash").trim() || "cash",
        reference: String(reference || "").trim() || undefined,
        note: String(note || "").trim() || undefined,
        paidAt: normalizedPaidAt,
        receivedBy: String(actorId),
      })

      const newPaidAmount = alreadyPaid + Number(payment.amount || 0)
      const isFullyPaid = newPaidAmount >= subTotal
      await StockInvoice.updateOne(
        { _id: invoiceId, org_id },
        { $set: { status: isFullyPaid ? "paid" : "issued" } },
      )

      return res.status(201).json({
        success: true,
        message: isFullyPaid ? "Payment saved. Invoice is now fully settled" : "Payment saved",
        data: payment,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to add payment" })
    }
  }

  static async getDebtManagement(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const invoices = await StockInvoice.find({ org_id, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).lean()
      const invoiceIds = invoices.map((invoice: any) => String(invoice._id))

      const payments = await StockInvoicePayment.find({
        org_id,
        invoiceId: { $in: invoiceIds },
      })
        .sort({ paidAt: -1, createdAt: -1 })
        .lean()

      const paymentsByInvoice = new Map<string, any[]>()
      for (const payment of payments) {
        const key = String(payment.invoiceId)
        const existing = paymentsByInvoice.get(key) || []
        existing.push(payment)
        paymentsByInvoice.set(key, existing)
      }

      const data = invoices
        .map((invoice: any) => {
          const invoicePayments = paymentsByInvoice.get(String(invoice._id)) || []
          return buildInvoicePaymentSummary(invoice, invoicePayments)
        })
        .filter((invoice: any) => Number(invoice.balanceRemaining || 0) > 0)

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch debt management data" })
    }
  }

  static async getAgingDebtReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const invoices = await StockInvoice.find({ org_id, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).lean()
      const invoiceIds = invoices.map((invoice: any) => String(invoice._id))
      const payments = await StockInvoicePayment.find({ org_id, invoiceId: { $in: invoiceIds } }).lean()

      const paymentsByInvoice = new Map<string, any[]>()
      for (const payment of payments) {
        const key = String(payment.invoiceId)
        paymentsByInvoice.set(key, [...(paymentsByInvoice.get(key) || []), payment])
      }

      const buckets = {
        current: { label: "0-30 days", count: 0, amount: 0 },
        days31To60: { label: "31-60 days", count: 0, amount: 0 },
        days61To90: { label: "61-90 days", count: 0, amount: 0 },
        over90: { label: "90+ days", count: 0, amount: 0 },
      }

      const rows = invoices
        .map((invoice: any) => buildInvoicePaymentSummary(invoice, paymentsByInvoice.get(String(invoice._id)) || []))
        .filter((invoice: any) => Number(invoice.balanceRemaining || 0) > 0)
        .map((invoice: any) => {
          const ageDays = Math.max(0, Math.floor((Date.now() - new Date(invoice.createdAt || Date.now()).getTime()) / (24 * 60 * 60 * 1000)))
          const bucketKey = ageDays <= 30 ? "current" : ageDays <= 60 ? "days31To60" : ageDays <= 90 ? "days61To90" : "over90"
          buckets[bucketKey].count += 1
          buckets[bucketKey].amount = Number((buckets[bucketKey].amount + Number(invoice.balanceRemaining || 0)).toFixed(2))

          return {
            invoiceId: String(invoice._id),
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client,
            invoiceDate: invoice.createdAt,
            ageDays,
            bucket: buckets[bucketKey].label,
            subTotal: invoice.subTotal,
            paidAmount: invoice.paidAmount,
            balanceRemaining: invoice.balanceRemaining,
            nextPaymentDate: invoice.nextPaymentDate,
          }
        })

      const totalOutstanding = rows.reduce((sum, row) => sum + Number(row.balanceRemaining || 0), 0)

      return res.status(200).json({
        success: true,
        data: {
          totalOutstanding: Number(totalOutstanding.toFixed(2)),
          buckets,
          rows,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch aging debt report" })
    }
  }

  static async getProfitMarginAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const [products, sales, invoices] = await Promise.all([
        StockProduct.find({ org_id, isActive: { $ne: false } }).lean(),
        StockSale.find({ org_id }).lean(),
        StockInvoice.find({ org_id, status: { $ne: "cancelled" } }).lean(),
      ])

      const productMap = new Map(products.map((product: any) => [String(product._id), product]))
      const marginByProduct = new Map<string, any>()

      const ensureRow = (productId: string, productName: string, startingPrice = 0) => {
        if (!marginByProduct.has(productId)) {
          marginByProduct.set(productId, {
            productId,
            productName,
            quantity: 0,
            revenue: 0,
            estimatedCost: 0,
            grossProfit: 0,
            grossMarginPercent: 0,
          })
        }
        const row = marginByProduct.get(productId)
        row.productName = row.productName || productName
        row.startingPrice = startingPrice
        return row
      }

      for (const sale of sales as any[]) {
        const product = productMap.get(String(sale.productId))
        const quantity = Number(sale.quantitySold || 0)
        const revenue = Number(sale.soldPrice || 0) * quantity
        const unitCost = Number(product?.startingPrice || 0)
        const row = ensureRow(String(sale.productId), product?.name || "Unknown product", unitCost)
        row.quantity += quantity
        row.revenue += revenue
        row.estimatedCost += unitCost * quantity
      }

      for (const invoice of invoices as any[]) {
        for (const item of invoice.items || []) {
          const product = productMap.get(String(item.productId))
          const quantity = Number(item.quantity || 0)
          const revenue = Number(item.lineTotal || Number(item.unitPrice || 0) * quantity)
          const unitCost = Number(product?.startingPrice || 0)
          const row = ensureRow(String(item.productId), item.productName || product?.name || "Unknown product", unitCost)
          row.quantity += quantity
          row.revenue += revenue
          row.estimatedCost += unitCost * quantity
        }
      }

      const rows = Array.from(marginByProduct.values())
        .map((row) => {
          const grossProfit = row.revenue - row.estimatedCost
          const grossMarginPercent = row.revenue > 0 ? (grossProfit / row.revenue) * 100 : 0
          return {
            ...row,
            revenue: Number(row.revenue.toFixed(2)),
            estimatedCost: Number(row.estimatedCost.toFixed(2)),
            grossProfit: Number(grossProfit.toFixed(2)),
            grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
          }
        })
        .sort((a, b) => b.grossProfit - a.grossProfit)

      const totals = rows.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          estimatedCost: acc.estimatedCost + row.estimatedCost,
          grossProfit: acc.grossProfit + row.grossProfit,
        }),
        { revenue: 0, estimatedCost: 0, grossProfit: 0 },
      )

      return res.status(200).json({
        success: true,
        data: {
          totals: {
            revenue: Number(totals.revenue.toFixed(2)),
            estimatedCost: Number(totals.estimatedCost.toFixed(2)),
            grossProfit: Number(totals.grossProfit.toFixed(2)),
            grossMarginPercent: totals.revenue > 0 ? Number(((totals.grossProfit / totals.revenue) * 100).toFixed(1)) : 0,
          },
          rows,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch profit margin analytics" })
    }
  }

  static async getProductMovementForecast(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const [products, sales] = await Promise.all([
        StockProduct.find({ org_id, isActive: { $ne: false } }).lean(),
        StockSale.find({ org_id, createdAt: { $gte: since } }).lean(),
      ])

      const soldByProduct = new Map<string, number>()
      for (const sale of sales as any[]) {
        const key = String(sale.productId)
        soldByProduct.set(key, (soldByProduct.get(key) || 0) + Number(sale.quantitySold || 0))
      }

      const rows = products.map((product: any) => {
        const quantitySold90Days = soldByProduct.get(String(product._id)) || 0
        const averageDailyMovement = quantitySold90Days / 90
        const daysOfStockRemaining = averageDailyMovement > 0
          ? Math.floor(Number(product.currentQuantity || 0) / averageDailyMovement)
          : null

        return {
          productId: String(product._id),
          productName: product.name,
          currentQuantity: Number(product.currentQuantity || 0),
          minAlertQuantity: Number(product.minAlertQuantity || 0),
          quantitySold90Days,
          averageDailyMovement: Number(averageDailyMovement.toFixed(2)),
          daysOfStockRemaining,
          riskLevel:
            Number(product.currentQuantity || 0) <= Number(product.minAlertQuantity || 0)
              ? "low_stock"
              : daysOfStockRemaining !== null && daysOfStockRemaining <= 14
                ? "reorder_soon"
                : "healthy",
        }
      }).sort((a, b) => {
        const aDays = a.daysOfStockRemaining ?? Number.MAX_SAFE_INTEGER
        const bDays = b.daysOfStockRemaining ?? Number.MAX_SAFE_INTEGER
        return aDays - bDays
      })

      return res.status(200).json({ success: true, data: rows })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch product movement forecast" })
    }
  }

  static async getInventoryValuationReport(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const products = await StockProduct.find({ org_id, isActive: { $ne: false } }).sort({ name: 1 }).lean()
      const rows = products.map((product: any) => {
        const quantity = Number(product.currentQuantity || 0)
        const costValue = quantity * Number(product.startingPrice || 0)
        const retailValue = quantity * Number(product.sellingPrice || 0)
        return {
          productId: String(product._id),
          productName: product.name,
          category: product.category,
          quantity,
          startingPrice: Number(product.startingPrice || 0),
          sellingPrice: Number(product.sellingPrice || 0),
          costValue: Number(costValue.toFixed(2)),
          retailValue: Number(retailValue.toFixed(2)),
          unrealizedMargin: Number((retailValue - costValue).toFixed(2)),
        }
      })

      const totals = rows.reduce(
        (acc, row) => ({
          quantity: acc.quantity + row.quantity,
          costValue: acc.costValue + row.costValue,
          retailValue: acc.retailValue + row.retailValue,
          unrealizedMargin: acc.unrealizedMargin + row.unrealizedMargin,
        }),
        { quantity: 0, costValue: 0, retailValue: 0, unrealizedMargin: 0 },
      )

      return res.status(200).json({
        success: true,
        data: {
          totals: {
            quantity: totals.quantity,
            costValue: Number(totals.costValue.toFixed(2)),
            retailValue: Number(totals.retailValue.toFixed(2)),
            unrealizedMargin: Number(totals.unrealizedMargin.toFixed(2)),
          },
          rows,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch inventory valuation report" })
    }
  }

  static async initiateExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { payerPhone, payeePhone, amount, purpose } = req.body || {}
      if (!payerPhone || !payeePhone || !amount || !purpose) {
        return res.status(400).json({
          success: false,
          message: "payerPhone, payeePhone, amount and purpose are required",
        })
      }

      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" })
      }

      const accountReference = `EXP-${Date.now()}`
      const transactionDesc = String(purpose).trim().slice(0, 180) || "Business expense"
      const stkResult = await mpesaService.initiateStkPush({
        payerPhone: String(payerPhone),
        amount: numericAmount,
        accountReference,
        transactionDesc,
      })

      const expense = await StockExpense.create({
        org_id,
        payerPhone: mpesaService.normalizePhone(String(payerPhone)),
        payeePhone: mpesaService.normalizePhone(String(payeePhone)),
        amount: Number(numericAmount.toFixed(2)),
        purpose: String(purpose).trim(),
        status: stkResult.success ? "prompt_sent" : "failed",
        mpesaCheckoutRequestId: stkResult.checkoutRequestId,
        mpesaMerchantRequestId: stkResult.merchantRequestId,
        responseMessage: stkResult.responseMessage,
        initiatedBy: String(actorId),
      })

      return res.status(201).json({
        success: stkResult.success,
        message: stkResult.responseMessage,
        data: expense,
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to initiate expense" })
    }
  }

  static async getRepeatBills(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const repeatBills = await StockRepeatBill.find({ org_id }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: repeatBills })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch repeat bills" })
    }
  }

  static async createRepeatBill(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { payerPhone, payeePhones, amount, purpose, sendNow } = req.body || {}
      if (!payerPhone || !amount || !purpose) {
        return res.status(400).json({ success: false, message: "payerPhone, amount and purpose are required" })
      }

      const normalizedPayees = Array.isArray(payeePhones)
        ? Array.from(new Set(payeePhones.map((value) => String(value).trim()).filter(Boolean)))
        : splitPhoneList(String(payeePhones || ""))

      if (!normalizedPayees.length) {
        return res.status(400).json({ success: false, message: "At least one payee number is required" })
      }

      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" })
      }

      const payer = mpesaService.normalizePhone(String(payerPhone))
      const payees = normalizedPayees.map((phone) => mpesaService.normalizePhone(phone)).filter(Boolean)

      const repeatBill = await StockRepeatBill.create({
        org_id,
        payerPhone: payer,
        payeePhones: payees,
        amount: Number(numericAmount.toFixed(2)),
        purpose: String(purpose).trim(),
        createdBy: String(actorId),
        updatedBy: String(actorId),
      })

      let sentCount = 0
      let failedCount = 0

      if (sendNow !== false) {
        for (const payeePhone of payees) {
          const accountReference = `EXP-${Date.now()}-${Math.floor(Math.random() * 9999)}`
          const transactionDesc = String(purpose).trim().slice(0, 180) || "Business expense"
          const stkResult = await mpesaService.initiateStkPush({
            payerPhone: payer,
            amount: numericAmount,
            accountReference,
            transactionDesc,
          })

          await StockExpense.create({
            org_id,
            payerPhone: payer,
            payeePhone,
            amount: Number(numericAmount.toFixed(2)),
            purpose: String(purpose).trim(),
            status: stkResult.success ? "prompt_sent" : "failed",
            mpesaCheckoutRequestId: stkResult.checkoutRequestId,
            mpesaMerchantRequestId: stkResult.merchantRequestId,
            responseMessage: stkResult.responseMessage,
            initiatedBy: String(actorId),
          })

          if (stkResult.success) sentCount += 1
          else failedCount += 1
        }

        await StockRepeatBill.updateOne(
          { _id: repeatBill._id, org_id },
          {
            $set: {
              lastRunAt: new Date(),
              lastRunCount: sentCount,
              updatedBy: String(actorId),
            },
          },
        )
      }

      return res.status(201).json({
        success: true,
        message: sendNow === false
          ? "Repeat bill saved"
          : `Repeat bill saved and prompts sent (${sentCount} success, ${failedCount} failed)`,
        data: {
          repeatBillId: String(repeatBill._id),
          sentCount,
          failedCount,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create repeat bill" })
    }
  }

  static async runRepeatBill(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { repeatBillId } = req.params
      const repeatBill = await StockRepeatBill.findOne({ _id: repeatBillId, org_id }).lean()
      if (!repeatBill) return res.status(404).json({ success: false, message: "Repeat bill not found" })

      let sentCount = 0
      let failedCount = 0

      for (const payeePhone of repeatBill.payeePhones || []) {
        const accountReference = `EXP-${Date.now()}-${Math.floor(Math.random() * 9999)}`
        const transactionDesc = String(repeatBill.purpose || "Business expense").trim().slice(0, 180)

        const stkResult = await mpesaService.initiateStkPush({
          payerPhone: repeatBill.payerPhone,
          amount: repeatBill.amount,
          accountReference,
          transactionDesc,
        })

        await StockExpense.create({
          org_id,
          payerPhone: repeatBill.payerPhone,
          payeePhone,
          amount: repeatBill.amount,
          purpose: repeatBill.purpose,
          status: stkResult.success ? "prompt_sent" : "failed",
          mpesaCheckoutRequestId: stkResult.checkoutRequestId,
          mpesaMerchantRequestId: stkResult.merchantRequestId,
          responseMessage: stkResult.responseMessage,
          initiatedBy: String(actorId),
        })

        if (stkResult.success) sentCount += 1
        else failedCount += 1
      }

      await StockRepeatBill.updateOne(
        { _id: repeatBillId, org_id },
        {
          $set: {
            lastRunAt: new Date(),
            lastRunCount: sentCount,
            updatedBy: String(actorId),
          },
        },
      )

      return res.status(200).json({
        success: true,
        message: `Repeat bill executed (${sentCount} success, ${failedCount} failed)`,
        data: { sentCount, failedCount },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to run repeat bill" })
    }
  }

  static async convertQuotationToInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      const role = req.user?.role
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (!isAdminRole(role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can convert quotations to invoices" })
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
        createdBy: String(quotation.createdBy || actorId),
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

  static async createInvoiceFromItems(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { clientName, clientNumber, clientLocation, client, items, payNow = false } = req.body || {}
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "At least one item is required" })
      }

      const resolvedClientName = String(clientName || client?.name || "Walk-in Client").trim()
      const resolvedClientNumber = String(clientNumber || client?.number || "WALK-IN").trim()
      const resolvedClientLocation = String(clientLocation || client?.location || "Walk-in").trim()

      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const subTotal = Number(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2))

      const invoice = await StockInvoice.create({
        org_id,
        invoiceNumber: generateDocumentNumber("INV"),
        deliveryNoteNumber: generateDocumentNumber("DN"),
        client: {
          name: resolvedClientName,
          number: resolvedClientNumber,
          location: resolvedClientLocation,
        },
        items: normalizedItems,
        subTotal,
        status: payNow ? "paid" : "issued",
        dispatch: {
          status: "not_assigned",
          packingItems: normalizedItems.map((item: any) => ({ productId: item.productId, productName: item.productName, requiredQuantity: item.quantity, packedQuantity: 0 })),
          packingCompleted: false,
          inquiries: [],
        },
        createdBy: String(actorId),
      })

      // Handle stock-managed items → create StockSale records and decrement stock
      const stockManagedItems = normalizedItems.filter((i: any) => !i.isOutsourced)
      const productIds = [...new Set(stockManagedItems.map((item: any) => item.productId).filter(Boolean))]
      const products = await StockProduct.find({ _id: { $in: productIds }, org_id })
      const productMap = new Map(products.map((p) => [String(p._id), p]))

      for (const item of stockManagedItems) {
        const product = productMap.get(String(item.productId))
        if (!product) {
          return res.status(400).json({ success: false, message: `Product not found: ${item.productName}` })
        }
        if (product.currentQuantity < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${item.productName}. Available: ${product.currentQuantity}, requested: ${item.quantity}` })
        }
      }

      const receiptNumber = generateDocumentNumber("RCP")

      const salesToCreate = stockManagedItems.map((item: any) => {
        const product = productMap.get(String(item.productId))!
        product.currentQuantity -= item.quantity

        return {
          org_id,
          productId: item.productId,
          quantitySold: item.quantity,
          soldPrice: item.unitPrice,
          soldBy: actorId,
          buyerName: invoice.client.name,
          buyerNumber: invoice.client.number,
          buyerLocation: invoice.client.location,
          isWalkInClient: invoice.client.name === "Walk-in Client" || invoice.client.number === "WALK-IN",
          isSalesCompany: false,
          quotationId: undefined,
          invoiceId: String(invoice._id),
          receiptNumber,
          remainingQuantity: product.currentQuantity,
        }
      })

      if (products.length > 0) {
        await Promise.all(products.map((p) => p.save()))
        await Promise.all(products.map((p) => sendLowStockAlert(p, org_id)))
      }

      if (salesToCreate.length > 0) {
        await StockSale.insertMany(salesToCreate)
      }

      // If payNow requested, create a payment record marking invoice fully paid
      let payment: any = null
      if (payNow) {
        payment = await StockInvoicePayment.create({
          org_id,
          invoiceId: String(invoice._id),
          invoiceNumber: String(invoice.invoiceNumber),
          amount: Number(subTotal.toFixed(2)),
          paymentMethod: "cash",
          reference: receiptNumber,
          paidAt: new Date(),
          receivedBy: String(actorId),
        })
        await StockInvoice.updateOne({ _id: invoice._id, org_id }, { $set: { status: "paid" } })
      }

      return res.status(201).json({ success: true, data: { invoice, payment } })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create invoice from items" })
    }
  }

  static async addQuotationFollowUp(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const { note, callMade, outcome } = req.body || {}
      if (!note || String(note).trim().length === 0) {
        return res.status(400).json({ success: false, message: "Note is required" })
      }

      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" })

      const doc = await QuotationFollowUp.create({
        org_id,
        quotationId: String(quotation._id),
        note: String(note).trim(),
        callMade: !!callMade,
        outcome: outcome ? String(outcome).trim() : undefined,
        createdBy: String(actorId),
      })

      return res.status(201).json({ success: true, data: doc })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to add follow up" })
    }
  }

  static async getQuotationFollowUps(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { quotationId } = req.params
      const followups = await QuotationFollowUp.find({ org_id, quotationId: String(quotationId) }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: followups })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch follow ups" })
    }
  }

  static async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (role === "employee") {
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })
        query.createdBy = String(userId)
      }

      const invoices = await StockInvoice.find(query).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch invoices" })
    }
  }

  static async getInvoiceLifecycle(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      const [payments, creditNotes, quotation] = await Promise.all([
        StockInvoicePayment.find({ org_id, invoiceId: String(invoice._id) }).sort({ paidAt: -1, createdAt: -1 }).lean(),
        CreditNote.find({ org_id, invoiceId: String(invoice._id) }).sort({ createdAt: -1 }).lean(),
        invoice.quotationId
          ? StockQuotation.findOne({ _id: invoice.quotationId, org_id }).lean()
          : Promise.resolve(null),
      ])

      const paymentSummary = buildInvoicePaymentSummary(invoice, payments)
      const dispatchStatus = String(invoice.dispatch?.status || "not_assigned")
      const creditNoteTotal = creditNotes.reduce((sum: number, note: any) => sum + Number(note.subTotal || 0), 0)
      const steps = [
        {
          key: "quotation",
          label: "Quotation",
          status: quotation || invoice.quotationId ? "completed" : "not_started",
          reference: quotation?.quotationNumber || invoice.quotationNumber || null,
          completedAt: quotation?.createdAt || null,
        },
        {
          key: "invoice",
          label: "Invoice",
          status: invoice.status === "cancelled" ? "cancelled" : "completed",
          reference: invoice.invoiceNumber,
          completedAt: invoice.createdAt || null,
        },
        {
          key: "payment",
          label: "Payment",
          status: paymentSummary.balanceRemaining <= 0 ? "completed" : paymentSummary.paidAmount > 0 ? "in_progress" : "pending",
          paidAmount: paymentSummary.paidAmount,
          balanceRemaining: paymentSummary.balanceRemaining,
          completedAt: paymentSummary.balanceRemaining <= 0 ? paymentSummary.lastPayment?.paidAt || paymentSummary.lastPayment?.createdAt || null : null,
        },
        {
          key: "dispatch",
          label: "Dispatch",
          status: ["dispatched", "delivered"].includes(dispatchStatus) ? "completed" : dispatchStatus,
          assignedToUserId: invoice.dispatch?.assignedToUserId || null,
          completedAt: invoice.dispatch?.dispatchedAt || null,
        },
        {
          key: "delivery",
          label: "Delivery",
          status: dispatchStatus === "delivered" ? "completed" : "pending",
          condition: invoice.dispatch?.delivery?.condition || null,
          completedAt: invoice.dispatch?.delivery?.confirmedAt || null,
        },
        {
          key: "credit_note",
          label: "Credit Note",
          status: creditNotes.length > 0 ? "has_credit_notes" : "not_started",
          count: creditNotes.length,
          totalAmount: Number(creditNoteTotal.toFixed(2)),
        },
      ]

      return res.status(200).json({
        success: true,
        data: {
          invoice,
          quotation,
          payments,
          creditNotes,
          paymentSummary,
          steps,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch invoice lifecycle" })
    }
  }

  static async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id }).lean()
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (role === "employee" && String((invoice as any).createdBy || "") !== String(userId || "")) {
        return res.status(403).json({ success: false, message: "You can only view your own invoice" })
      }

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

      await upsertPackagingDutyTask({
        orgId: org_id,
        invoice: updatedInvoice,
        assignedToUserId: String(assignedToUserId),
        assignedByUserId: String(actorId),
        status: "in_progress",
      })

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

      if (updatedInvoice?.dispatch?.assignedToUserId) {
        await upsertPackagingDutyTask({
          orgId: org_id,
          invoice: updatedInvoice,
          assignedToUserId: String(updatedInvoice.dispatch.assignedToUserId),
          assignedByUserId: String(updatedInvoice.dispatch.assignedByUserId || userId),
          status: packingCompleted ? "completed" : "in_progress",
        })
      }

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

      if (!updatedInvoice) {
        return res.status(404).json({ success: false, message: "Invoice not found after dispatch update" })
      }

      const smsNotification = await sendDispatchNotificationForInvoice({
        orgId: org_id,
        userId: String(userId),
        invoice: updatedInvoice,
      })

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

  static async sendDispatchClientNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { invoiceId } = req.params
      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!canManageDispatchForInvoice(req, invoice)) {
        return res.status(403).json({ success: false, message: "Not allowed to send dispatch notification for this invoice" })
      }

      const smsNotification = await sendDispatchNotificationForInvoice({
        orgId: org_id,
        userId: String(userId),
        invoice,
      })

      return res.status(200).json({ success: true, smsNotification })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to send dispatch notification" })
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

      const company = await Company.findById(org_id).select("name dispatchSmsSettings").lean()
      const smsSenderName = String(company?.dispatchSmsSettings?.smsSenderName || company?.name || process.env.WEBSMS_DEFAULT_SENDER_NAME || "YourCompany").trim()

      const smsResult = await smsService.sendDispatchSms({
        to: notification.clientNumber,
        message: notification.message,
        senderName: smsSenderName,
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
          message: smsResult.success
            ? `${notification.notificationType === "delivery" ? "Delivery" : "Dispatch"} SMS resent successfully`
            : (smsResult.error || `${notification.notificationType === "delivery" ? "Delivery" : "Dispatch"} SMS resend failed`),
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

      if (!updatedInvoice) {
        return res.status(404).json({ success: false, message: "Invoice not found after delivery update" })
      }

      const deliverySmsNotification = await sendDeliveryNotificationForInvoice({
        orgId: org_id,
        userId: String(userId),
        invoice: updatedInvoice,
      })

      return res.status(200).json({ success: true, data: updatedInvoice, deliverySmsNotification })
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
        buyingPrice,
        sellingPrice,
        minAlertQuantity,
        currentQuantity = 0,
        assignedUsers = [],
        isOutsourced = false,
        expiryEnabled = false,
        expiryDate,
        expiryReminderDays = 7,
        branchId,
      } = req.body

      const resolvedBuyingPrice = buyingPrice !== undefined ? buyingPrice : startingPrice

      if (!name || !category) {
        return res.status(400).json({ success: false, message: "Product name and category are required" })
      }

      if (resolvedBuyingPrice === undefined || resolvedBuyingPrice === null || sellingPrice === undefined || sellingPrice === null) {
        return res.status(400).json({ success: false, message: "Buying price and selling price are required" })
      }

      if (Number(resolvedBuyingPrice) < 0 || Number(sellingPrice) < 0 || Number(minAlertQuantity) < 0 || Number(currentQuantity) < 0) {
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

      const trimmedBranchId = branchId ? String(branchId).trim() : ""
      if (trimmedBranchId) {
        const branch = await Branch.findOne({ _id: trimmedBranchId, org_id }).select("_id").lean()
        if (!branch) {
          return res.status(404).json({ success: false, message: "Branch not found" })
        }
      }

      const product = await StockProduct.create({
        org_id,
        name: String(name).trim(),
        category,
        startingPrice: Number(resolvedBuyingPrice),
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

      if (Number(currentQuantity) > 0 && trimmedBranchId) {
        await StockEntry.create({
          org_id,
          productId: String(product._id),
          branchId: trimmedBranchId,
          quantityAdded: Number(currentQuantity),
          isOutsourced: Boolean(isOutsourced),
          expiryEnabled: Boolean(expiryEnabled),
          expiryDate: expiryEnabled && expiryDate ? new Date(expiryDate) : null,
          expiryReminderDays: Number(expiryReminderDays),
          addedBy: createdBy,
          note: "Initial stock from product create",
        })
      }

      return res.status(201).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create product" })
    }
  }

  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const products = await StockProduct.find({ org_id, isActive: { $ne: false } })
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
        buyingPrice,
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
      if (buyingPrice !== undefined) payload.startingPrice = Number(buyingPrice)
      else if (startingPrice !== undefined) payload.startingPrice = Number(startingPrice)
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

  static async deleteProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can delete products" })
      }

      const { id } = req.params

      const product = await StockProduct.findOneAndUpdate(
        { _id: id, org_id },
        {
          $set: {
            isActive: false,
          },
        },
        { new: true },
      )

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" })
      }

      return res.status(200).json({ success: true, message: "Product removed successfully" })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to delete product" })
    }
  }

  static async bulkUploadProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can bulk upload products" })
      }

      const file = req.file as any
      if (!file) {
        return res.status(400).json({ success: false, message: "CSV file is required" })
      }

      const fileContent = await fs.readFile(file.path, "utf-8")
      const rows = parseCsv(fileContent)

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: "CSV file is empty" })
      }

      const defaultBranchId = String(req.body?.branchId || "").trim()

      // Get all categories for lookup
      const [categories, orgBranches] = await Promise.all([
        StockCategory.find({ org_id }).lean(),
        Branch.find({ org_id, isActive: { $ne: false } }).select("_id name code").lean(),
      ])
      const categoryMap = new Map(
        categories.map((cat: any) => [
          String(cat.name).toLowerCase(),
          String(cat._id),
        ]),
      )
      const branchMap = new Map<string, string>()
      for (const branch of orgBranches) {
        branchMap.set(String(branch._id).toLowerCase(), String(branch._id))
        branchMap.set(String(branch.name || "").trim().toLowerCase(), String(branch._id))
        branchMap.set(String(branch.code || "").trim().toLowerCase(), String(branch._id))
      }

      const resolveBranchId = (row: Record<string, string>) => {
        const raw = String(
          row.branch ||
            row["Branch"] ||
            row.branchId ||
            row["Branch ID"] ||
            row.branch_code ||
            row["Branch Code"] ||
            defaultBranchId ||
            "",
        ).trim()
        if (!raw) return ""
        return branchMap.get(raw.toLowerCase()) || ""
      }

      let createdCount = 0
      let updatedCount = 0
      const errors: string[] = []

      for (let index = 0; index < rows.length; index += 1) {
        try {
          const row = rows[index]
          const name = String(row.name || row["Product Name"] || "").trim()
          const categoryName = String(row.category || row["Category"] || "").trim()
          const startingPrice = parseBuyingPrice(row)
          const sellingPrice = parseAmount(row.sellingPrice || row["Selling Price"] || "0")
          const minAlertQuantity = Number(row.minAlertQuantity || row["Min Alert Quantity"] || "0")
          const currentQuantity = Number(row.currentQuantity || row["Current Quantity"] || "0")
          const branchId = resolveBranchId(row)

          if (!name || !categoryName) {
            errors.push(`Row ${index + 1}: Missing required fields (name, category)`)
            continue
          }

          const categoryId = categoryMap.get(categoryName.toLowerCase())
          if (!categoryId) {
            errors.push(`Row ${index + 1}: Category "${categoryName}" not found`)
            continue
          }

          const branchLookup = String(
            row.branch ||
              row["Branch"] ||
              row.branchId ||
              row["Branch ID"] ||
              row.branch_code ||
              row["Branch Code"] ||
              "",
          ).trim()

          if (branchLookup && !branchId) {
            errors.push(`Row ${index + 1}: Branch "${branchLookup}" not found`)
            continue
          }

          if (orgBranches.length > 0 && currentQuantity > 0 && !branchId) {
            errors.push(`Row ${index + 1}: Select a branch for stock quantity`)
            continue
          }

          const existingProduct = await StockProduct.findOne({ org_id, name })
          let productId = existingProduct ? String(existingProduct._id) : ""

          if (existingProduct) {
            await StockProduct.findOneAndUpdate(
              { org_id, name },
              {
                $set: {
                  category: categoryId,
                  startingPrice,
                  sellingPrice,
                  minAlertQuantity,
                  currentQuantity,
                },
              },
            )
            updatedCount += 1
          } else {
            const created = await StockProduct.create({
              org_id,
              name,
              category: categoryId,
              startingPrice,
              sellingPrice,
              minAlertQuantity,
              currentQuantity,
              createdBy: actorId,
            })
            productId = String(created._id)
            createdCount += 1
          }

          if (branchId && currentQuantity > 0 && productId) {
            await StockEntry.create({
              org_id,
              productId,
              branchId,
              quantityAdded: currentQuantity,
              addedBy: actorId,
              note: "Bulk upload stock",
            })
          }
        } catch (rowError: any) {
          errors.push(`Row ${index + 1}: ${rowError?.message || "Unknown error"}`)
        }
      }

      // Clean up uploaded file
      try {
        await fs.unlink(file.path)
      } catch {
        // Ignore cleanup errors
      }

      return res.status(200).json({
        success: true,
        message: `Bulk upload completed: ${createdCount} created, ${updatedCount} updated${errors.length > 0 ? `, ${errors.length} errors` : ""}`,
        data: {
          totalRows: rows.length,
          createdCount,
          updatedCount,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to bulk upload products" })
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
        branchId,
      } = req.body

      if (!productId || Number(quantityAdded) <= 0) {
        return res.status(400).json({ success: false, message: "productId and positive quantityAdded are required" })
      }

      if (Boolean(isOutsourced) && !String(outsourcedCompany || "").trim()) {
        return res.status(400).json({ success: false, message: "outsourcedCompany is required when stock entry is outsourced" })
      }

      const product = await StockProduct.findOne({ _id: productId, org_id })
      if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      if (branchId) {
        const branch = await Branch.findOne({ _id: String(branchId).trim(), org_id })
        if (!branch) {
          return res.status(404).json({ success: false, message: "Branch not found" })
        }
      }

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
        branchId: branchId ? String(branchId).trim() : undefined,
        quantityAdded: Number(quantityAdded),
        isOutsourced: Boolean(isOutsourced),
        outsourcedCompany: Boolean(isOutsourced) ? String(outsourcedCompany).trim() : undefined,
        expiryEnabled: product.expiryEnabled,
        expiryDate: product.expiryDate || null,
        expiryReminderDays: Number(product.expiryReminderDays || 7),
        addedBy: actorId,
        note: note ? String(note) : undefined,
        entryDate: req.body?.entryDate ? new Date(req.body.entryDate) : undefined,
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

  // ==================== NEW: PRISMA-BASED CATEGORY MANAGEMENT ====================

  static async getCategoryById(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { id } = req.params
      const category = await StockCategory.findOne({ _id: id, org_id }).lean()
      
      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }

      const products = await StockProduct.find({ category: id, org_id })
        .select("_id name sku startingPrice sellingPrice minAlertQuantity currentQuantity")
        .lean()

      return res.status(200).json({ 
        success: true, 
        data: {
          ...category,
          productCount: products.length,
          products
        }
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch category" })
    }
  }

  static async getCategorySales(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { id } = req.params

      const products = await StockProduct.find({ category: id, org_id }).select("_id name").lean()
      const productIds = products.map((p) => String(p._id))

      const sales = await StockSale.find({ org_id, productId: { $in: productIds } }).sort({ createdAt: -1 }).lean()

      const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.quantitySold || 0) * Number(s.soldPrice || 0), 0)
      const totalUnits = sales.reduce((sum: number, s: any) => sum + Number(s.quantitySold || 0), 0)

      // Monthly trend
      const monthMap = new Map<string, { units: number; revenue: number }>()
      sales.forEach((s: any) => {
        const m = new Date(s.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })
        const cur = monthMap.get(m) || { units: 0, revenue: 0 }
        cur.units += Number(s.quantitySold || 0)
        cur.revenue += Number(s.quantitySold || 0) * Number(s.soldPrice || 0)
        monthMap.set(m, cur)
      })

      const monthlyTrend = Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data }))

      return res.status(200).json({ success: true, data: { products, sales, totalRevenue, totalUnits, monthlyTrend } })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch category sales" })
    }
  }

  static async getAllCategorySales(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const [categories, products, sales] = await Promise.all([
        StockCategory.find({ org_id }).lean(),
        StockProduct.find({ org_id }).select("_id category name").lean(),
        StockSale.find({ org_id }).lean(),
      ])

      const productMap = new Map(products.map((p: any) => [String(p._id), p]))

      const categoryMap = new Map<string, { id: string; name: string; units: number; revenue: number }>()
      categories.forEach((c: any) => categoryMap.set(String(c._id), { id: String(c._id), name: c.name, units: 0, revenue: 0 }))

      sales.forEach((s: any) => {
        const prod = productMap.get(String(s.productId))
        if (!prod) return
        const catId = String(prod.category || "")
        if (!categoryMap.has(catId)) return
        const entry = categoryMap.get(catId)!
        entry.units += Number(s.quantitySold || 0)
        entry.revenue += Number(s.quantitySold || 0) * Number(s.soldPrice || 0)
      })

      const result = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue)

      return res.status(200).json({ success: true, data: result })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch categories sales" })
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can update categories" })
      }

      const { id } = req.params
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" })
      }

      const existing = await StockCategory.findOne({
        _id: { $ne: id },
        org_id,
        name: String(name).trim()
      })

      if (existing) {
        return res.status(409).json({ success: false, message: "Category with this name already exists" })
      }

      const category = await StockCategory.findOneAndUpdate(
        { _id: id, org_id },
        {
          $set: {
            name: String(name).trim(),
            ...(description !== undefined && { description: description ? String(description).trim() : null })
          }
        },
        { new: true }
      )

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }

      return res.status(200).json({ success: true, data: category })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update category" })
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can delete categories" })
      }

      const { id } = req.params

      const category = await StockCategory.findOneAndDelete({ _id: id, org_id })

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }

      return res.status(200).json({ success: true, message: "Category deleted successfully" })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to delete category" })
    }
  }
}
