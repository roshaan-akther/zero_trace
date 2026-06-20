"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { ThinkingBlock } from "@/components/thinking-block"
import { ToolCallBlock } from "@/components/tool-call-block"

interface Block {
  kind: "thought" | "tool" | "answer"
  id: number | string
  content?: string
  isActive?: boolean
  toolName?: string
  toolArgs?: string
  toolResult?: string
  toolStatus?: "active" | "complete"
}

export function Chat() {
  const [history, setHistory] = useState<{ role: "user"; content: string }[]>([])
  const [blocks, setBlocks] = useState<Block[]>([
    { kind: "thought", id: "welcome", content: "Hi! I'm your transit travel assistant. Tell me where you'd like to go and I'll help plan your journey." },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const blockIdRef = useRef(1)
  const hasSeenReasoningRef = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [blocks, history])

  function findActiveThought(prev: Block[]): number {
    for (let i = prev.length - 1; i >= 0; i--) {
      if (prev[i].kind === "thought" && prev[i].isActive) return i
    }
    return -1
  }

  function deactivateThought(prev: Block[]): Block[] {
    const idx = findActiveThought(prev)
    if (idx >= 0) {
      const updated = prev.slice()
      updated[idx] = { ...updated[idx], isActive: false }
      return updated
    }
    return prev
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input
    setHistory((prev) => [...prev, { role: "user", content: userMessage }])
    setInput("")
    setIsLoading(true)
    setBlocks([])

    const msgsForApi = history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
    msgsForApi.push({ role: "user", content: userMessage })

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgsForApi }),
      })

      if (!res.ok) throw new Error("Failed to get response")

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)

            switch (event.type) {
              case "thought_start":
                hasSeenReasoningRef.current = false
                break

              case "thinking":
                hasSeenReasoningRef.current = true
                setBlocks((prev) => {
                  const idx = findActiveThought(prev)
                  if (idx >= 0) {
                    const updated = prev.slice()
                    updated[idx] = {
                      ...updated[idx],
                      content: (updated[idx].content || "") + event.content,
                    }
                    return updated
                  }
                  const id = blockIdRef.current++
                  return [...prev, { kind: "thought", id, content: event.content, isActive: true }]
                })
                break

              case "text":
                if (hasSeenReasoningRef.current) {
                  setBlocks((prev) => {
                    for (let i = prev.length - 1; i >= 0; i--) {
                      if (prev[i].kind === "answer") {
                        const updated = prev.slice()
                        updated[i] = { ...updated[i], content: (updated[i].content || "") + event.content }
                        return updated
                      }
                    }
                    const id = blockIdRef.current++
                    return [...prev, { kind: "answer", id, content: event.content }]
                  })
                } else {
                  setBlocks((prev) => {
                    const idx = findActiveThought(prev)
                    if (idx >= 0) {
                      const updated = prev.slice()
                      updated[idx] = {
                        ...updated[idx],
                        content: (updated[idx].content || "") + event.content,
                      }
                      return updated
                    }
                    const id = blockIdRef.current++
                    return [...prev, { kind: "thought", id, content: event.content, isActive: true }]
                  })
                }
                break

              case "tool_call":
                setBlocks((prev) => {
                  const cleaned = deactivateThought(prev)
                  return [
                    ...cleaned,
                    {
                      kind: "tool",
                      id: event.callId,
                      toolName: event.toolName,
                      toolArgs: JSON.stringify(event.toolArgs ?? {}, null, 2),
                      toolResult: "",
                      toolStatus: "active",
                    },
                  ]
                })
                break

              case "tool_result":
                setBlocks((prev) =>
                  prev.map((b) => {
                    if (b.kind === "tool" && b.id === event.callId) {
                      return { ...b, toolResult: event.toolResult, toolStatus: "complete" as const }
                    }
                    return b
                  }),
                )
                break

              case "round_end":
                hasSeenReasoningRef.current = false
                setBlocks((prev) => deactivateThought(prev))
                break
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setBlocks((prev) => {
        if (prev.length === 0) {
          return [{ kind: "thought", id: blockIdRef.current++, content: "Sorry, something went wrong. Please try again." }]
        }
        return deactivateThought(prev)
      })
    } finally {
      setBlocks((prev) => deactivateThought(prev))
      setIsLoading(false)
    }
  }

  const hasAgentBlocks = blocks.length > 0

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Bot className="size-5 text-primary" />
        <span className="font-semibold text-sm">Transit Travel Assistant</span>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {history.map((msg, i) => (
            <div key={`user-${i}`} className="flex gap-3 justify-end">
              <div className="max-w-[80%]">
                <div className="rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">
                  {msg.content}
                </div>
              </div>
              <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <User className="size-3.5 text-primary-foreground" />
              </div>
            </div>
          ))}

          {hasAgentBlocks && (
            <div className="flex gap-3">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="max-w-[80%] space-y-1.5 flex-1">
                {blocks.map((block) =>
                  block.kind === "thought" ? (
                    <ThinkingBlock
                      key={block.id}
                      content={block.content || ""}
                      isActive={block.isActive || false}
                    />
                  ) : block.kind === "answer" ? (
                    <div
                      key={block.id}
                      className="text-sm text-foreground/90 rounded-lg px-2 py-1.5 leading-relaxed whitespace-pre-wrap"
                    >
                      {block.content}
                    </div>
                  ) : (
                    <ToolCallBlock
                      key={block.id}
                      name={block.toolName || ""}
                      args={block.toolArgs || ""}
                      result={block.toolResult || ""}
                      status={block.toolStatus || "active"}
                    />
                  ),
                )}
                {isLoading && (() => {
                  const last = blocks[blocks.length - 1]
                  if (last?.kind === "tool" && last.toolStatus === "complete") {
                    return (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-1">
                        <Loader2 className="size-3 animate-spin" />
                        Thinking...
                      </div>
                    )
                  }
                  if (!last || last.kind === "answer" && last.content) {
                    return null
                  }
                  return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-1">
                      <Loader2 className="size-3 animate-spin" />
                      Thinking...
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <Separator />

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
        <Input
          placeholder="Where do you want to go?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </Card>
  )
}
