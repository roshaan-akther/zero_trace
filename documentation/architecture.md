# AGENTRIX — System Architecture

## Overview

Three-layer architecture solving Sri Lanka's public transport coordination problem.

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: AGENT LAYER                    │
│  Passenger Agent | Driver Agent | NTC Dashboard Agent      │
│  (Reads from Layer 2 APIs, applies NLU/NLG for interface)  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ reads
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 2: DYNAMIC TIMETABLE ENGINE       │
│  GPS Ingestion → Map Matching → State Vector → ETA/Headway │
│  (Deterministic. In-memory. No DB. No cache.)              │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ writes (GPS pings)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: ROUTE GRAPH                     │
│  Static geometry: routes, stops, polylines, fares           │
│  (Loaded once. Rarely changes.)                             │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: Route Graph (The Data Layer)

### Purpose
The static foundation of the entire system. Defines the physical network geometry — which roads/tracks exist, where stops are, and how they connect.

### Key Design Decisions

**Why hardcoded Go data instead of database/JSON?**
- Zero startup time (no file loading, no parsing)
- Compile-time validation (types, bounds, structure)
- Single source of truth in code
- JSON export generated for frontend consumption

**Why GTFS-inspired but not GTFS?**
- GTFS is designed for static schedules, not dynamic state
- Our system treats schedule as a real-time projection, not a file
- We reuse GTFS concepts (routes, stops, shapes, trips) but simplify

### Data Structures

```go
// A GPS coordinate pair
type LatLng struct {
    Lat float64
    Lng float64
}

// A stop along a route with precomputed distance
type Stop struct {
    ID             string  // unique stop identifier
    Name           string  // human-readable name
    Lat, Lng       float64 // GPS position
    DistanceAlongM float64 // meters from route start (precomputed)
}

// A single route (bus line, train line, or three-wheeler corridor)
type Route struct {
    ID            string      // e.g., "138", "100", "coast-line"
    Name          string      // human-readable name
    VehicleType   VehicleType // bus | train | three_wheeler
    Polyline      []LatLng    // ordered GPS points forming the path
    Stops         []Stop      // ordered stops along the route
    TotalLengthM  float64     // precomputed polyline length
    AvgSpeedMPS   float64     // typical speed for ETA fallback
    Capacity      int         // passenger capacity
}

// The complete route graph container
type RouteGraph struct {
    Routes       map[string]*Route
    StopsByID    map[string]*Stop
    StopsByRoute map[string][]*Stop
}
```

### Routes (6 total)

| ID | Type | From → To | Length | Stops | Polyline Pts | Avg Speed |
|----|------|-----------|--------|-------|-------------|-----------|
| `138` | Bus | Pettah → Kottawa (High Level Rd) | 18.6 km | 9 | 33 | 32 km/h |
| `100` | Bus | Pettah → Panadura (Galle Rd) | 26.1 km | 10 | 40 | 29 km/h |
| `177` | Bus | Kollupitiya → Kaduwela | 18.1 km | 9 | 35 | 31 km/h |
| `coast-line` | Train | Colombo Fort → Galle | 112.1 km | 12 | 72 | 79 km/h |
| `tw-pettah-fort` | 3W | Pettah → Fort | 0.5 km | 2 | 5 | 25 km/h |
| `tw-wellawatta-dehiwala` | 3W | Wellawatta → Dehiwala | 2.4 km | 2 | 6 | 29 km/h |

### Key Algorithms

#### Distance Precomputation (on `AddRoute`)
1. **Polyline distance**: Sum of haversine distances between consecutive polyline points
2. **Stop projection**: For each stop, find the nearest polyline segment and project the stop onto it. This gives `DistanceAlongM` — the accurate distance from the route's start point.

```go
func precomputePolylineDistances(r *Route)
func precomputeStopDistances(r *Route)
func projectStopOntoPolyline(s *Stop, polyline []LatLng) float64
```

#### Map Matching (point-to-segment projection)
Used by the engine (Layer 2) to snap raw GPS to route distance:

```go
func projectPointOntoSegment(a, b, p LatLng) float64
// Returns distance along segment [a,b] where point p projects.
// t = (ap·ab) / (ab·ab), then dist = t * |ab|
func pointSegmentDistance(a, b, p LatLng) float64
// Returns perpendicular distance from p to segment [a,b].
```

#### ETA Calculation
```go
func (r *Route) ETAForStop(stopIndex int, distanceAlongM float64, speedMPS float64) float64
// remaining = stops[stopIndex].DistanceAlongM - distanceAlongM
// if remaining < 0: already past this stop → return 0
// if speed < 0.5: vehicle stopped → return +Inf
// else: return remaining / speedMPS
```

---

## Layer 2: Dynamic Timetable Engine (Planned)

### GPS Ingestion
- `POST /telemetry` accepts `{vehicle_id, route_id, lat, lng, speed_mps, heading, timestamp}`
- Stateless endpoint — ~3300 req/s for 10K vehicles

### Map Matcher
- Snap raw GPS to nearest point on route polyline
- Outlier rejection (speed > 30 m/s, coordinates outside Sri Lanka)
- Low-pass filter on distance to smooth GPS jitter

### State Vector
- In-memory `map[string]VehicleState` — ~3 MB for 10K vehicles
- Key states: `distance_m`, `speed_mps`, `last_ping_time`, `confidence`

### Derived Quantities
- **ETA**: `(stop.distance - vehicle.distance) / vehicle.speed` (with dwell adjustment)
- **Headway**: Sort vehicles by distance on same route → compute gaps
- **Crowding**: `dwell_time > 30s` at stop → infer crowding

---

## Layer 3: Agents (Planned)

### Passenger Agent
- NLU: Sinhala/Tamil/English → structured query `{origin, destination, budget}`
- Planner: Query Layer 2 for ETAs + fare calculator → rank options
- NLG: Structured output → natural language in user's language

### Driver Agent
- Reads headway from Layer 2
- Hysteresis-based alerting: if gap < 300m → "slow down", if > 2.5km → "proceed faster"

### NTC Dashboard Agent
- Historical aggregation from Layer 2 logs
- Overcrowded routes, gap hotspots, peak load patterns

---

## Fare Structure

Based on NTC March 2026 revision. Simplified to a stage formula:

| Service Type | Base Fare | Per Stage (0.8 km) |
|-------------|-----------|-------------------|
| Normal | Rs. 30 | Rs. 9 |
| Semi-Luxury | Rs. 50 | Rs. 14 |
| Luxury | Rs. 80 | Rs. 22 |
| Super Luxury | Rs. 100 | Rs. 30 |
| Three-Wheeler | Rs. 100 (1st km) | Rs. 85 (additional) |

---

## File Structure

```
backend/
├── go.mod
├── go.sum
├── data/
│   ├── route-graph.json          # Full graph JSON (22 KB)
│   └── fare-table.json           # Fare lookup table
├── cmd/
│   └── datagen/
│       └── main.go               # Graph builder + JSON exporter
└── internal/
    ├── graph/
    │   ├── types.go              # Core types + algorithms
    │   ├── graph.go              # RouteGraph container
    │   ├── routes.go             # initRoutes() — route registry
    │   ├── route138.go           # Route 138 (bus)
    │   ├── route100.go           # Route 100 (bus)
    │   ├── route177.go           # Route 177 (bus)
    │   ├── coastline.go          # Coast Train Line
    │   ├── twroutes.go           # 3-wheeler routes
    │   └── graph_test.go         # 4 tests
    └── fare/
        ├── calculator.go         # Fare formulas
        └── calculator_test.go    # 4 tests

frontend/
├── package.json                  # Next.js 16 + Tailwind 4
├── app/
│   ├── layout.tsx                # Root layout (Geist font)
│   ├── page.tsx                  # Default landing page
│   └── globals.css               # Tailwind + CSS vars
└── (Next.js scaffold — to be replaced with transport UI)

documentation/
└── architecture.md               # This file
```

## Running the Data Layer

```bash
cd backend
go test ./...
go run ./cmd/datagen/
```

Output: JSON files in `data/` + printed summary with integrity checks.
