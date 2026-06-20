import { getRoutes, getRouteStops, getRouteDetail } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

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

let stopsCache: any[] | null = null

async function getAllStops(): Promise<any[]> {
  if (stopsCache) return stopsCache
  const res = await getRoutes()
  const allStops: any[] = []
  for (const r of res.routes) {
    try {
      const detail = await getRouteStops(r.id)
      for (const s of detail.stops) {
        allStops.push({ ...s, route_id: r.id, route_name: r.name })
      }
    } catch {}
  }
  stopsCache = allStops
  return allStops
}

async function apiFetch(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`)
  return res.json()
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

export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const args = toolCall.arguments
  let content: string

  switch (toolCall.name) {
    case "resolve_stop": {
      try {
        const query = (args.query as string).toLowerCase()
        const allStops = await getAllStops()
        const matches = allStops.filter((s: any) =>
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.route_name?.toLowerCase().includes(query)
        )
        content = JSON.stringify(matches.length > 0 ? matches.slice(0, 10) : { error: "No stops found matching query" })
      } catch (e) {
        content = JSON.stringify({ error: "Failed to search stops" })
      }
      break
    }

    case "get_eta": {
      try {
        const data = await apiFetch(`/api/v1/eta?route_id=${args.route_id}&stop_id=${args.stop_id}`)
        content = JSON.stringify(data)
      } catch (e) {
        content = JSON.stringify({ error: "Failed to fetch ETA" })
      }
      break
    }

    case "get_fare":
    case "get_route": {
      try {
        const data = await apiFetch(`/api/v1/eta/journey?route_id=${args.route_id}&from_stop=${args.from_stop_id}&to_stop=${args.to_stop_id}`)
        content = JSON.stringify(data)
      } catch (e) {
        content = JSON.stringify({ error: "Failed to fetch route/fare info" })
      }
      break
    }

    case "get_service_alerts": {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(`${API_BASE}/api/v1/driver/advisories`, { headers })
        const data = await res.json()
        if (args.route_id && data.advisories) {
          data.advisories = data.advisories.filter((a: any) => a.route_id === args.route_id)
        }
        content = JSON.stringify(data.advisories || [])
      } catch (e) {
        content = JSON.stringify([])
      }
      break
    }

    case "present_plan": {
      content = JSON.stringify(args)
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
