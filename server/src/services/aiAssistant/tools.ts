import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { StockSale } from "../../models/StockSale"
import { StockProduct } from "../../models/StockProduct"
import { StockInvoice } from "../../models/StockInvoice"
import { StockQuotation } from "../../models/StockQuotation"
import { User } from "../../models/User"
import { LeaveRequest } from "../../models/LeaveRequest"
import type { AssistantOrgContext } from "./orgContext"
import { endOfMonth, parseIsoDate, startOfMonth, startOfLastMonth, endOfLastMonth } from "./orgContext"

const dateRangeSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("ISO date start (YYYY-MM-DD). Omit to let the tool infer from period."),
  endDate: z.string().optional().describe("ISO date end (YYYY-MM-DD), inclusive."),
  period: z
    .enum(["last_month", "this_month", "last_7_days", "last_30_days", "custom"])
    .optional()
    .describe("Shortcut when exact dates are unknown. Prefer last_month for 'last month' questions."),
})

function resolveRange(input: z.infer<typeof dateRangeSchema>) {
  const now = new Date()
  if (input.period === "last_month") {
    return { start: startOfLastMonth(now), end: endOfLastMonth(now) }
  }
  if (input.period === "this_month") {
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }
  if (input.period === "last_7_days") {
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() - 7)
    return { start, end: now }
  }
  if (input.period === "last_30_days") {
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() - 30)
    return { start, end: now }
  }

  const start = parseIsoDate(input.startDate, startOfLastMonth(now))
  const end = parseIsoDate(input.endDate, endOfLastMonth(now))
  return { start, end }
}

function canViewHr(ctx: AssistantOrgContext) {
  return ["company_admin", "admin", "hr", "manager"].includes(ctx.role)
}

export function createAssistantTools(ctx: AssistantOrgContext) {
  const orgFilter = { org_id: ctx.orgId }

  const getSalesSummary = tool(
    async (input) => {
      const { start, end } = resolveRange(input)
      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("quantitySold soldPrice productId createdAt")
        .lean()

      const totalUnits = sales.reduce((sum, row) => sum + Number(row.quantitySold || 0), 0)
      const totalRevenue = sales.reduce(
        (sum, row) => sum + Number(row.quantitySold || 0) * Number(row.soldPrice || 0),
        0,
      )

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        saleCount: sales.length,
        totalUnitsSold: totalUnits,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        currencyNote: "Amounts use sold unit prices from sales records.",
      })
    },
    {
      name: "get_sales_summary",
      description:
        "Sales totals for this company: number of sale lines, units sold, and revenue in a date range. Use for questions like 'how much did we sell last month?'.",
      schema: dateRangeSchema,
    },
  )

  const getTopProducts = tool(
    async (input) => {
      const { start, end } = resolveRange(input)
      const limit = Math.min(Math.max(input.limit ?? 5, 1), 20)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("productId quantitySold soldPrice")
        .lean()

      const byProduct = new Map<string, { units: number; revenue: number }>()
      for (const sale of sales) {
        const key = String(sale.productId)
        const row = byProduct.get(key) || { units: 0, revenue: 0 }
        row.units += Number(sale.quantitySold || 0)
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        byProduct.set(key, row)
      }

      const productIds = Array.from(byProduct.keys())
      const products = await StockProduct.find({ _id: { $in: productIds }, ...orgFilter })
        .select("name")
        .lean()
      const nameById = new Map(products.map((p) => [String(p._id), p.name]))

      const ranked = Array.from(byProduct.entries())
        .map(([productId, stats]) => ({
          productId,
          productName: nameById.get(productId) || productId,
          unitsSold: stats.units,
          revenue: Number(stats.revenue.toFixed(2)),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        topProducts: ranked,
      })
    },
    {
      name: "get_top_products",
      description: "Best-selling products by revenue for a date range.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(20).optional(),
      }),
    },
  )

  const getInventorySummary = tool(
    async () => {
      const products = await StockProduct.find({ ...orgFilter, isActive: { $ne: false } })
        .select("name currentQuantity minAlertQuantity sellingPrice")
        .lean()

      const lowStock = products
        .filter((p) => Number(p.currentQuantity || 0) <= Number(p.minAlertQuantity || 0))
        .map((p) => ({
          name: p.name,
          currentQuantity: p.currentQuantity,
          minAlertQuantity: p.minAlertQuantity,
        }))
        .slice(0, 15)

      const totalUnits = products.reduce((sum, p) => sum + Number(p.currentQuantity || 0), 0)
      const stockValue = products.reduce(
        (sum, p) => sum + Number(p.currentQuantity || 0) * Number(p.sellingPrice || 0),
        0,
      )

      return JSON.stringify({
        activeProducts: products.length,
        totalUnitsOnHand: totalUnits,
        estimatedRetailStockValue: Number(stockValue.toFixed(2)),
        lowStockCount: lowStock.length,
        lowStockSamples: lowStock,
      })
    },
    {
      name: "get_inventory_summary",
      description: "Current inventory: product count, units on hand, low-stock items.",
      schema: z.object({}),
    },
  )

  const getInvoiceSummary = tool(
    async (input) => {
      const { start, end } = resolveRange(input)
      const invoices = await StockInvoice.find({
        ...orgFilter,
        status: { $ne: "cancelled" },
        createdAt: { $gte: start, $lte: end },
      })
        .select("subTotal status invoiceNumber")
        .lean()

      const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.subTotal || 0), 0)
      const byStatus: Record<string, number> = {}
      for (const inv of invoices) {
        const status = String(inv.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        invoiceCount: invoices.length,
        totalInvoiced: Number(totalInvoiced.toFixed(2)),
        byStatus,
      })
    },
    {
      name: "get_invoice_summary",
      description: "Invoice counts and subtotal amounts for a date range (excludes cancelled).",
      schema: dateRangeSchema,
    },
  )

  const getQuotationSummary = tool(
    async (input) => {
      const { start, end } = resolveRange(input)
      const quotations = await StockQuotation.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("subTotal status quotationNumber")
        .lean()

      const totalQuoted = quotations.reduce((sum, q) => sum + Number(q.subTotal || 0), 0)
      const pending = quotations.filter((q) => ["draft", "pending_approval"].includes(String(q.status))).length

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        quotationCount: quotations.length,
        pendingCount: pending,
        totalQuotedValue: Number(totalQuoted.toFixed(2)),
      })
    },
    {
      name: "get_quotation_summary",
      description: "Quotation counts and values for a date range.",
      schema: dateRangeSchema,
    },
  )

  const getEmployeeSummary = tool(
    async () => {
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view HR workforce summaries." })
      }

      const users = await User.find({ org_id: ctx.orgId }).select("status role").lean()
      const active = users.filter((u) => String(u.status) === "active").length
      const byRole: Record<string, number> = {}
      for (const user of users) {
        const role = String(user.role || "unknown")
        byRole[role] = (byRole[role] || 0) + 1
      }

      return JSON.stringify({
        totalUsers: users.length,
        activeUsers: active,
        byRole,
      })
    },
    {
      name: "get_employee_summary",
      description: "Workforce counts by role (admin/HR/manager only).",
      schema: z.object({}),
    },
  )

  const getLeaveSummary = tool(
    async (input) => {
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view leave summaries." })
      }

      const { start, end } = resolveRange(input)
      const requests = await LeaveRequest.find({
        org_id: ctx.orgId,
        createdAt: { $gte: start, $lte: end },
      })
        .select("status type")
        .lean()

      const byStatus: Record<string, number> = {}
      for (const req of requests) {
        const status = String(req.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        requestCount: requests.length,
        byStatus,
      })
    },
    {
      name: "get_leave_summary",
      description: "Leave request counts by status for a date range (admin/HR/manager only).",
      schema: dateRangeSchema,
    },
  )

  return [
    getSalesSummary,
    getTopProducts,
    getInventorySummary,
    getInvoiceSummary,
    getQuotationSummary,
    getEmployeeSummary,
    getLeaveSummary,
  ]
}
