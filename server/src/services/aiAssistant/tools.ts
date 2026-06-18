import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { StockSale } from "../../models/StockSale"
import { StockProduct } from "../../models/StockProduct"
import { StockInvoice } from "../../models/StockInvoice"
import { StockQuotation } from "../../models/StockQuotation"
import { User } from "../../models/User"
import { LeaveRequest } from "../../models/LeaveRequest"
import { Payroll } from "../../models/Payroll"
import { Attendance } from "../../models/Attendance"
import { Task } from "../../models/Task"
import type { AssistantOrgContext } from "./orgContext"
import {
  endOfMonth,
  parseIsoDate,
  startOfMonth,
  startOfLastMonth,
  endOfLastMonth,
  startOfYear,
  endOfYear,
  startOfLastYear,
  endOfLastYear,
  formatMonthLabel,
} from "./orgContext"

// ─── Shared helpers ───────────────────────────────────────────────────────────

const dateRangeSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("ISO date start (YYYY-MM-DD). Omit to let the tool infer from period."),
  endDate: z.string().optional().describe("ISO date end (YYYY-MM-DD), inclusive."),
  period: z
    .enum([
      "last_month",
      "this_month",
      "last_7_days",
      "last_30_days",
      "last_90_days",
      "this_year",
      "last_year",
      "custom",
    ])
    .optional()
    .describe(
      "Shortcut period. Prefer 'last_month' for 'last month', 'this_month' for 'this month', 'this_year' for year-to-date questions.",
    ),
})

function resolveRange(input: z.infer<typeof dateRangeSchema>) {
  const now = new Date()
  switch (input.period) {
    case "last_month":
      return { start: startOfLastMonth(now), end: endOfLastMonth(now), label: formatMonthLabel(startOfLastMonth(now)) }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now), label: formatMonthLabel(now) }
    case "last_7_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 7)
      return { start, end: now, label: "last 7 days" }
    }
    case "last_30_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 30)
      return { start, end: now, label: "last 30 days" }
    }
    case "last_90_days": {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 90)
      return { start, end: now, label: "last 90 days" }
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now), label: `${now.getUTCFullYear()} (year-to-date)` }
    case "last_year":
      return {
        start: startOfLastYear(now),
        end: endOfLastYear(now),
        label: `${now.getUTCFullYear() - 1} (full year)`,
      }
    default: {
      const start = parseIsoDate(input.startDate, startOfLastMonth(now))
      const end = parseIsoDate(input.endDate, endOfLastMonth(now))
      const label = `${start.toISOString().split("T")[0]} → ${end.toISOString().split("T")[0]}`
      return { start, end, label }
    }
  }
}

/** Guard: reject any query where orgId is empty  */
function assertOrgId(orgId: string) {
  if (!orgId || orgId.trim() === "") {
    throw new Error("Organization context is missing. Cannot query the database.")
  }
}

function canViewHr(ctx: AssistantOrgContext) {
  return true
}

// ─── Tool factory ─────────────────────────────────────────────────────────────

export function createAssistantTools(ctx: AssistantOrgContext) {
  assertOrgId(ctx.orgId)

  // Hard-typed org filter used in EVERY query — never interpolated or overridable
  const orgFilter = { org_id: ctx.orgId } as const

  // ── Sales ──────────────────────────────────────────────────────────────────

  const getSalesSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("quantitySold soldPrice createdAt")
        .lean()

      const totalUnits = sales.reduce((sum, row) => sum + Number(row.quantitySold || 0), 0)
      const totalRevenue = sales.reduce(
        (sum, row) => sum + Number(row.quantitySold || 0) * Number(row.soldPrice || 0),
        0,
      )

      return JSON.stringify({
        period: label,
        dateRange: { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] },
        saleTransactions: sales.length,
        totalUnitsSold: totalUnits,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      })
    },
    {
      name: "get_sales_summary",
      description:
        "Sales totals for this company: transaction count, units sold, and revenue in a date range. Use for 'how much did we sell?' or 'what is our sales revenue?' questions.",
      schema: dateRangeSchema,
    },
  )

  const getTopProducts = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const limit = Math.min(Math.max((input as any).limit ?? 5, 1), 20)

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
          productName: nameById.get(productId) || "Unknown Product",
          unitsSold: stats.units,
          revenue: Number(stats.revenue.toFixed(2)),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)

      return JSON.stringify({ period: label, topProducts: ranked })
    },
    {
      name: "get_top_products",
      description: "Best-selling products by revenue for a date range. Shows product names, units, and revenue.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(20).optional().describe("How many top products to return (default 5)"),
      }),
    },
  )

  const getInventorySummary = tool(
    async () => {
      assertOrgId(ctx.orgId)
      const products = await StockProduct.find({ ...orgFilter, isActive: { $ne: false } })
        .select("name currentQuantity minAlertQuantity sellingPrice category")
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
        lowStockItems: lowStock,
      })
    },
    {
      name: "get_inventory_summary",
      description:
        "Current inventory status: total products, units on hand, estimated stock value, and low-stock alerts. Use for 'which products are low on stock?' or 'what is our inventory value?'.",
      schema: z.object({}),
    },
  )

  const getInvoiceSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
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
        period: label,
        dateRange: { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] },
        invoiceCount: invoices.length,
        totalInvoicedValue: Number(totalInvoiced.toFixed(2)),
        byStatus,
      })
    },
    {
      name: "get_invoice_summary",
      description:
        "Invoice counts and subtotal values for a date range (excludes cancelled). Broken down by status (paid, unpaid, overdue, etc.).",
      schema: dateRangeSchema,
    },
  )

  const getQuotationSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const quotations = await StockQuotation.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("subTotal status quotationNumber")
        .lean()

      const totalQuoted = quotations.reduce((sum, q) => sum + Number(q.subTotal || 0), 0)
      const byStatus: Record<string, number> = {}
      for (const q of quotations) {
        const status = String(q.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return JSON.stringify({
        period: label,
        quotationCount: quotations.length,
        totalQuotedValue: Number(totalQuoted.toFixed(2)),
        byStatus,
      })
    },
    {
      name: "get_quotation_summary",
      description: "Quotation counts and values for a date range. Shows how many are pending, approved, or converted.",
      schema: dateRangeSchema,
    },
  )

  // ── HR ────────────────────────────────────────────────────────────────────

  const getEmployeeSummary = tool(
    async () => {
      assertOrgId(ctx.orgId)
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view HR workforce summaries." })
      }

      const users = await User.find({ ...orgFilter }).select("status role department position").lean()
      const active = users.filter((u) => String(u.status) === "active").length
      const byRole: Record<string, number> = {}
      const byDept: Record<string, number> = {}
      for (const user of users) {
        const role = String(user.role || "unknown")
        byRole[role] = (byRole[role] || 0) + 1
        const dept = String(user.department || "Unassigned")
        byDept[dept] = (byDept[dept] || 0) + 1
      }

      return JSON.stringify({
        totalEmployees: users.length,
        activeEmployees: active,
        inactiveEmployees: users.length - active,
        byRole,
        byDepartment: byDept,
      })
    },
    {
      name: "get_employee_summary",
      description:
        "Workforce overview: total employees, active/inactive counts, breakdown by role and department.",
      schema: z.object({}),
    },
  )

  const searchEmployees = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
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
          ...orgFilter,
          $or: [
            { firstName: { $regex: query, $options: "i" } },
            { lastName: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { position: { $regex: query, $options: "i" } },
          ],
        },
        "firstName lastName email role status department position",
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
          position: e.position || "Not set",
          status: e.status,
          department: e.department || "Not set",
        })),
      })
    },
    {
      name: "search_employees",
      description:
        "Search for employees by name, email, or job title. Returns role, department, and status.",
      schema: z.object({
        query: z.string().min(2).describe("Employee name, email, or position to search for"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
      }),
    },
  )

  const getLeaveSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view leave summaries." })
      }

      const { start, end, label } = resolveRange(input)
      const requests = await LeaveRequest.find({
        org_id: ctx.orgId, // explicit — not spread to avoid accidental override
        createdAt: { $gte: start, $lte: end },
      })
        .select("status type userId")
        .lean()

      const byStatus: Record<string, number> = {}
      const byType: Record<string, number> = {}
      for (const req of requests) {
        const status = String(req.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        const type = String((req as any).type || "unknown")
        byType[type] = (byType[type] || 0) + 1
      }

      return JSON.stringify({
        period: label,
        totalRequests: requests.length,
        byStatus,
        byType,
      })
    },
    {
      name: "get_leave_summary",
      description:
        "Leave request counts by status and type for a date range. Use for 'how many employees are on leave?' or leave approval stats.",
      schema: dateRangeSchema,
    },
  )

  // ── Payroll ───────────────────────────────────────────────────────────────

  const getPayrollSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view payroll data." })
      }

      // month filter: "YYYY-MM" format from period or explicit month
      const now = new Date()
      let monthFilter: string | undefined = (input as any).month

      if (!monthFilter) {
        const period: string | undefined = (input as any).period
        if (period === "last_month") {
          const last = startOfLastMonth(now)
          monthFilter = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`
        } else {
          // default: current month
          monthFilter = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
        }
      }

      const payrolls = await Payroll.find({
        org_id: ctx.orgId,
        month: monthFilter,
      })
        .select("net_pay base_salary bonus total_deductions status user_id")
        .lean()

      if (!payrolls.length) {
        return JSON.stringify({
          month: monthFilter,
          message: `No payroll records found for ${monthFilter}. Payroll may not have been generated yet.`,
        })
      }

      const totalNetPay = payrolls.reduce((sum, p) => sum + Number(p.net_pay || 0), 0)
      const totalBaseSalary = payrolls.reduce((sum, p) => sum + Number(p.base_salary || 0), 0)
      const totalBonuses = payrolls.reduce((sum, p) => sum + Number(p.bonus || 0), 0)
      const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.total_deductions || 0), 0)
      const byStatus: Record<string, number> = {}
      for (const p of payrolls) {
        const status = String(p.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return JSON.stringify({
        month: monthFilter,
        employeesPaid: payrolls.length,
        totalNetPay: Number(totalNetPay.toFixed(2)),
        totalBaseSalary: Number(totalBaseSalary.toFixed(2)),
        totalBonuses: Number(totalBonuses.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        byStatus,
        avgNetPay: Number((totalNetPay / payrolls.length).toFixed(2)),
      })
    },
    {
      name: "get_payroll_summary",
      description:
        "Payroll summary for a specific month: total net pay, base salaries, bonuses, deductions, and employee count.",
      schema: z.object({
        month: z
          .string()
          .optional()
          .describe("Month in YYYY-MM format (e.g. 2026-05). Leave blank for current month."),
        period: z.enum(["last_month", "this_month"]).optional().describe("Period shortcut instead of month"),
      }),
    },
  )

  // ── Attendance ────────────────────────────────────────────────────────────

  const getAttendanceSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      if (!canViewHr(ctx)) {
        return JSON.stringify({ error: "You do not have permission to view attendance data." })
      }

      const { start, end, label } = resolveRange(input)
      const records = await Attendance.find({
        org_id: ctx.orgId,
        date: { $gte: start, $lte: end },
      })
        .select("status hoursWorked")
        .lean()

      const byStatus: Record<string, number> = {}
      let totalHours = 0
      for (const rec of records) {
        const status = String(rec.status || "unknown")
        byStatus[status] = (byStatus[status] || 0) + 1
        totalHours += Number(rec.hoursWorked || 0)
      }

      const presentCount = (byStatus["present"] || 0) + (byStatus["late"] || 0) + (byStatus["half_day"] || 0)
      const absenceCount = byStatus["absent"] || 0
      const attendanceRate =
        records.length > 0 ? Number(((presentCount / records.length) * 100).toFixed(1)) : null

      return JSON.stringify({
        period: label,
        totalAttendanceRecords: records.length,
        presentOrPartial: presentCount,
        absent: absenceCount,
        attendanceRatePercent: attendanceRate,
        totalHoursLogged: Number(totalHours.toFixed(1)),
        breakdown: byStatus,
      })
    },
    {
      name: "get_attendance_summary",
      description:
        "Attendance overview for a period: present, absent, late, half-day counts, total hours logged, and attendance rate.",
      schema: dateRangeSchema,
    },
  )

  // ── Comprehensive analytics ───────────────────────────────────────────────

  const getSalesByCustomer = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const limit = Math.min(Math.max((input as any).limit ?? 10, 1), 50)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("clientId clientName quantitySold soldPrice")
        .lean()

      const byCustomer = new Map<string, { name: string; units: number; revenue: number; count: number }>()
      for (const sale of sales) {
        const key = String(sale.clientId || "unknown")
        const row = byCustomer.get(key) || { name: String((sale as any).clientName || key), units: 0, revenue: 0, count: 0 }
        row.units += Number(sale.quantitySold || 0)
        row.revenue += Number(sale.quantitySold || 0) * Number(sale.soldPrice || 0)
        row.count += 1
        if ((sale as any).clientName) row.name = String((sale as any).clientName)
        byCustomer.set(key, row)
      }

      const ranked = Array.from(byCustomer.values())
        .map((v) => ({
          customerName: v.name,
          transactions: v.count,
          unitsSold: v.units,
          totalRevenue: Number(v.revenue.toFixed(2)),
          avgOrderValue: Number((v.revenue / v.count).toFixed(2)),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)

      return JSON.stringify({ period: label, uniqueCustomers: byCustomer.size, topCustomers: ranked })
    },
    {
      name: "get_sales_by_customer",
      description:
        "Top customers by revenue for a date range. Shows transaction count, units bought, and average order value.",
      schema: dateRangeSchema.extend({
        limit: z.number().int().min(1).max(50).optional().describe("Max customers to return (default 10)"),
      }),
    },
  )

  const getSalesPerformanceTrend = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

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
          transactions: stats.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const totalRevenue = trend.reduce((sum, d) => sum + d.dailyRevenue, 0)
      const avgDaily = trend.length > 0 ? Number((totalRevenue / trend.length).toFixed(2)) : 0
      const bestDay = trend.reduce((best, d) => (d.dailyRevenue > (best?.dailyRevenue ?? 0) ? d : best), trend[0])

      return JSON.stringify({
        period: label,
        daysWithSales: trend.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgDailyRevenue: avgDaily,
        bestDay: bestDay ? { date: bestDay.date, revenue: bestDay.dailyRevenue } : null,
        trend: trend.slice(-31),
      })
    },
    {
      name: "get_sales_performance_trend",
      description:
        "Daily sales trend showing revenue, units, and transactions per day. Best for identifying peak days and revenue patterns.",
      schema: dateRangeSchema,
    },
  )

  const getProductCategoryPerformance = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const sales = await StockSale.find({
        ...orgFilter,
        createdAt: { $gte: start, $lte: end },
      })
        .select("productId quantitySold soldPrice")
        .lean()

      const productIds = Array.from(new Set(sales.map((s) => s.productId)))
      const products = await StockProduct.find({ _id: { $in: productIds }, ...orgFilter })
        .select("category name")
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
          transactions: stats.count,
          unitsSold: stats.units,
          revenue: Number(stats.revenue.toFixed(2)),
          avgPricePerUnit: stats.units > 0 ? Number((stats.revenue / stats.units).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)

      return JSON.stringify({ period: label, totalCategories: categories.length, categories })
    },
    {
      name: "get_product_category_performance",
      description: "Sales by product category. Shows which categories drive the most revenue and units sold.",
      schema: dateRangeSchema,
    },
  )

  const getMyTaskSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)

      const tasks = await Task.find({
        org_id: ctx.orgId,
        assigned_to: ctx.userId,
        createdAt: { $gte: start, $lte: end },
      })
        .select("status priority due_date completed_at title")
        .lean()

      const totalTasks = tasks.length
      const completedTasks = tasks.filter((task) => task.status === "completed").length
      const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
      const pendingTasks = tasks.filter((task) => task.status === "pending").length
      const cancelledTasks = tasks.filter((task) => task.status === "cancelled").length
      const overdueTasks = tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date).getTime() < Date.now(),
      ).length

      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 }
      tasks.forEach((task) => {
        const priority = String(task.priority || "medium")
        byPriority[priority] = (byPriority[priority] || 0) + 1
      })

      const dueSoon = tasks
        .filter((task) => task.due_date && new Date(task.due_date).getTime() >= Date.now())
        .sort((a, b) => Number(new Date(a.due_date || 0)) - Number(new Date(b.due_date || 0)))
        .slice(0, 5)
        .map((task) => ({ title: task.title, status: task.status, due_date: task.due_date?.toISOString().split("T")[0] || null }))

      return JSON.stringify({
        period: label,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        cancelledTasks,
        overdueTasks,
        priorityBreakdown: byPriority,
        dueSoon: dueSoon,
      })
    },
    {
      name: "get_my_task_summary",
      description:
        "Summarize tasks assigned to the current user: completed, pending, in-progress, cancelled, overdue, and near-due tasks.",
      schema: dateRangeSchema,
    },
  )

  const getTaskSummary = tool(
    async (input) => {
      assertOrgId(ctx.orgId)
      const { start, end, label } = resolveRange(input)
      const filter: any = {
        org_id: ctx.orgId,
        createdAt: { $gte: start, $lte: end },
      }
      if (input.userId) filter.assigned_to = String(input.userId)
      if (input.status) filter.status = String(input.status)

      const tasks = await Task.find(filter)
        .select("assigned_to status priority due_date completed_at title")
        .lean()

      const totalTasks = tasks.length
      const completedTasks = tasks.filter((task) => task.status === "completed").length
      const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
      const pendingTasks = tasks.filter((task) => task.status === "pending").length
      const cancelledTasks = tasks.filter((task) => task.status === "cancelled").length
      const overdueTasks = tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date).getTime() < Date.now(),
      ).length

      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 }
      tasks.forEach((task) => {
        const priority = String(task.priority || "medium")
        byPriority[priority] = (byPriority[priority] || 0) + 1
      })

      const topPending = tasks
        .filter((task) => task.status !== "completed" && task.status !== "cancelled")
        .sort((a, b) => Number(new Date(a.due_date || 0)) - Number(new Date(b.due_date || 0)))
        .slice(0, 5)
        .map((task) => ({ title: task.title, status: task.status, due_date: task.due_date?.toISOString().split("T")[0] || null }))

      return JSON.stringify({
        period: label,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        cancelledTasks,
        overdueTasks,
        priorityBreakdown: byPriority,
        topPendingTasks: topPending,
      })
    },
    {
      name: "get_task_summary",
      description:
        "Summarize tasks for the organization or a specific assigned user: counts by status, overdue items, and priority distribution.",
      schema: dateRangeSchema.extend({
        userId: z.string().optional().describe("Optional user ID to filter tasks assigned to a specific user."),
        status: z
          .enum(["pending", "in_progress", "completed", "cancelled"])
          .optional()
          .describe("Optional task status filter."),
      }),
    },
  )

  return [
    // Sales
    getSalesSummary,
    getTopProducts,
    getInventorySummary,
    getInvoiceSummary,
    getQuotationSummary,
    getSalesByCustomer,
    getSalesPerformanceTrend,
    getProductCategoryPerformance,
    // HR
    getEmployeeSummary,
    searchEmployees,
    getLeaveSummary,
    // Payroll
    getPayrollSummary,
    // Attendance
    getAttendanceSummary,
    // Tasks
    getMyTaskSummary,
    getTaskSummary,
  ]
}
