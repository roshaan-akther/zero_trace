import { agentStream } from "@/lib/agent/agent"

const REQUEST_TIMEOUT_MS = 130000
const encoder = new TextEncoder()

function sse(data: object | string): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data)
  return encoder.encode(`data: ${payload}\n\n`)
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse({ type: "error", error: "Invalid JSON in request body" }))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    })
  }

  const { messages, token, lang } = body as { messages?: unknown; token?: string; lang?: string }

  if (!Array.isArray(messages) || messages.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse({ type: "error", error: "Messages array is required and must not be empty" }))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    })
  }

  const timeoutId = setTimeout(() => {}, REQUEST_TIMEOUT_MS)

  const stream = new ReadableStream({
    async start(controller) {
      const timer = setTimeout(() => {
        controller.enqueue(sse({ type: "error", error: "Request timed out" }))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        try { controller.close() } catch {}
      }, REQUEST_TIMEOUT_MS)

      try {
        for await (const event of agentStream(messages as { role: "user" | "assistant"; content: string }[], token, lang as string)) {
          controller.enqueue(sse(event))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error"
        controller.enqueue(sse({ type: "error", error: errorMsg }))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      } finally {
        clearTimeout(timer)
        try { controller.close() } catch {}
      }
    },
  })

  clearTimeout(timeoutId)

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
