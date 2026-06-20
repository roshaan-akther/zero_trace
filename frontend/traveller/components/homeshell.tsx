"use client"

import { useState, useRef, createContext, useContext } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { ChatUI, Message } from "@/components/chat-ui"
import { PlanPanel } from "@/components/plan-panel"
import { RoutesPanel } from "@/components/routes-panel"
import { DynamicTimetablePanel } from "@/components/dynamic-timetable-panel"
import { getToken } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface PanelContextType {
  isPlanPanelOpen: boolean
  setPlanPanelOpen: (open: boolean) => void
  isRoutesPanelOpen: boolean
  setRoutesPanelOpen: (open: boolean) => void
  isTimetablePanelOpen: boolean
  setTimetablePanelOpen: (open: boolean) => void
}

export const PanelContext = createContext<PanelContextType | undefined>(undefined)

export function usePanel() {
  const context = useContext(PanelContext)
  if (!context) {
    throw new Error("usePanel must be used within a PanelProvider")
  }
  return context
}

export default function HomeShell() {
  const { lang } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [planResult, setPlanResult] = useState<string | null>(null)
  const [isPlanPanelOpen, setIsPlanPanelOpen] = useState(false)
  const [isRoutesPanelOpen, setIsRoutesPanelOpen] = useState(false)
  const [isTimetablePanelOpen, setIsTimetablePanelOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingToolNamesRef = useRef<Record<string, string>>({})

  const handleMessage = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsGenerating(true)

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, aiMessage])
    pendingToolNamesRef.current = {}

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const historyMessages: { role: string; content: string; tool_calls?: any[]; tool_call_id?: string }[] = []
      for (const m of messages) {
        if (m.role === "user") {
          historyMessages.push({ role: "user", content: m.content })
        } else if (m.role === "assistant") {
          const completedTools = (m.events || []).filter(
            (e) => e.type === "tool_call" && e.status === "complete"
          ) as { id: string; name: string; arguments: Record<string, unknown>; result?: string }[]
          if (completedTools.length > 0) {
            historyMessages.push({
              role: "assistant",
              content: m.content || null as any,
              tool_calls: completedTools.map(tc => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
              })),
            })
            for (const tc of completedTools) {
              if (tc.result !== undefined) {
                historyMessages.push({
                  role: "tool" as const,
                  tool_call_id: tc.id,
                  content: tc.result || "",
                })
              }
            }
          } else {
            historyMessages.push({ role: "assistant", content: m.content })
          }
        }
      }
      historyMessages.push({ role: "user", content: message })

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyMessages,
          token: getToken(),
          lang,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let sseBuffer = ""

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split("\n")
        sseBuffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (!trimmed.startsWith("data: ")) continue

          const raw = trimmed.slice(6)
          if (raw === "[DONE]") break outer

          let parsed: {
            type?: string
            content?: string
            id?: string
            name?: string
            arguments?: Record<string, unknown>
            result?: string
            isError?: boolean
            status?: string
            error?: string
          }

          try {
            parsed = JSON.parse(raw)
          } catch {
            continue
          }

          if (parsed.type === "error" && parsed.error) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? { ...m, content: m.content + `\n\n**Error:** ${parsed.error}` }
                  : m,
              ),
            )
          } else if (parsed.type === "text" && parsed.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? { ...m, content: m.content + parsed.content! }
                  : m,
              ),
            )
          } else if (parsed.type === "thinking" && parsed.id && parsed.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? {
                      ...m,
                      events: [
                        ...(m.events ?? []),
                        { type: "thinking" as const, id: parsed.id!, content: parsed.content!, status: (parsed.status as "pending" | "complete") ?? "pending" },
                      ],
                    }
                  : m,
              ),
            )
          } else if (parsed.type === "thinking_append" && parsed.id && parsed.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? {
                      ...m,
                      events: (m.events ?? []).map((event) =>
                        event.type === "thinking" && event.id === parsed.id
                          ? { ...event, content: event.content + parsed.content! }
                          : event,
                      ),
                    }
                  : m,
              ),
            )
          } else if (parsed.type === "thinking_complete" && parsed.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? {
                      ...m,
                      events: (m.events ?? []).map((event) =>
                        event.type === "thinking" && event.id === parsed.id
                          ? { ...event, status: "complete" as const }
                          : event,
                      ),
                    }
                  : m,
              ),
            )
          } else if (
            parsed.type === "tool_call" &&
            parsed.id &&
            parsed.name &&
            parsed.arguments !== undefined
          ) {
            pendingToolNamesRef.current[parsed.id] = parsed.name
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? {
                      ...m,
                      events: [
                        ...(m.events ?? []),
                        { type: "tool_call" as const, id: parsed.id!, name: parsed.name!, arguments: parsed.arguments!, status: "pending" as const },
                      ],
                    }
                  : m,
              ),
            )
          } else if (parsed.type === "tool_result" && parsed.id) {
            const toolName = pendingToolNamesRef.current[parsed.id]
            if (toolName === "present_plan" && parsed.result) {
              setPlanResult(parsed.result)
              setIsPlanPanelOpen(true)
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessage.id
                  ? {
                      ...m,
                      events: (m.events ?? []).map((event) =>
                        event.type === "tool_call" && event.id === parsed.id
                          ? {
                              ...event,
                              status: parsed.isError ? ("error" as const) : ("complete" as const),
                              result: parsed.result,
                              isError: parsed.isError,
                            }
                          : event,
                      ),
                    }
                  : m,
              ),
            )
          }
        }
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError"
      if (!isAbort) {
        console.error("Chat error:", error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessage.id
              ? { ...m, content: m.content + "\n\n**Error:** Failed to get response." }
              : m,
          ),
        )
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
  }

  return (
    <PanelContext.Provider value={{ isPlanPanelOpen, setPlanPanelOpen: setIsPlanPanelOpen, isRoutesPanelOpen, setRoutesPanelOpen: setIsRoutesPanelOpen, isTimetablePanelOpen, setTimetablePanelOpen: setIsTimetablePanelOpen }}>
      <SidebarProvider className="border-border/25">
        <AppSidebar />
        <div className={`flex-1 flex h-screen transition-all duration-300 ${isPlanPanelOpen ? 'mr-[50vw]' : ''}`}>
          <SidebarInset className="flex flex-col flex-1 border-border/25">
            <AppHeader />
            <ChatUI
              messages={messages}
              onMessage={handleMessage}
              isGenerating={isGenerating}
              onStopGeneration={stopGeneration}
            />
          </SidebarInset>
        </div>
      </SidebarProvider>
      <div className={`fixed right-0 top-0 h-full bg-background border-l border-border transition-all duration-300 z-30 ${isPlanPanelOpen ? 'w-[50vw]' : 'w-0 overflow-hidden'}`}>
        <PlanPanel
          planResult={planResult}
          onClose={() => setIsPlanPanelOpen(false)}
        />
      </div>
      <RoutesPanel
        isOpen={isRoutesPanelOpen}
        onClose={() => setIsRoutesPanelOpen(false)}
      />
      <DynamicTimetablePanel
        isOpen={isTimetablePanelOpen}
        onClose={() => setIsTimetablePanelOpen(false)}
      />
    </PanelContext.Provider>
  )
}
