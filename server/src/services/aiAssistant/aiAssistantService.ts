// server/src/services/aiAssistant/aiAssistantService.ts

import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AssistantOrgContext } from "./orgContext";
import { createAssistantTools } from "./tools";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { AssistantOrgContext };

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const MAX_TOOL_ROUNDS = 8;

// ─── Model Factory ───────────────────────────────────────────────────────────

function getModel(): ChatOpenAI {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!openRouterKey && !openAiKey) {
    throw new Error(
      "AI assistant is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to server/.env to enable it."
    );
  }

  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    return new ChatOpenAI({
      model,
      apiKey: openRouterKey,
      temperature: 0.1,
      maxTokens: 2000,
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
    maxTokens: 2000,
  });
}

// ─── System Prompt ───────────────────────────────────────────────────────────

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
- Sales & Invoices (revenue, top products, trends, customer breakdown)
- Inventory & Stock (stock levels, low-stock alerts, category performance)
- Quotations (counts, values, status breakdown)
- Payroll (monthly costs, net pay, deductions, bonuses)
- Leave Requests (pending approvals, leave types, status breakdown)
- Attendance (presence rates, hours logged, absenteeism)
- Tasks (assigned work, overdue items, priorities)
- Employee & Team Data (workforce overview, employee search)

## CURRENT DATE & TIME CONTEXT
- **Today**: ${today} (${now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" })})
- **This month**: ${currentMonth}
- **Last month**: ${lastMonth}
- **Current year**: ${currentYear}

## USER CONTEXT
- Name: ${ctx.userName}
- Role: ${ctx.role}
- Company: ${ctx.companyName}

## CRITICAL DATA RULES
1. **Always call the appropriate tool first.** Never answer a numeric or business question without querying the database.
2. **You are strictly scoped to ${ctx.companyName}.** The org_id is enforced in every tool — you cannot access any other company's data.
3. **Use the right period shortcut**:
   - "last month" → period: "last_month"
   - "this month" → period: "this_month"
   - "this year" → period: "this_year"
   - "last 7 days" → period: "last_7_days"
   - "last 30 days" → period: "last_30_days"
4. **No hallucination.** If a tool returns empty results, report that honestly. Never invent figures.
5. For payroll questions, use the get_payroll_summary tool with the appropriate month.

## RESPONSE FORMAT
- Be **concise and direct** — lead with the key number or finding.
- Use **bullet points** for lists of items.
- Use **bold** for key metrics (e.g., **KES 450,000 revenue**).
- Always state the **time period** the data covers.
- End with a brief **insight or observation** when relevant.
- Do NOT expose internal IDs, tool names, field names, or database details.
- Do NOT repeat the user's question back to them.
- If the query is general (e.g., "How do I request leave?"), answer directly from your knowledge without calling tools.`;
}

// ─── Message Helpers ─────────────────────────────────────────────────────────

function toLangChainMessages(history: ChatTurn[], systemPrompt: string): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];
  for (const turn of history.slice(-10)) {
    if (turn.role === "user") messages.push(new HumanMessage(turn.content));
    else messages.push(new AIMessage(turn.content));
  }
  return messages;
}

// ─── Service Class ────────────────────────────────────────────────────────────

export class AiAssistantService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  }

  static getModelInfo(): { model: string; provider: string } {
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: "openrouter",
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
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

        // Execute tool calls
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

          return new ToolMessage({
            content: output,
            tool_call_id: call.id || toolName,
          });
        });

        const toolMessages = await Promise.all(toolPromises);
        for (const msg of toolMessages) {
          messages.push(msg);
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