// server/src/services/aiAssistant/aiAssistantService.ts

import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ✅ Import each model individually
import { User } from "../../models/User";
import { Company } from "../../models/Company";
import { Meeting } from "../../models/Meeting";
import { Task } from "../../models/Task";
import { StockProduct } from "../../models/StockProduct";
import { StockInvoice } from "../../models/StockInvoice";
import { Performance } from "../../models/Performance";
import { LeaveRequest } from "../../models/LeaveRequest";
import { Attendance } from "../../models/Attendance";
import { Payroll } from "../../models/Payroll";
import { Feedback } from "../../models/Feedback";

// ─── Interfaces & Types ─────────────────────────────────────────────────────

export interface PermissionSet {
  canViewSales: boolean;
  canViewStock: boolean;
  canViewPayroll: boolean;
  canViewPerformance: boolean;
  canViewLeave: boolean;
  canViewAttendance: boolean;
  canViewFeedback: boolean;
  canViewTeam: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canManageKPIs: boolean;
  canApproveLeave: boolean;
  canApprovePDPs: boolean;
}

export interface AssistantOrgContext {
  userId: string;
  orgId: string;
  userName: string;
  companyName: string;
  role: "super_admin" | "company_admin" | "manager" | "employee" | "hr";
  permissions: PermissionSet;
}

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TOOL_ROUNDS = 8;

// ─── Helper Functions ───────────────────────────────────────────────────────

function buildTimeFilter(timeframe: string, customStart?: string, customEnd?: string): any {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date = new Date(now);

  switch (timeframe) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case "this_week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "this_quarter":
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "last_7_days":
    case "last_30_days":
      const days = timeframe === "last_7_days" ? 7 : 30;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - days);
      break;
    case "custom":
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
      break;
    case "all":
    default:
      return null;
  }

  if (!startDate) return null;
  return { $gte: startDate, $lte: endDate };
}

async function getScopedUserIds(orgId: string, userId: string, role: string): Promise<string[] | null> {
  if (role === "employee") {
    return [userId];
  }
  if (role === "manager") {
    const team = await User.find({ org_id: orgId, manager_id: userId }).select("_id").lean();
    return [userId, ...team.map((u) => u._id.toString())];
  }
  return null; // Admins/HR can see all
}

// ─── Tool Schemas ───────────────────────────────────────────────────────────

const TimeframeSchema = z.object({
  timeframe: z
    .enum([
      "today",
      "this_week",
      "this_month",
      "this_quarter",
      "this_year",
      "last_month",
      "last_7_days",
      "last_30_days",
      "custom",
      "all",
    ])
    .describe("The timeframe for the data query."),
  customStart: z
    .string()
    .optional()
    .describe("Start date for custom timeframe (ISO 8601 string). Required if timeframe is 'custom'."),
  customEnd: z
    .string()
    .optional()
    .describe("End date for custom timeframe (ISO 8601 string). Required if timeframe is 'custom'."),
});

// ─── Tool Definitions ───────────────────────────────────────────────────────

const getSalesDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewSales) {
    return JSON.stringify({ error: "You do not have permission to view sales data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const invoices = await StockInvoice.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.subTotal || 0), 0);

  return JSON.stringify({
    totalInvoices: invoices.length,
    totalRevenue,
    invoices: invoices.slice(0, 50).map((inv) => ({
      id: inv._id,
      date: inv.createdAt,
      total: inv.subTotal,
      status: inv.status,
    })),
  });
}, {
  name: "get_sales_data",
  description:
    "Retrieve sales and invoice data. Use this to answer questions about revenue, sales volume, and invoice status.",
  schema: TimeframeSchema,
});

const getStockDataTool = tool(async (_, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewStock) {
    return JSON.stringify({ error: "You do not have permission to view stock data." });
  }

  const products = await StockProduct.find({ org_id: ctx.orgId }).lean();
  const lowStock = products.filter((p) => (p.currentQuantity || 0) < (p.minAlertQuantity || 0));

  return JSON.stringify({
    totalProducts: products.length,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock
      .slice(0, 10)
      .map((p) => ({ name: p.name, current: p.currentQuantity, min: p.minAlertQuantity })),
    products: products.slice(0, 50).map((p) => ({ id: p._id, name: p.name, quantity: p.currentQuantity })),
  });
}, {
  name: "get_stock_data",
  description:
    "Retrieve inventory and stock product data. Use this to check stock levels, find low stock items, and get product details.",
  schema: z.object({}),
});

const getPayrollDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewPayroll) {
    return JSON.stringify({ error: "You do not have permission to view payroll data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.user_id = { $in: scopedIds };

  const payrolls = await Payroll.find(filter).limit(100).lean();
  const totalPayroll = payrolls.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return JSON.stringify({
    totalPayroll,
    count: payrolls.length,
    payrolls: payrolls
      .slice(0, 50)
      .map((p) => ({ id: p._id, userId: p.user_id, amount: p.totalAmount, month: p.month, year: p.year })),
  });
}, {
  name: "get_payroll_data",
  description:
    "Retrieve payroll data. Use this to answer questions about salaries, total payroll costs, and payment history.",
  schema: TimeframeSchema,
});

const getPerformanceDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewPerformance) {
    return JSON.stringify({ error: "You do not have permission to view performance data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.user_id = { $in: scopedIds };

  const performances = await Performance.find(filter).limit(100).lean();
  const avgScore =
    performances.reduce((sum, p) => sum + (p.overall_score || 0), 0) / (performances.length || 1);

  return JSON.stringify({
    averageScore: avgScore.toFixed(1),
    count: performances.length,
    performances: performances
      .slice(0, 50)
      .map((p) => ({ id: p._id, userId: p.user_id, score: p.overall_score, date: p.createdAt })),
  });
}, {
  name: "get_performance_data",
  description:
    "Retrieve performance review data. Use this to answer questions about employee performance scores and reviews.",
  schema: TimeframeSchema,
});

const getLeaveDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewLeave) {
    return JSON.stringify({ error: "You do not have permission to view leave data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.user_id = { $in: scopedIds };

  const leaveRequests = await LeaveRequest.find(filter).limit(100).lean();
  const pendingCount = leaveRequests.filter((l) => l.status === "pending").length;

  return JSON.stringify({
    totalRequests: leaveRequests.length,
    pendingCount,
    leaveRequests: leaveRequests
      .slice(0, 50)
      .map((l) => ({
        id: l._id,
        userId: l.user_id,
        type: l.leaveType,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
  });
}, {
  name: "get_leave_data",
  description:
    "Retrieve leave request data. Use this to answer questions about time off, pending approvals, and leave balances.",
  schema: TimeframeSchema,
});

const getAttendanceDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewAttendance) {
    return JSON.stringify({ error: "You do not have permission to view attendance data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.date = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.user_id = { $in: scopedIds };

  const attendances = await Attendance.find(filter).limit(100).lean();
  const presentCount = attendances.filter((a) => a.status === "present").length;
  const attendanceRate = attendances.length > 0 ? (presentCount / attendances.length) * 100 : 0;

  return JSON.stringify({
    attendanceRate: attendanceRate.toFixed(1),
    totalRecords: attendances.length,
    attendances: attendances
      .slice(0, 50)
      .map((a) => ({ id: a._id, userId: a.user_id, date: a.date, status: a.status })),
  });
}, {
  name: "get_attendance_data",
  description:
    "Retrieve attendance data. Use this to answer questions about presence, absenteeism, and attendance rates.",
  schema: TimeframeSchema,
});

const getTeamDataTool = tool(async (_, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewTeam) {
    return JSON.stringify({ error: "You do not have permission to view team data." });
  }

  const user = await User.findById(ctx.userId);
  if (!user) return JSON.stringify({ error: "User not found." });

  const directReports = await User.find({ org_id: ctx.orgId, manager_id: ctx.userId })
    .select("firstName lastName email role department")
    .lean();
  const departmentMembers = await User.find({ org_id: ctx.orgId, department: user.department })
    .select("firstName lastName email role department")
    .lean();

  return JSON.stringify({
    directReportsCount: directReports.length,
    departmentMembersCount: departmentMembers.length,
    directReports,
    departmentMembers,
  });
}, {
  name: "get_team_data",
  description:
    "Retrieve team and department structure. Use this to find out who reports to the user, or who is in the same department.",
  schema: z.object({}),
});

const getTaskDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.assignedTo = { $in: scopedIds };

  const tasks = await Task.find(filter).limit(100).lean();
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed"
  ).length;

  return JSON.stringify({
    totalTasks: tasks.length,
    pendingTasks: pending,
    overdueTasks: overdue,
    tasks: tasks
      .slice(0, 50)
      .map((t) => ({ id: t._id, title: t.title, status: t.status, dueDate: t.dueDate })),
  });
}, {
  name: "get_task_data",
  description:
    "Retrieve task data. Use this to answer questions about assigned work, completed tasks, pending tasks, or overdue tasks.",
  schema: TimeframeSchema,
});

const getMeetingDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.startTime = timeFilter;

  const scopedIds = await getScopedUserIds(ctx.orgId, ctx.userId, ctx.role);
  if (scopedIds) filter.attendees = { $in: scopedIds };

  const meetings = await Meeting.find(filter).limit(50).lean();
  return JSON.stringify({
    totalMeetings: meetings.length,
    meetings: meetings.map((m) => ({
      id: m._id,
      title: m.title,
      startTime: m.startTime,
      status: m.status,
    })),
  });
}, {
  name: "get_meeting_data",
  description: "Retrieve meeting data. Use this to answer questions about upcoming or past meetings.",
  schema: TimeframeSchema,
});

const getFeedbackDataTool = tool(async ({ timeframe, customStart, customEnd }, config) => {
  const ctx = config.configurable.ctx as AssistantOrgContext;
  if (!ctx.permissions.canViewFeedback) {
    return JSON.stringify({ error: "You do not have permission to view feedback data." });
  }

  const timeFilter = buildTimeFilter(timeframe, customStart, customEnd);
  const filter: any = { org_id: ctx.orgId };
  if (timeFilter) filter.createdAt = timeFilter;

  const feedbacks = await Feedback.find(filter).limit(50).lean();
  return JSON.stringify({
    totalFeedbacks: feedbacks.length,
    feedbacks: feedbacks.map((f) => ({
      id: f._id,
      type: f.type,
      rating: f.rating,
      comment: f.comment,
      date: f.createdAt,
    })),
  });
}, {
  name: "get_feedback_data",
  description:
    "Retrieve feedback data. Use this to answer questions about employee feedback, ratings, and suggestions.",
  schema: TimeframeSchema,
});

// ─── Service Implementation ─────────────────────────────────────────────────

function createAssistantTools(ctx: AssistantOrgContext) {
  return [
    getSalesDataTool,
    getStockDataTool,
    getPayrollDataTool,
    getPerformanceDataTool,
    getLeaveDataTool,
    getAttendanceDataTool,
    getTeamDataTool,
    getTaskDataTool,
    getMeetingDataTool,
    getFeedbackDataTool,
  ];
}

function buildSystemPrompt(ctx: AssistantOrgContext): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const currentYear = now.getUTCFullYear();

  return `You are Elevate AI — a smart, concise data analyst assistant built into the **${ctx.companyName}** HR & business platform.

## WHO YOU ARE
You are a trusted internal analyst. You always answer with real data from the company's database. You never invent figures.

## AVAILABLE DATA SOURCES & TOOLS
You have access to tools that query this organization's database for:
- Sales & Invoices
- Inventory & Stock
- Payroll
- Performance & KPIs
- Leave Requests
- Attendance
- Tasks & Meetings
- Team & Employee Data
- Feedback

## CURRENT DATE & TIME CONTEXT
- **Today**: ${today} (${now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" })})
- **This month**: ${currentMonth}
- **Last month**: ${lastMonth}
- **Current year**: ${currentYear}

## USER CONTEXT
- Name: ${ctx.userName}
- Role: ${ctx.role}
- Company: ${ctx.companyName}
- Permissions: You can only access data that the user has permission to view. If a tool returns a permission error, inform the user politely.

## CRITICAL DATA RULES
1. **Always call tools first.** Never answer a numeric or business question without calling the appropriate tool.
2. **You are strictly scoped to ${ctx.companyName}.** The org_id is enforced in the tools — you cannot see any other company's data.
3. **Date accuracy**: Use the date context above for relative terms. Pass the correct timeframe to the tools:
   - "last month" → use timeframe: "last_month"
   - "this month" → use timeframe: "this_month"
   - "this year" → use timeframe: "this_year"
   - "last 7 days" → use timeframe: "last_7_days"
   - "last 30 days" → use timeframe: "last_30_days"
4. **No hallucination.** If a tool returns empty results or an error, say so honestly. Do not make up numbers.
5. **Permission boundaries**: Respect the user's role. If they ask for data they can't access, explain that they lack the necessary permissions.

## RESPONSE FORMAT
- Be **concise and direct** — lead with the key number or finding.
- Use **bullet points** for lists of items.
- Use **bold** for key metrics (e.g., **KES 450,000 revenue**).
- Always state the **time period** the data covers.
- End with a brief **insight or observation** when relevant.
- Do NOT expose internal IDs, tool names, field names, or database details.
- Do NOT repeat the user's question back to them.
- If the query is general (e.g., "How do I request leave?"), answer directly without tools, but guide them on how to ask data questions if needed.`;
}

function getModel(): ChatOpenAI {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openRouterKey && !openAiKey) {
    throw new Error(
      "AI assistant is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to server/.env to enable it."
    );
  }

  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
    return new ChatOpenAI({
      model,
      apiKey: openRouterKey,
      temperature: 0.1,
      maxTokens: 1500,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Elevate HR",
        },
      },
    });
  }

  return new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: openAiKey!,
    temperature: 0.1,
    maxTokens: 1500,
  });
}

function toLangChainMessages(history: ChatTurn[], systemPrompt: string): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];
  for (const turn of history.slice(-10)) {
    if (turn.role === "user") messages.push(new HumanMessage(turn.content));
    else messages.push(new AIMessage(turn.content));
  }
  return messages;
}

export class AiAssistantService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  }

  static getModelInfo(): { model: string; provider: string } {
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: "openrouter",
        model: process.env.OPENROUTER_MODEL || "gpt-4o-mini",
      };
    }
    return { provider: "openai", model: "gpt-4o-mini" };
  }

  static async chat(ctx: AssistantOrgContext, message: string, history: ChatTurn[] = []) {
    const trimmed = String(message || "").trim();
    if (!trimmed) throw new Error("Message is required");
    if (trimmed.length > 4000) throw new Error("Message is too long (max 4000 characters)");

    if (!ctx.orgId || ctx.orgId.trim() === "") {
      throw new Error("Missing organization context — cannot process your request.");
    }

    try {
      const tools = createAssistantTools(ctx);
      const toolMap = new Map(tools.map((t) => [t.name, t]));
      const llm = getModel().bindTools(tools);

      const systemPrompt = buildSystemPrompt(ctx);
      const messages = toLangChainMessages(history, systemPrompt);
      messages.push(new HumanMessage(trimmed));

      const toolsUsed: string[] = [];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const response = await llm.invoke(messages);
        messages.push(response);

        const toolCalls = response.tool_calls || [];
        if (!toolCalls.length) {
          const answer = String(response.content || "").trim();
          return {
            answer: answer || "I could not generate a response. Please try rephrasing your question.",
            toolsUsed: Array.from(new Set(toolsUsed)),
          };
        }

        // Execute tools in parallel for efficiency
        const toolPromises = toolCalls.map(async (call) => {
          const toolName = call.name;
          toolsUsed.push(toolName);
          const selected = toolMap.get(toolName);
          let output: string;

          try {
            if (!selected) {
              output = JSON.stringify({ error: `Unknown tool: ${toolName}` });
            } else {
              output = await selected.invoke(call.args, { configurable: { ctx } });
            }
          } catch (error) {
            output = JSON.stringify({
              error: error instanceof Error ? error.message : "Tool execution failed",
            });
          }

          return {
            message: new ToolMessage({
              content: output,
              tool_call_id: call.id || toolName,
            }),
            toolName,
          };
        });

        const results = await Promise.all(toolPromises);
        for (const res of results) {
          messages.push(res.message);
        }
      }

      return {
        answer:
          "I needed more steps than expected to answer this. Please try a more specific question or narrow the time period.",
        toolsUsed: Array.from(new Set(toolsUsed)),
      };
    } catch (error) {
      console.error("AI Assistant Error:", error);
      return {
        answer:
          "I'm having trouble processing that request right now. Please try rephrasing your question or contact your administrator if you need specific data.",
        toolsUsed: [],
      };
    }
  }
}