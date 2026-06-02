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

  const getEmployeeCount = tool(
    async () => {
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view HR metrics." })
      }

      const count = await User.countDocuments({ org_id: ctx.orgId })
      const activeCount = await User.countDocuments({ org_id: ctx.orgId, status: "active" })

      return JSON.stringify({
        totalEmployees: count,
        activeEmployees: activeCount,
        inactiveEmployees: count - activeCount,
      })
    },
    {
      name: "get_employee_count",
      description: "Returns total number of employees in the company, separated by active/inactive status (admin/HR/manager only).",
      schema: z.object({}),
    },
  )

  const searchEmployees = tool(
    async (input) => {
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to search employees." })
      }

      const query = String(input.query || "").trim()
      if (!query || query.length < 2) {
        return JSON.stringify({ error: "Search query must be at least 2 characters." })
      }

      const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)

      const employees = await User.find(
        {
          org_id: ctx.orgId,
          $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        "firstName lastName email role status department"
      )
        .limit(limit)
        .lean()

      return JSON.stringify({
        query,
        resultCount: employees.length,
        employees: employees.map((e) => ({
          name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          email: e.email,
          role: e.role,
          status: e.status,
          department: e.department || "Not set",
        })),
      })
    },
    {
      name: "search_employees",
      description:
        "Search for employees by name or email. Returns up to 10 matching employees with their role and status (admin/HR/manager only).",
      schema: z.object({
        query: z.string().min(2).describe("Employee name or email to search for"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10, max 50)"),
      }),
    },
  )

  const getDepartmentHeadcount = tool(
    async () => {
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view department metrics." })
      }

      const employees = await User.find({ org_id: ctx.orgId }).select("department status").lean()

      const byDept: Record<string, { total: number; active: number }> = {}
      for (const emp of employees) {
        const dept = String(emp.department || "Unassigned")
        if (!byDept[dept]) {
          byDept[dept] = { total: 0, active: 0 }
        }
        byDept[dept].total += 1
        if (String(emp.status) === "active") {
          byDept[dept].active += 1
        }
      }

      const departments = Object.entries(byDept)
        .map(([name, stats]) => ({
          department: name,
          totalEmployees: stats.total,
          activeEmployees: stats.active,
          inactiveEmployees: stats.total - stats.active,
        }))
        .sort((a, b) => b.totalEmployees - a.totalEmployees)

      return JSON.stringify({
        departmentCount: departments.length,
        totalEmployees: employees.length,
        departments,
      })
    },
    {
      name: "get_department_headcount",
      description: "Returns employee count per department, broken down by active/inactive status (admin/HR/manager only).",
      schema: z.object({}),
    },
  )

  // ========== COMPREHENSIVE SALES PERFORMANCE TOOLS (NO RESTRICTIONS) ==========

  const getSalesByCustomer = tool(
    async (input) => {
      const { start, end } = resolveRange(input)
      const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("clientId quantitySold soldPrice")
        .lean()

      const byCustomer = new Map<string, { units: number; revenue: number; count: number }>()
      for (const sale of sales) {
        const clientId = String(sale.clientId || "Unknown")
        const row = byCustomer.get(clientId) || { units: 0, revenue: 0, count: 0 }
        row.units += Number(sale.quantitySold || 0)
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.count += 1
        byCustomer.set(clientId, row)
      }

      const clients = await Promise.all(
        Array.from(byCustomer.keys()).map(async (id) => {
          try {
            const client = await StockSale.findOne({ clientId: id, ...orgFilter }).select("clientName").lean()
            return { id, name: client?.clientName || id }
          } catch {
            return { id, name: id }
          }
        })
      )
      const nameMap = new Map(clients.map((c) => [c.id, c.name]))

      const ranked = Array.from(byCustomer.entries())
        .map(([clientId, stats]) => ({
          customerName: nameMap.get(clientId) || clientId,
          transactionCount: stats.count,
          unitsSold: stats.units,
          totalRevenue: Number(stats.revenue.toFixed(2)),
          avgOrderValue: Number((stats.revenue / stats.count).toFixed(2)),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        totalCustomers: byCustomer.size,
        topCustomers: ranked,
      })
    },
    {
      name: "get_sales_by_customer",
      description:
        "*** Top-spending customers by revenue *** | Shows transaction count, units sold, and average order value for each customer.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
  )

  const getSalesPerformanceTrend = tool(
    async (input) => {
      const { start, end } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("createdAt quantitySold soldPrice")
        .lean()

      const byDate = new Map<string, { revenue: number; units: number; count: number }>()
      for (const sale of sales) {
        const date = new Date(sale.createdAt || new Date()).toISOString().split("T")[0]
        const row = byDate.get(date) || { revenue: 0, units: 0, count: 0 }
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.units += Number(sale.quantitySold || 0)
        row.count += 1
        byDate.set(date, row)
      }

      const trend = Array.from(byDate.entries())
        .map(([date, stats]) => ({
          date,
          dailyRevenue: Number(stats.revenue.toFixed(2)),
          unitsSold: stats.units,
          transactionCount: stats.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const totalRevenue = trend.reduce((sum, d) => sum + d.dailyRevenue, 0)
      const avgDailyRevenue = Number((totalRevenue / trend.length).toFixed(2))

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        totalDaysWithSales: trend.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgDailyRevenue,
        trend: trend.slice(-31), // Last 31 days
      })
    },
    {
      name: "get_sales_performance_trend",
      description: "*** Daily sales performance trend *** | Shows revenue, units sold, and transaction count by day. Perfect for analyzing sales patterns over time.",
      schema: dateRangeSchema,
    },
  )

  const getProductCategoryPerformance = tool(
    async (input) => {
      const { start, end } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("productId quantitySold soldPrice")
        .lean()

      const productIds = Array.from(new Set(sales.map((s) => s.productId)))
      const products = await StockProduct.find({ _id: { $in: productIds }, ...orgFilter })
        .select("category name currentQuantity")
        .lean()

      const categoryMap = new Map(products.map((p) => [String(p._id), p.category || "Uncategorized"]))

      const byCategory = new Map<string, { revenue: number; units: number; count: number }>()
      for (const sale of sales) {
        const category = categoryMap.get(String(sale.productId)) || "Uncategorized"
        const row = byCategory.get(category) || { revenue: 0, units: 0, count: 0 }
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.units += Number(sale.quantitySold || 0)
        row.count += 1
        byCategory.set(category, row)
      }

      const categories = Array.from(byCategory.entries())
        .map(([name, stats]) => ({
          category: name,
          transactionCount: stats.count,
          unitsSold: stats.units,
          categoryRevenue: Number(stats.revenue.toFixed(2)),
          avgPricePerUnit: Number((stats.revenue / stats.units).toFixed(2)),
        }))
        .sort((a, b) => b.categoryRevenue - a.categoryRevenue)

      return JSON.stringify({
        period: { start: start.toISOString(), end: end.toISOString() },
        totalCategories: categories.length,
        categories,
      })
    },
    {
      name: "get_product_category_performance",
      description:
        "*** Sales by product category *** | Breaks down revenue and units by category. Shows which categories drive the most sales.",
      schema: dateRangeSchema,
    },
  )

  const getComprehensiveSalesAnalysis = tool(
    async (input) => {
      const { start, end } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("quantitySold soldPrice clientId productId createdAt")
        .lean()

      if (!sales.length) {
        return JSON.stringify({
          period: { start: start.toISOString(), end: end.toISOString() },
          message: "*** No sales data found for this period ***",
        })
      }

      const totalRevenue = sales.reduce((sum, s) => sum + Number(s.quantitySold || 0) * Number(s.soldPrice || 0), 0)
      const totalUnits = sales.reduce((sum, s) => sum + Number(s.quantitySold || 0), 0)
      const uniqueCustomers = new Set(sales.map((s) => s.clientId)).size

      const dates = sales.map((s) => new Date(s.createdAt || new Date()).getTime())
      const firstSale = new Date(Math.min(...dates))
      const lastSale = new Date(Math.max(...dates))

      return JSON.stringify({
        "*** PERIOD SUMMARY ***": {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        "*** KEY METRICS ***": {
          totalSalesTransactions: sales.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalUnitsSold: totalUnits,
          uniqueCustomers,
          avgTransactionValue: Number((totalRevenue / sales.length).toFixed(2)),
          avgUnitsPerSale: Number((totalUnits / sales.length).toFixed(2)),
        },
        "*** PERFORMANCE INDICATORS ***": {
          firstSaleDate: firstSale.toISOString(),
          lastSaleDate: lastSale.toISOString(),
          daysWithActivity: new Set(sales.map((s) => new Date(s.createdAt || new Date()).toISOString().split("T")[0]))
            .size,
        },
      })
    },
    {
      name: "get_comprehensive_sales_analysis",
      description:
        "*** Complete sales overview *** | All-encompassing analysis showing transaction count, revenue, units, customers, and performance indicators.",
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
    getEmployeeCount,
    searchEmployees,
    getDepartmentHeadcount,
    getSalesByCustomer,
    getSalesPerformanceTrend,
    getProductCategoryPerformance,
    getComprehensiveSalesAnalysis,
  ]
}
