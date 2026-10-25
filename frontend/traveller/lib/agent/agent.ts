import OpenAI from "openai"
import { tools as enTools, executeToolCall, type ToolCall } from "./tools"
import type { Language } from "@/lib/i18n"
import { en } from "@/lib/translations/en"
import { si } from "@/lib/translations/si"
import { ta } from "@/lib/translations/ta"

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b"
const LLM_TIMEOUT_MS = 120000
const TOOL_TIMEOUT_MS = 30000
const MAX_ROUNDS = 10
const MAX_RETRIES = 3

const ENV_KEYS = (process.env.GROQ_API_KEYS || "")
  .split(",")
  .map(k => k.trim())
  .filter(k => k.length > 0)

const GROQ_KEYS = ENV_KEYS.length > 0 ? ENV_KEYS : [
  "gsk_REDACTED",
]

let keyIndex = 0
let cachedClient: OpenAI | null = null

function getClient(): OpenAI {
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length]
  keyIndex++
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: key,
      baseURL: "https://api.groq.com/openai/v1",
      maxRetries: 0,
    })
  }
  cachedClient.apiKey = key
  return cachedClient
}

function getTranslations(lang?: string) {
  switch (lang) {
    case "si": return si
    case "ta": return ta
    default: return en
  }
}

export interface StreamEvent {
  type: "text" | "thinking" | "thinking_append" | "thinking_complete" | "tool_call" | "tool_result" | "error" | "done"
  content?: string
  id?: string
  name?: string
  arguments?: Record<string, unknown>
  result?: string
  isError?: boolean
  status?: string
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function* agentStream(
  history: { role: "user" | "assistant"; content: string }[],
  token?: string,
  lang?: string,
): AsyncGenerator<StreamEvent> {
  const t = getTranslations(lang)

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: t.agent.systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ]

  let rounds = 0

  while (rounds < MAX_ROUNDS) {
    rounds++

    let stream: AsyncIterable<any> | null = null
    let lastError: string | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        yield { type: "text", content: t.agent.retrying(attempt + 1, MAX_RETRIES) }
        await sleep(1000 * Math.pow(2, attempt - 1))
      }
      try {
        const llmAbort = new AbortController()
        const llmTimeout = setTimeout(() => llmAbort.abort(), LLM_TIMEOUT_MS)

        const client = getClient()
        stream = await (client.chat.completions.create as any)({
          model: MODEL,
          messages: apiMessages,
          tools: enTools.map((t2) => ({
            type: "function" as const,
            function: {
              name: t2.name,
              description: t2.description,
              parameters: t2.parameters,
            },
          })),
          stream: true,
          reasoning_format: "parsed",
        }, { signal: llmAbort.signal })

        clearTimeout(llmTimeout)
        break
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Unknown error"
        if (e instanceof Error && e.name === "AbortError") {
          lastError = "LLM request timed out"
        }
        if (attempt === MAX_RETRIES - 1) {
          yield { type: "error", error: t.agent.llmFailed(MAX_RETRIES, lastError) }
          yield { type: "done" }
          return
        }
      }
    }

    if (!stream) {
      yield { type: "error", error: "Failed to create LLM stream" }
      yield { type: "done" }
      return
    }

    let currentThinkingId = ""
    let hasCompletedThinking = false
    let accumulatedContent = ""
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map()
    let finishedReason: string | null = null

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta
        const finish = chunk.choices?.[0]?.finish_reason as string | null | undefined
        if (finish) finishedReason = finish

        if (delta?.reasoning) {
          if (!currentThinkingId) {
            currentThinkingId = `think_${Date.now()}_${rounds}`
            hasCompletedThinking = false
            yield { type: "thinking", id: currentThinkingId, content: delta.reasoning, status: "pending" }
          } else {
            yield { type: "thinking_append", id: currentThinkingId, content: delta.reasoning }
          }
        }

        if (delta?.content) {
          if (currentThinkingId && !hasCompletedThinking) {
            yield { type: "thinking_complete", id: currentThinkingId }
            hasCompletedThinking = true
          }
          accumulatedContent += delta.content
          yield { type: "text", content: delta.content }
        }

        if (delta?.tool_calls) {
          if (currentThinkingId && !hasCompletedThinking) {
            yield { type: "thinking_complete", id: currentThinkingId }
            hasCompletedThinking = true
          }
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0
            if (!pendingToolCalls.has(index)) {
              pendingToolCalls.set(index, {
                id: tc.id ?? "",
                name: tc.function?.name ?? "",
                args: tc.function?.arguments ?? "",
              })
            } else {
              const existing = pendingToolCalls.get(index)!
              if (tc.id) existing.id = tc.id
              if (tc.function?.name) existing.name = tc.function.name
              if (tc.function?.arguments) existing.args += tc.function.arguments
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stream error"
      yield { type: "error", error: t.agent.streamError(msg) }
      yield { type: "done" }
      return
    }

    const assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "assistant",
      content: accumulatedContent || null,
    }

    if (pendingToolCalls.size > 0) {
      const toolCalls: ToolCall[] = []
      for (const [, ptc] of pendingToolCalls) {
        let parsed: Record<string, unknown> = {}
        try {
          parsed = JSON.parse(ptc.args || "{}")
        } catch {
          parsed = {}
        }
        toolCalls.push({
          id: ptc.id,
          name: ptc.name,
          arguments: parsed,
        })
      }

      const toolCallsPayload = toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      }))

      ;(assistantMessage as any).tool_calls = toolCallsPayload
      apiMessages.push(assistantMessage)

      for (const tc of toolCalls) {
        yield { type: "tool_call", id: tc.id, name: tc.name, arguments: tc.arguments }
      }

      for (const tc of toolCalls) {
        let result: { role: "tool"; tool_call_id: string; content: string }
        try {
          result = await toolCallWithTimeout(tc, token, TOOL_TIMEOUT_MS)
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : t.agent.toolFailed
          result = {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: errMsg }),
          }
        }
        apiMessages.push(result)
        yield { type: "tool_result", id: tc.id, result: result.content, isError: result.content.startsWith('{"error":') }
      }
    } else {
      apiMessages.push(assistantMessage)
      if (finishedReason === "length") {
        yield { type: "text", content: t.agent.truncated }
      }
      break
    }
  }

  if (rounds >= MAX_ROUNDS) {
    yield { type: "error", error: t.agent.maxRounds(MAX_ROUNDS) }
  }

  yield { type: "done" }
}

async function toolCallWithTimeout(
  tc: ToolCall,
  token: string | undefined,
  timeoutMs: number,
): Promise<{ role: "tool"; tool_call_id: string; content: string }> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Tool '${tc.name}' timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([
      executeToolCall(tc, token),
      timeoutPromise,
    ])
    return result
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

export { agentStream as agentStream }
