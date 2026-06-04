import { ChatOpenAI } from "@langchain/openai"
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages"
import type { AssistantOrgContext } from "./orgContext"
import { createAssistantTools } from "./tools"

export type ChatTurn = {
  role: "user" | "assistant"
  content: string
}

const MAX_TOOL_ROUNDS = 8

function buildSystemPrompt(ctx: AssistantOrgContext): string {
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const lastMonth = lastMonthDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const currentYear = now.getUTCFullYear()

  return `You are Elevate AI — a smart, concise data analyst assistant built into the **${ctx.companyName}** HR & business platform.

## WHO YOU ARE
You are a trusted internal analyst. You always answer with real data from the company's database. You never invent figures.

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
1. **Always call tools first.** Never answer a numeric or business question without calling the appropriate tool.
2. **You are strictly scoped to ${ctx.companyName}.** The org_id is enforced server-side — you cannot see any other company's data.
3. **Date accuracy**: Use the date context above for relative terms:
   - "last month" → use period: "last_month" (= ${lastMonth})
   - "this month" → use period: "this_month" (= ${currentMonth})
   - "this year" → use period: "this_year" (= ${currentYear})
   - "last week" → use period: "last_7_days"
4. **No hallucination.** If a tool returns empty results, say so honestly.
5. **Permission boundaries**: HR tools (employees, leave, payroll, attendance) are restricted to admin/HR/manager roles. If restricted, explain politely.

## RESPONSE FORMAT
- Be **concise and direct** — lead with the key number or finding.
- Use **bullet points** for lists of items.
- Use **bold** for key metrics (e.g., **KES 450,000 revenue**).
- Always state the **time period** the data covers.
- End with a brief **insight or observation** when relevant.
- Do NOT expose internal IDs, tool names, field names, or database details.
- Do NOT repeat the user's question back to them.

## EXAMPLE GOOD RESPONSE
Asked "How many products sold last month?":
> In **${lastMonth}**, your company sold **1,240 units** across 87 transactions, generating **KES 312,000** in revenue.
> - Top seller: Product X (340 units)
> - The 15th was the busiest sales day.`
}

function getModel(): ChatOpenAI {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY

  if (!openRouterKey && !openAiKey) {
    throw new Error(
      "AI assistant is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to server/.env to enable it.",
    )
  }

  // Prefer OpenRouter (supports many models including free ones)
  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001"
    return new ChatOpenAI({
      model,
      apiKey: openRouterKey,
      temperature: 0.1, // Low temp for factual accuracy
      maxTokens: 1500,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer":
            process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Elevate HR",
        },
      },
    })
  }

  // Fallback: direct OpenAI
  return new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: openAiKey!,
    temperature: 0.1,
    maxTokens: 1500,
  })
}

function toLangChainMessages(history: ChatTurn[], systemPrompt: string): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)]
  // Keep last 10 turns to stay within context limits
  for (const turn of history.slice(-10)) {
    if (turn.role === "user") messages.push(new HumanMessage(turn.content))
    else messages.push(new AIMessage(turn.content))
  }
  return messages
}

export class AiAssistantService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)
  }

  static getModelInfo(): { model: string; provider: string } {
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: "openrouter",
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      }
    }
    return { provider: "openai", model: "gpt-4o-mini" }
  }

  static async chat(ctx: AssistantOrgContext, message: string, history: ChatTurn[] = []) {
    const trimmed = String(message || "").trim()
    if (!trimmed) throw new Error("Message is required")
    if (trimmed.length > 4000) throw new Error("Message is too long (max 4000 characters)")

    // Extra safety: ensure org context is valid before building tools
    if (!ctx.orgId || ctx.orgId.trim() === "") {
      throw new Error("Missing organization context — cannot process your request.")
    }

    const tools = createAssistantTools(ctx)
    const toolMap = new Map(tools.map((t) => [t.name, t]))
    const llm = getModel().bindTools(tools)

    const systemPrompt = buildSystemPrompt(ctx)
    const messages = toLangChainMessages(history, systemPrompt)
    messages.push(new HumanMessage(trimmed))

    const toolsUsed: string[] = []

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await llm.invoke(messages)
      messages.push(response)

      const toolCalls = response.tool_calls || []
      if (!toolCalls.length) {
        const answer = String(response.content || "").trim()
        return {
          answer: answer || "I could not generate a response. Please try rephrasing your question.",
          toolsUsed: Array.from(new Set(toolsUsed)),
        }
      }

      for (const call of toolCalls) {
        const toolName = call.name
        toolsUsed.push(toolName)
        const selected = toolMap.get(toolName)
        let output: string
        try {
          if (!selected) {
            output = JSON.stringify({ error: `Unknown tool: ${toolName}` })
          } else {
            output = await selected.invoke(call.args as Record<string, unknown>)
          }
        } catch (error) {
          output = JSON.stringify({
            error: error instanceof Error ? error.message : "Tool execution failed",
          })
        }
        messages.push(
          new ToolMessage({
            content: output,
            tool_call_id: call.id || toolName,
          }),
        )
      }
    }

    return {
      answer:
        "I needed more steps than expected to answer this. Please try a more specific question or narrow the time period.",
      toolsUsed: Array.from(new Set(toolsUsed)),
    }
  }
}
