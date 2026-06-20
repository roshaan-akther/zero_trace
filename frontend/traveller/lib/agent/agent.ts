import OpenAI from "openai"
import { tools, executeToolCall, type ToolCall } from "./tools"

function getClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  })
}

const SYSTEM_PROMPT = `You are a friendly and helpful transit travel assistant for the city transit system. You help travellers plan journeys using public transit.

You have access to the following tools:
- resolve_stop: Search for transit stops by name
- get_eta: Get next vehicle arrival time at a stop
- get_fare: Get fare between two stops
- get_route: Get route suggestions between stops
- get_service_alerts: Get current service alerts

Always use tools to gather real data before making suggestions. Be conversational and concise. If a user asks for something vague, ask clarifying questions.

When suggesting a route, include the line name, estimated duration, and any transfer information. Mention service alerts if relevant.

Work step by step. First think about what information you need, gather it using tools, then present a complete answer.`

export interface StreamEvent {
  type: "thought_start" | "thinking" | "text" | "tool_call" | "tool_result" | "round_end" | "done" | "error"
  content?: string
  callId?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: string
  error?: string
}

export async function* agentStream(
  history: { role: "user" | "assistant"; content: string }[],
): AsyncGenerator<StreamEvent> {
  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ]

  let rounds = 0
  const MAX_ROUNDS = 10

  while (rounds < MAX_ROUNDS) {
    rounds++

    yield { type: "thought_start" }

    const stream = await (getClient().chat.completions.create as any)({
      model: "qwen/qwen3-32b",
      messages: apiMessages,
      tools: tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      stream: true,
      reasoning_format: "parsed",
    })

    let accumulatedContent = ""
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map()

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta

      if (delta?.reasoning) {
        yield { type: "thinking", content: delta.reasoning }
      }

      if (delta?.content) {
        accumulatedContent += delta.content
        yield { type: "text", content: delta.content }
      }

      if (delta?.tool_calls) {
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

    const assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "assistant",
      content: accumulatedContent || null,
    }

    if (pendingToolCalls.size > 0) {
      const toolCalls: ToolCall[] = []
      for (const [, ptc] of pendingToolCalls) {
        toolCalls.push({
          id: ptc.id,
          name: ptc.name,
          arguments: JSON.parse(ptc.args || "{}"),
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
        yield { type: "tool_call", callId: tc.id, toolName: tc.name, toolArgs: tc.arguments }
      }

      for (const tc of toolCalls) {
        const result = await executeToolCall(tc)
        apiMessages.push(result)
        yield { type: "tool_result", callId: tc.id, toolName: tc.name, toolResult: result.content }
      }

      yield { type: "round_end" }
    } else {
      apiMessages.push(assistantMessage)
      break
    }
  }

  yield { type: "done" }
}
