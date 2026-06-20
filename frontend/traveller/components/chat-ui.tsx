"use client"

import { useRef, useEffect, useState } from "react"
import { MessageBar } from "@/components/message-bar"
import { Copy, Check } from "lucide-react"
import { ToolCallBlock } from "@/components/tool-call-block"
import { ThinkingBlock } from "@/components/thinking-block"

export interface ToolCallEvent {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: "pending" | "complete" | "error"
  result?: string
  isError?: boolean
}

export type MessageEvent =
  | { type: "thinking"; id: string; content: string; status?: "pending" | "complete" }
  | { type: "tool_call"; id: string; name: string; arguments: Record<string, unknown>; status: "pending" | "complete" | "error"; result?: string; isError?: boolean }

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  events?: MessageEvent[]
  timestamp?: Date
}

interface ChatUIProps {
  messages: Message[]
  onMessage: (message: string) => void
  isGenerating: boolean
  onStopGeneration: () => void
}

export function ChatUI({ messages, onMessage, isGenerating, onStopGeneration }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const threshold = 50
      const atBottom = scrollHeight - (scrollTop + clientHeight) < threshold
      setIsAtBottom(atBottom)
    }
  }

  useEffect(() => {
    if (isAtBottom && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isAtBottom])

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-6 pb-32">
          {messages.length === 0 ? null : (
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out`}
                >
                  <div
                    className={`${
                      message.role === "user"
                        ? "px-4 py-3 bg-muted text-foreground rounded-2xl w-fit"
                        : "p-0 bg-transparent w-full"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="text-base leading-relaxed">
                        {message.events && message.events.length > 0 && (
                          <div className="space-y-1">
                            {(() => {
                              const groups: MessageEvent[][] = []
                              for (const ev of message.events!) {
                                if (ev.type === "thinking" || groups.length === 0) {
                                  groups.push([ev])
                                } else {
                                  groups[groups.length - 1].push(ev)
                                }
                              }
                              return groups.map((group, gIdx) => {
                                const isActive = group.some(e => (e.type === "thinking" && e.status === "pending") || (e.type === "tool_call" && e.status === "pending"))
                                const hasThinking = group.some(e => e.type === "thinking")
                                const label = hasThinking ? (isActive ? "Thinking..." : "Thought") : (isActive ? "Working..." : "Worked")
                                return (
                                  <div key={`round-${gIdx}`} className="mt-0 mb-2 rounded-xl overflow-hidden backdrop-blur-sm">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const el = document.getElementById(`round-content-${gIdx}-${gIdx}`)
                                        if (el) {
                                          const parent = el.closest('[data-state]')
                                          if (parent) {
                                            const isOpen = parent.getAttribute('data-state') === 'open'
                                            parent.setAttribute('data-state', isOpen ? 'closed' : 'open')
                                            const content = parent.nextElementSibling
                                            if (content) {
                                              content.classList.toggle('max-h-0')
                                              content.classList.toggle('max-h-96')
                                              content.classList.toggle('opacity-0')
                                              content.classList.toggle('opacity-100')
                                            }
                                          }
                                        }
                                      }}
                                      className="w-full flex items-center gap-2.5 pl-2 pr-4 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 text-left"
                                    >
                                      <span className="text-xs font-medium text-muted-foreground/70">{label}</span>
                                    </button>
                                    <div id={`round-content-${gIdx}-${gIdx}`} className="overflow-hidden transition-all duration-300 ease-out max-h-96 opacity-100" data-state="open">
                                      <div className="pr-4 py-1 space-y-1">
                                        {group.map((ev, eIdx) => {
                                          if (ev.type === "thinking") {
                                            return <ThinkingBlock key={`t-${ev.id}-${eIdx}`} thinking={ev.content} isActive={ev.status === "pending"} />
                                          } else if (ev.type === "tool_call") {
                                            return (
                                              <div key={`tc-${ev.id}`}>
                                                <ToolCallBlock toolCall={ev} />
                                              </div>
                                            )
                                          }
                                          return null
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        )}
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-right">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className={`absolute left-0 right-0 p-4 md:pb-4 md:px-6 transition-all duration-500 ease-in-out ${messages.length === 0 ? 'top-0 bottom-0 overflow-y-auto' : 'bottom-0'}`}>
        <div className={`mx-auto max-w-2xl ${messages.length === 0 ? 'flex flex-col min-h-full pt-32 pb-8' : ''}`}>
          {messages.length === 0 && (
            <p className="font-instrument-sans font-medium text-foreground/90 text-4xl mb-6 text-center">
              Hey there. I&apos;m your Transit Assistant.
            </p>
          )}
          <MessageBar onMessage={onMessage} isGenerating={isGenerating} onStopGeneration={onStopGeneration} />
        </div>
      </div>
    </div>
  )
}
