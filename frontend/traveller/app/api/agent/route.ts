import { agentStream } from "@/lib/agent/agent"

function sse(data: object | string): Uint8Array {
  const encoder = new TextEncoder()
  const payload = typeof data === "string" ? data : JSON.stringify(data)
  return encoder.encode(`data: ${payload}\n\n`)
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages array is required" }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of agentStream(messages)) {
          controller.enqueue(sse(event))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error"
        controller.enqueue(sse({ type: "error", error: errorMsg }))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
