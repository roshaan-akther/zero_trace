"use client"

import { useState, useEffect, useRef } from "react"
import { Wrench, ChevronDown, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import ShinyText from "@/components/shiny-text"
import { useI18n } from "@/lib/i18n"

interface ToolCallEvent {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: "pending" | "complete" | "error"
  result?: string
  isError?: boolean
}

interface Props {
  toolCall: ToolCallEvent
}

export function ToolCallBlock({ toolCall }: Props) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const pendingStartTimeRef = useRef<number | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [toolCall.result, isOpen])

  useEffect(() => {
    if (toolCall.status === "pending") {
      setIsOpen(true)
      autoOpenedRef.current = true
      pendingStartTimeRef.current = Date.now()
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    } else if ((toolCall.status === "complete" || toolCall.status === "error") && autoOpenedRef.current) {
      const elapsed = pendingStartTimeRef.current ? Date.now() - pendingStartTimeRef.current : 0
      const minDisplayTime = 1000
      const remainingTime = Math.max(0, minDisplayTime - elapsed)

      if (remainingTime > 0) {
        closeTimeoutRef.current = setTimeout(() => {
          setIsOpen(false)
          autoOpenedRef.current = false
          closeTimeoutRef.current = null
        }, remainingTime)
      } else {
        setIsOpen(false)
        autoOpenedRef.current = false
      }
      pendingStartTimeRef.current = null
    }
  }, [toolCall.status])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const args = JSON.stringify(toolCall.arguments, null, 2)

  return (
    <div className="mt-0 mb-2 rounded-xl overflow-hidden backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="w-full flex items-center gap-2.5 pl-2 pr-4 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 text-left"
      >
        <Wrench className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <div className="flex-1 truncate">
          {toolCall.status === "pending" ? (
            <ShinyText text={`${t.chat.using} ${toolCall.name}`} />
          ) : (
            <span className="font-medium text-sm text-muted-foreground/70 truncate">{t.chat.used} {toolCall.name}</span>
          )}
        </div>
        {toolCall.status === "pending" ? (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t.chat.using}
          </span>
        ) : toolCall.isError ? (
          <span className="text-xs text-destructive/80 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            {t.chat.failed}
          </span>
        ) : (
          <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            {t.chat.done}
          </span>
        )}
        <span className="shrink-0 ml-1">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />
          )}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div ref={contentRef} className="pr-4 py-3 space-y-2.5 overflow-y-auto max-h-80">
          <div>
            <p className="text-[11px] text-muted-foreground/50 mb-1.5 font-medium uppercase tracking-wider">{t.chat.input}</p>
            <div className="text-xs rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed bg-black/5 dark:bg-white/5">
              {args}
            </div>
          </div>

          {toolCall.result !== undefined && (
            <div>
              <p className="text-[11px] text-muted-foreground/50 mb-1.5 font-medium uppercase tracking-wider">
                {toolCall.isError ? t.chat.error : t.chat.output}
              </p>
              <div className={`text-xs rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed ${
                toolCall.isError ? "bg-destructive/10 text-destructive/90" : "bg-black/5 dark:bg-white/5"
              }`}>
                {toolCall.result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
