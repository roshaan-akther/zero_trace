import OpenAI from "openai"
import { tools, executeToolCall, type ToolCall } from "./tools"

function getClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  })
}

const SYSTEM_PROMPT = `You are a friendly transit travel assistant for Colombo, Sri Lanka. You help travellers plan bus and train journeys.

AVAILABLE ROUTES:
- Route 138: Pettah → Kottawa (bus, 18.6km, 9 stops)
- Route 100: Pettah → Piliyandala (bus, 26km, 10 stops)
- Route 177: Fort → Moratuwa (bus, 18km, 9 stops)
- Coast Line: Colombo Fort → Galle (train, 112km, 12 stations)
- Three-wheeler connectors (short local trips)

TOOLS:
- resolve_stop: Search stops by name
- get_eta: Get vehicle ETA at a stop
- get_fare / get_route: Get journey info between two stops on a route
- get_service_alerts: Check advisories
- present_plan: Show the final plan (call this LAST)

IMPORTANT - INFO GATHERING:
When a user asks to plan a trip, you MUST collect ALL of these before presenting a plan:
1. Where are they starting from? (which stop/area)
2. Where do they want to go? (which stop/area)
3. When do they want to travel? (optional but helpful)
4. How do they want to travel? (bus/train/three-wheeler)

If the user gives a vague query like "plan a trip" or "help me get somewhere", DO NOT guess. Ask specific clarifying questions to get the missing information. For example:
- "Where are you starting from?"
- "Where would you like to go?"
- "Would you like to travel by bus, train, or three-wheeler?"

Use resolve_stop to look up stop names the user mentions, then use get_eta/get_fare/get_route with the actual stop IDs and route IDs.

After gathering all data, call present_plan with the complete plan. Include accurate route names, stop names, duration, fare breakdown, steps, and any relevant alerts. Do NOT write out the plan in text after calling present_plan.`

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

    const stream = await (getClient().chat.completions.create as any)({
      model: "qwen/qwen3-32b",
      messages: apiMessages,
      tools: tools.map((t: any) => ({
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

    let currentThinkingId = ""
    let hasCompletedThinking = false
    let accumulatedContent = ""
    const pendingToolCalls: Map<number, { id: string; name: string; args: string }> = new Map()

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta

      if (delta?.reasoning) {
        if (!currentThinkingId) {
          currentThinkingId = `think_${Date.now()}_${rounds}`
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
        yield { type: "tool_call", id: tc.id, name: tc.name, arguments: tc.arguments }
      }

      for (const tc of toolCalls) {
        const result = await executeToolCall(tc)
        apiMessages.push(result)
        yield { type: "tool_result", id: tc.id, result: result.content, isError: false }
      }
    } else {
      apiMessages.push(assistantMessage)
      break
    }
  }

  yield { type: "done" }
}
