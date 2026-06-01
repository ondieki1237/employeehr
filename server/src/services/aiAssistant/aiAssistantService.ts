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

const MAX_TOOL_ROUNDS = 6

function buildSystemPrompt(ctx: AssistantOrgContext): string {
  return `You are Elevate AI Assistant — a helpful analyst for a multi-tenant HR and inventory platform.

CRITICAL RULES:
- You only have access to data for the current company (tenant). Never invent numbers.
- Always use the provided tools to fetch real data before answering quantitative questions.
- For "last month", call tools with period "last_month". For "this month", use period "this_month".
- If a tool returns an error about permissions, explain that politely to the user.
- Present answers clearly with bullet points or short paragraphs. Include the date range you used.
- Do not expose internal IDs, database field names, or tool names to the user.
- Currency amounts are in the company's local practice (no symbol unless known); label as "revenue" or "value".

Current user: ${ctx.userName} (${ctx.role})
Company scope: org_id is fixed server-side — you cannot query other tenants.`
}

function getModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Add it to server/.env to enable the AI assistant.",
    )
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
  const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)

  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 1200,
    ...(useOpenRouter
      ? {
          configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
              "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.FRONTEND_URL || "http://localhost:3000",
              "X-Title": process.env.OPENROUTER_APP_NAME || "Elevate HR",
            },
          },
        }
      : {}),
  })
}

function toLangChainMessages(history: ChatTurn[], systemPrompt: string): BaseMessage[] {
  const messages: BaseMessage[] = [new SystemMessage(systemPrompt)]
  for (const turn of history.slice(-12)) {
    if (turn.role === "user") messages.push(new HumanMessage(turn.content))
    else messages.push(new AIMessage(turn.content))
  }
  return messages
}

export class AiAssistantService {
  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)
  }

  static async chat(ctx: AssistantOrgContext, message: string, history: ChatTurn[] = []) {
    const trimmed = String(message || "").trim()
    if (!trimmed) {
      throw new Error("Message is required")
    }
    if (trimmed.length > 4000) {
      throw new Error("Message is too long (max 4000 characters)")
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
        "I needed more steps than allowed to finish this question. Please ask a more specific question or narrow the date range.",
      toolsUsed: Array.from(new Set(toolsUsed)),
    }
  }
}
