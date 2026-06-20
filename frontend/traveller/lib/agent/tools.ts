import { getRoutes, getRouteStops } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
const FETCH_TIMEOUT_MS = 10000
const CACHE_TTL_MS = 5 * 60 * 1000

interface StopsCacheEntry {
  data: any[]
  timestamp: number
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0
}

let stopsCache: StopsCacheEntry | null = null

async function getAllStops(): Promise<any[]> {
  const now = Date.now()
  if (stopsCache && now - stopsCache.timestamp < CACHE_TTL_MS) {
    return stopsCache.data
  }
  const res = await getRoutes()
  const allStops: any[] = []
  for (const r of res.routes) {
    try {
      const detail = await getRouteStops(r.id)
      for (const s of detail.stops) {
        allStops.push({ ...s, route_id: r.id, route_name: r.name })
      }
    } catch {
      /* skip route that fails */
    }
  }
  stopsCache = { data: allStops, timestamp: now }
  return allStops
}

async function apiFetch(path: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) {
      return { error: `API responded with status ${res.status}` }
    }
    return res.json()
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === "AbortError") {
      return { error: "Request timed out" }
    }
    return { error: "Network request failed" }
  }
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  role: "tool"
  tool_call_id: string
  content: string
}

export const tools: ToolDefinition[] = [
  {
    name: "resolve_stop",
    description: "Search for a transit stop by name across all routes (Route 138, Route 100, Route 177, Coast Line train, three-wheeler connectors). Returns matching stops with their IDs, route info, and coordinates.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The stop name or part of name to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_eta",
    description: "Get estimated arrival times for the next vehicles approaching a specific stop on a specific route.",
    parameters: {
      type: "object",
      properties: {
        route_id: { type: "string", description: "Route ID (e.g., '138', '100', '177', 'coast-line')" },
        stop_id: { type: "string", description: "Stop ID (e.g., '138-01' for Pettah on Route 138)" },
      },
      required: ["route_id", "stop_id"],
    },
  },
  {
    name: "get_fare",
    description: "Get fare information between two stops on a specific route. Returns fare breakdown by service type (Normal, Semi-Luxury, Luxury, Super Luxury, Three-Wheeler).",
    parameters: {
      type: "object",
      properties: {
        route_id: { type: "string", description: "Route ID" },
        from_stop_id: { type: "string", description: "Origin stop ID" },
        to_stop_id: { type: "string", description: "Destination stop ID" },
      },
      required: ["route_id", "from_stop_id", "to_stop_id"],
    },
  },
  {
    name: "get_route",
    description: "Get a suggested journey from origin to destination on a specific route. Returns distance, vehicles approaching, and fare info.",
    parameters: {
      type: "object",
      properties: {
        route_id: { type: "string", description: "Route ID" },
        from_stop_id: { type: "string", description: "Origin stop ID" },
        to_stop_id: { type: "string", description: "Destination stop ID" },
      },
      required: ["route_id", "from_stop_id", "to_stop_id"],
    },
  },
  {
    name: "get_service_alerts",
    description: "Get current service advisories and alerts for a specific route. If no route_id is specified, returns all alerts.",
    parameters: {
      type: "object",
      properties: {
        route_id: { type: "string", description: "Optional route ID to filter alerts" },
      },
    },
  },
  {
    name: "present_plan",
    description: "Present the final complete travel plan to the user. Call this as the LAST step with all gathered information. Include real route names, stop names, accurate duration, and fare from the data you collected. The plan will be rendered beautifully.",
    parameters: {
      type: "object",
      properties: {
        from_stop: { type: "string", description: "Departure stop name" },
        to_stop: { type: "string", description: "Destination stop name" },
        route: { type: "string", description: "Primary route name (e.g. 'Route 138', 'Coast Line')" },
        duration_minutes: { type: "number", description: "Estimated total travel time in minutes" },
        fare: { type: "string", description: "Cost of the trip, e.g. 'LKR 228'" },
        depart_at: { type: "string", description: "Recommended departure time or next vehicle time" },
        arrive_at: { type: "string", description: "Estimated arrival time" },
        transfers: {
          type: "array",
          description: "Transfer points along the route",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              at: { type: "string" },
            },
          },
        },
        steps: {
          type: "array",
          description: "Step-by-step journey instructions",
          items: {
            type: "object",
            properties: {
              instruction: { type: "string" },
              duration_min: { type: "number" },
            },
          },
        },
        alerts: {
          type: "array",
          description: "Relevant service alerts",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              title: { type: "string" },
              description: { type: "string" },
            },
          },
        },
      },
      required: ["from_stop", "to_stop", "route", "duration_minutes"],
    },
  },
]

export async function executeToolCall(toolCall: ToolCall, token?: string): Promise<ToolResult> {
  const args = toolCall.arguments
  let content: string

  switch (toolCall.name) {
    case "resolve_stop": {
      const query = isNonEmptyString(args.query) ? args.query.toLowerCase().trim() : ""
      if (!query) {
        content = JSON.stringify({ error: "Query is required" })
        break
      }
      try {
        const allStops = await getAllStops()
        const scored = allStops
          .filter((s: any) =>
            s.name?.toLowerCase().includes(query) ||
            s.id?.toLowerCase().includes(query) ||
            s.route_name?.toLowerCase().includes(query)
          )
          .map((s: any) => {
            const name = (s.name || "").toLowerCase()
            const id = (s.id || "").toLowerCase()
            let score = name.includes(query) ? 1 : 0
            if (name.startsWith(query)) score += 10
            if (name === query) score += 50
            if (id.startsWith(query)) score += 5
            if (s.route_name?.toLowerCase().includes(query)) score += 2
            return { ...s, _score: score }
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, 10)

        content = JSON.stringify(scored.length > 0 ? scored : { error: "No stops found matching query" })
      } catch (e) {
        content = JSON.stringify({ error: "Failed to search stops" })
      }
      break
    }

    case "get_eta": {
      if (!isNonEmptyString(args.route_id) || !isNonEmptyString(args.stop_id)) {
        content = JSON.stringify({ error: "route_id and stop_id are required" })
        break
      }
      try {
        const data = await apiFetch(`/api/v1/eta?route_id=${encodeURIComponent(args.route_id)}&stop_id=${encodeURIComponent(args.stop_id)}`, token)
        content = JSON.stringify(data)
      } catch (e) {
        content = JSON.stringify({ error: "Failed to fetch ETA" })
      }
      break
    }

    case "get_fare":
    case "get_route": {
      if (!isNonEmptyString(args.route_id) || !isNonEmptyString(args.from_stop_id) || !isNonEmptyString(args.to_stop_id)) {
        content = JSON.stringify({ error: "route_id, from_stop_id, and to_stop_id are required" })
        break
      }
      try {
        const data = await apiFetch(
          `/api/v1/eta/journey?route_id=${encodeURIComponent(args.route_id)}&from_stop=${encodeURIComponent(args.from_stop_id)}&to_stop=${encodeURIComponent(args.to_stop_id)}`,
          token,
        )
        content = JSON.stringify(data)
      } catch (e) {
        content = JSON.stringify({ error: "Failed to fetch route/fare info" })
      }
      break
    }

    case "get_service_alerts": {
      try {
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        const res = await fetch(`${API_BASE}/api/v1/driver/advisories`, { headers, signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) {
          content = JSON.stringify({ error: "No advisories available" })
          break
        }
        const data = await res.json()
        let advisories = data?.advisories || []
        if (isNonEmptyString(args.route_id)) {
          advisories = advisories.filter((a: any) => a.route_id === args.route_id)
        }
        content = JSON.stringify(advisories.length > 0 ? advisories : { info: "No active advisories for this route" })
      } catch (e) {
        content = JSON.stringify({ error: "Failed to fetch advisories" })
      }
      break
    }

    case "present_plan": {
      const plan: Record<string, unknown> = {}
      plan.from_stop = isNonEmptyString(args.from_stop) ? args.from_stop : "Unknown"
      plan.to_stop = isNonEmptyString(args.to_stop) ? args.to_stop : "Unknown"
      plan.route = isNonEmptyString(args.route) ? args.route : "Unknown"
      plan.duration_minutes = typeof args.duration_minutes === "number" && args.duration_minutes > 0
        ? Math.round(args.duration_minutes)
        : 0
      if (isNonEmptyString(args.fare)) plan.fare = args.fare
      if (isNonEmptyString(args.depart_at)) plan.depart_at = args.depart_at
      if (isNonEmptyString(args.arrive_at)) plan.arrive_at = args.arrive_at
      if (Array.isArray(args.transfers)) plan.transfers = args.transfers
      if (Array.isArray(args.steps)) plan.steps = args.steps
      if (Array.isArray(args.alerts)) plan.alerts = args.alerts
      content = JSON.stringify(plan)
      break
    }

    default:
      content = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` })
  }

  return {
    role: "tool" as const,
    tool_call_id: toolCall.id,
    content,
  }
}
