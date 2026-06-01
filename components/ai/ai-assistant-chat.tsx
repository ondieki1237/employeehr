"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { aiAssistantApi, type AiChatTurn } from "@/lib/api"

const SUGGESTIONS = [
  "How many products did we sell last month?",
  "What is our total sales revenue this month?",
  "Which products are low on stock?",
  "How many invoices did we raise last month?",
]

export function AiAssistantChat() {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AiChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    aiAssistantApi
      .getStatus()
      .then((res) => setEnabled(Boolean(res.data?.enabled)))
      .catch(() => setEnabled(false))
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      setError(null)
      setInput("")
      const userTurn: AiChatTurn = { role: "user", content: trimmed }
      const history = [...messages, userTurn]
      setMessages(history)
      setLoading(true)

      try {
        const res = await aiAssistantApi.chat(trimmed, messages)
        const answer = res.data?.answer || "No response received."
        setMessages([...history, { role: "assistant", content: answer }])
      } catch (err: any) {
        const message = err?.message || "Failed to reach the assistant"
        setError(message)
        setMessages([...history, { role: "assistant", content: `Sorry — ${message}` }])
      } finally {
        setLoading(false)
      }
    },
    [loading, messages],
  )

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
        {open ? (
          <div
            className={cn(
              "flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
              "animate-in slide-in-from-bottom-4 fade-in duration-200",
            )}
            style={{ maxHeight: "min(70vh, 560px)" }}
          >
            <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">Elevate AI</p>
                  <p className="text-xs opacity-90">Your company data assistant</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {enabled === false ? (
                <p className="text-sm text-muted-foreground">
                  AI assistant is not configured on the server. Ask your admin to set{" "}
                  <code className="text-xs">OPENROUTER_API_KEY</code> in <code className="text-xs">server/.env</code>.
                </p>
              ) : messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ask about sales, inventory, invoices, quotations, or HR metrics. Answers use only your
                    company&apos;s data.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="rounded-full border bg-muted/50 px-3 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto border bg-muted/40 text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}

              {loading ? (
                <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your data…
                </div>
              ) : null}

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <form
              className="flex gap-2 border-t p-3"
              onSubmit={(event) => {
                event.preventDefault()
                sendMessage(input)
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about sales, stock, invoices…"
                disabled={loading || enabled === false}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim() || enabled === false}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>
    </>
  )
}
