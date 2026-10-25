# Sri Lanka Public Transport Platform — Complete Project Documentation

> **Products:** TravelLanka (traveller web app) + DriveLanka (driver dashboard) + Timetable Engine (Go backend)
> **Scope:** Real-time bus / train / three-wheeler tracking, dynamic ETA and timetables, fare calculation, AI trip planning, driver advisories.
> **Repo layout:** `backend/` (Go), `frontend/traveller/`, `frontend/driver/`, `documentation/architecture.md`, demo video.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals and Users](#2-goals-and-users)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Repository Structure](#5-repository-structure)
6. [Backend — Overview](#6-backend--overview)
7. [Backend — Route Graph (Static Network Layer)](#7-backend--route-graph-static-network-layer)
8. [Backend — Timetable Engine (Real-Time Layer)](#8-backend--timetable-engine-real-time-layer)
9. [Backend — Fare Calculator](#9-backend--fare-calculator)
10. [Backend — Auth Service](#10-backend--auth-service)
11. [Backend — Vehicle Registry](#11-backend--vehicle-registry)
12. [Backend — Vehicle Simulator](#12-backend--vehicle-simulator)
13. [Backend — User API (Plans, GPS, Advisories)](#13-backend--user-api-plans-gps-advisories)
14. [Backend — Entrypoints and Data Files](#14-backend--entrypoints-and-data-files)
15. [Complete HTTP API Reference](#15-complete-http-api-reference)
16. [Data Models](#16-data-models)
17. [Route Network Catalogue](#17-route-network-catalogue)
18. [Frontend — Shared Foundations](#18-frontend--shared-foundations)
19. [Frontend — Traveller App (TravelLanka)](#19-frontend--traveller-app-travellanka)
20. [Frontend — Driver App (DriveLanka)](#20-frontend--driver-app-drivelanka)
21. [AI Travel Assistant](#21-ai-travel-assistant)
22. [Internationalization](#22-internationalization)
23. [Authentication Flows](#23-authentication-flows)
24. [End-to-End Data Flows](#24-end-to-end-data-flows)
25. [Configuration and Environment Variables](#25-configuration-and-environment-variables)
26. [Local Setup and Running](#26-local-setup-and-running)
27. [Testing](#27-testing)
28. [Operational Notes](#28-operational-notes)
29. [Limitations and Future Work](#29-limitations-and-future-work)

---

## 1. Project Overview

This is a full-stack public-transport coordination platform for Sri Lanka.

**What it does:**

- Maintains a static model of bus, train, and three-wheeler routes, stops, and geometries.
- Ingests live vehicle GPS pings, snaps them to routes (map matching), and maintains a live in-memory state vector per vehicle.
- Derives real-time ETAs, headways (gaps between vehicles), journey options, fares, and nearby-vehicle search.
- Exposes this through a Go HTTP API consumed by two Next.js frontends.
- Provides an AI chat assistant for travellers (multilingual, tool-calling) that resolves stops, checks ETAs/fares/alerts, and presents a structured travel plan with map.
- Provides a driver dashboard with route progress, speed, headway trend chart, upcoming stops, and advisories.
- Supports user accounts (traveller / driver), saved travel plans, driver GPS history, and service advisories.
- Ships with a deterministic traffic simulator so the system works live without real GPS hardware.

**Products:**

| Product | Directory | Port (dev) | Audience |
|---|---|---|---|
| Timetable Engine API | `backend/` | `8080` | Both frontends, integrations |
| TravelLanka traveller app | `frontend/traveller/` | `3010` | Passengers |
| DriveLanka driver dashboard | `frontend/driver/` | `3020` | Drivers |

---

## 2. Goals and Users

**Problems addressed:**

1. Static schedules do not reflect where buses/trains actually are.
2. Passengers cannot reliably estimate arrival time, fare, or best route.
3. Drivers have no visibility into gaps ahead/behind them (bunching).
4. Information needs to work in English, Sinhala, and Tamil.

**Users:**

- **Travellers:** search stops, view live timetables, chat with AI planner, save/confirm plans, see nearby vehicles and fares.
- **Drivers:** sign in, auto-linked to a vehicle/route, send GPS, monitor headway, speed, progress, upcoming stops, receive advisories.

Non-goals in current code: payments, ticketing, admin/NTC analytics UI, push notifications, native mobile apps.

---

## 3. System Architecture

Three logical layers:

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION: Traveller App + Driver Dashboard + AI Agent  │
│  Next.js 16, React 19, Tailwind 4, shadcn, Leaflet, SSE     │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API + REAL-TIME ENGINE (Go, in-memory, stateless routes)  │
│  Telemetry → Map Match → State Vector → ETA / Headway /    │
│  Journey / Nearby + Auth + Plans + GPS history + Advisories │
└─────────────────────────────────────────────────────────────┘
                              │ reads on boot
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STATIC NETWORK: Route Graph + Fare Table                   │
│  Hardcoded Go data, precomputed distances, JSON exports     │
└─────────────────────────────────────────────────────────────┘
         + Postgres (users + sessions only)
         + In-process simulator (synthetic GPS)
```

**Key design choices (as implemented):**

- Static network is hardcoded in Go (`routes_gen.go`), not in a database. Distances are precomputed on `AddRoute`. JSON exports in `backend/data/` are generated artifacts for inspection/frontend use.
- Real-time state is purely in-memory (`StateVector`: `map[vehicleID] → VehicleState` + `map[routeID] → map[vehicleID]`). No DB, no cache layer. Stale vehicles cleaned by background goroutine.
- Postgres stores only `users` and `sessions`. All transport state is ephemeral.
- Simulator emits synthetic telemetry directly into `Engine.ProcessTelemetry`, so live ETAs work without hardware.
- AI agent lives in the traveller frontend (`lib/agent/` + `app/api/agent/route.ts`), calling the same backend APIs as tools via LLM function-calling.

---

## 4. Technology Stack

**Backend:**

- Go `1.25.10`, module `github.com/agentrix/backend`
- `github.com/jackc/pgx/v5 v5.10.0` (Postgres driver, `pgx/stdlib`)
- `github.com/joho/godotenv v1.5.1` (loads `.env`)
- Stdlib only otherwise: `net/http` (`ServeMux`), `encoding/json`, `sync`, `time`, `crypto/hmac/sha256`
- Compiled artifacts present: `backend/engine` (~15M), `backend/datagen` (~2.7M)

**Frontend (both apps):**

- Next.js `16.2.9` (App Router), React `19.2.4`, TypeScript `5`
- Tailwind CSS `4` (`@tailwindcss/postcss`), `tw-animate-css`, `shadcn` `4.11.0`, `radix-ui`, `@base-ui/react`
- `lucide-react`, `sonner`, `recharts` (driver charts), `date-fns`, `embla-carousel`, `input-otp`, `react-resizable-panels`, `vaul`, `next-themes` (traveller)
- Traveller extra: `leaflet` + `react-leaflet` + `@types/leaflet`, `openai` SDK (used against Groq endpoint), `react-markdown` + `remark-gfm`
- Package manager: `pnpm` (`pnpm-lock.yaml`, `pnpm-workspace.yaml`)
- Fonts: `Google_Sans`, `Nunito_Sans`, `Instrument_Sans`, `Montserrat` via `next/font/google`

**Data/infra:**

- Postgres (required for auth; connection via `DATABASE_URL`)
- No Redis, no message queue, no object storage in code.

---

## 5. Repository Structure

Excluding `node_modules/`, `.next/`, `.git/`:

```
.
├── DOCUMENTATION / PROJECT_DOCUMENTATION (this file)
├── documentation/architecture.md
├── backend/
│   ├── go.mod / go.sum
│   ├── cmd/engine/main.go          # API server entrypoint
│   ├── cmd/datagen/main.go         # verification + JSON exporter
│   ├── data/route-graph.json       # generated (22 KB)
│   ├── data/fare-table.json        # generated (2.1 KB)
│   ├── engine / datagen            # compiled binaries (not source)
│   └── internal/
│       ├── graph/types.go          # LatLng, Stop, Route, matching math
│       ├── graph/graph.go          # NewDefaultGraph + Summarize
│       ├── graph/routes.go         # initRoutes -> buildRoutesFromData
│       ├── graph/routes_gen.go     # 130+ places, 31 base routes, TW + train
│       ├── graph/graph_test.go
│       ├── engine/engine.go        # Telemetry, StateVector, ETA/Journey/Headway
│       ├── engine/api.go           # /telemetry, /eta, /headway, /routes, /status
│       ├── engine/engine_test.go
│       ├── fare/calculator.go
│       ├── fare/calculator_test.go
│       ├── auth/auth.go, api.go, context.go, db.go, auth_test.go
│       ├── registry/registry.go
│       ├── simulator/simulator.go, simulator_test.go
│       └── userapi/api.go          # plans, GPS, advisories, nearby, driver vehicle
├── frontend/traveller/  (port 3010)
│   ├── app/page.tsx, layout.tsx, globals.css
│   ├── app/auth/login|signup/page.tsx, auth/layout.tsx
│   ├── app/api/agent/route.ts      # SSE bridge to LLM
│   ├── components/homeshell.tsx, chat-ui.tsx, message-bar.tsx
│   ├── components/app-header.tsx, app-sidebar.tsx
│   ├── components/plan-panel.tsx, routes-panel.tsx, dynamic-timetable-panel.tsx
│   ├── components/realtime-panel.tsx, route-map.tsx, travel-plan-card.tsx
│   ├── components/thinking-block.tsx, tool-call-block.tsx
│   ├── components/theme-provider.tsx, shiny-text.tsx, language-switcher.tsx
│   ├── components/ui/* (56 files, shadcn + animated-shiny-text)
│   ├── lib/agent/agent.ts, lib/agent/tools.ts
│   ├── lib/api.ts, lib/i18n.tsx, lib/translations/en|si|ta.ts, types.ts
│   ├── lib/utils.ts, hooks/use-mobile.ts
│   └── next.config.ts, tsconfig.json, components.json, package.json, etc.
└── frontend/driver/ (port 3020)
    ├── app/page.tsx (dashboard), layout.tsx, globals.css
    ├── app/auth/login|signup/page.tsx, auth/layout.tsx
    ├── components/language-switcher.tsx
    ├── components/ui/* (55 files, shadcn)
    ├── lib/api.ts, lib/i18n.tsx, lib/translations/en|si|ta.ts
    ├── lib/utils.ts, hooks/use-mobile.ts
    └── next.config.ts, tsconfig.json, components.json, package.json, etc.
```

UI component counts verified: `driver/components/ui` = 55 files, `traveller/components/ui` = 56 files (superset + `animated-shiny-text.tsx`). Otherwise identical shadcn boilerplate.

Binaries / media not source-read: `agentrix-prevailstars_DemoVideo.webm` (WebM, 15M), `backend/engine`, `backend/datagen` (Linux ELF).

---

## 6. Backend — Overview

Go module: `github.com/agentrix/backend`, Go `1.25.10`.

Packages:

| Package | Responsibility |
|---|---|
| `internal/graph` | Static network: types, distance math, route catalogue |
| `internal/engine` | Live state + derived quantities + public transport endpoints |
| `internal/fare` | Stage-based fare formulas |
| `internal/auth` | Signup/login/tokens/middleware/Postgres |
| `internal/registry` | In-memory vehicle ↔ driver ↔ route index |
| `internal/simulator` | Synthetic vehicles feeding the engine |
| `internal/userapi` | Authenticated traveller/driver product APIs |
| `cmd/engine` | Wiring + HTTP mux + middleware + startup |
| `cmd/datagen` | Integrity checks + JSON export |

Concurrency: `StateVector`, `registry.Store`, and `userapi.Server` maps guarded by `sync.RWMutex`. Background goroutines: state cleanup, session cleanup, simulator ticker.

---

## 7. Backend — Route Graph (Static Network Layer)

Source: `backend/internal/graph/`.

### 7.1 Types (`types.go`)

```go
type LatLng struct { Lat, Lng float64 }
type Stop struct {
  ID string; Name string; Lat, Lng float64; DistanceAlongM float64
}
type VehicleType string // "bus" | "train" | "three_wheeler"
type Route struct {
  ID string; Name string; VehicleType VehicleType
  Polyline []LatLng; Stops []Stop
  TotalLengthM float64; AvgSpeedMPS float64; Capacity int
}
type RouteGraph struct {
  Routes map[string]*Route
  StopsByID map[string]*Stop       // not serialized
  StopsByRoute map[string][]*Stop  // not serialized
}
```

JSON tags: `distance_m`, `total_length_m`, `avg_speed_mps`, `vehicle_type`.

### 7.2 Core algorithms

- `Haversine(a,b)`: great-circle meters, R=6371000.
- `precomputePolylineDistances`: cumulative haversine length → `TotalLengthM`.
- `precomputeStopDistances`: for each stop, `MatchPoint(polyline, stop)` → `DistanceAlongM`.
- `ProjectPointOntoSegment` / `PointSegmentDistance`: planar projection in degree space for along-track fraction + haversine perpendicular distance.
- `MatchPoint(polyline, point) → (distanceM, confidence)`:
  - Iterates segments, clamps projection to `[0, segLen]`, tracks nearest perpendicular distance.
  - `confidence = 1 - min(perpDist/100, 1)`. 0m → 1.0, ≥100m → 0.0.
- `InterpolatePosition(polyline, distanceM)`: walks segments by haversine length, linear interpolation in lat/lng.
- `Route.ETAForStop(stopIndex, distanceAlongM, speedMPS)`:
  - `speed < 0.5` → `+Inf`; bad index → `+Inf`; `remaining < 0` → `0`; else `remaining/speed`.
- `Route.FareForDistance(km)`: legacy normal-fare helper (base 30 + 9/stage, 0.8km stages). Real fare logic lives in `internal/fare`.

### 7.3 Construction

- `NewRouteGraph()` + `AddRoute()` (normalizes nil slices, precomputes, indexes).
- `NewDefaultGraph()` → `initRoutes(g)` → `buildRoutesFromData(g)` in `routes_gen.go`.
- `Summarize()`: counts, total distance, routes by type.
- Accessors: `GetRoute`, `GetStop`, `StopsForRoute`, `RouteCount`, `StopCount`.

### 7.4 Route data (`routes_gen.go`)

`_places`: ~130 named points with lat/lng (Colombo metro, Galle Road, High Level Road, suburbs, airport corridor).

`_routeDefs`: 31 base bus routes built from place-ID sequences. Polyline is auto-interpolated between stops (3–5 points per leg by leg length). Stops get IDs like `138-s1 … 138-sN`.

Three-wheeler: 8 corridors, built both directions (16 routes).
Train: Coast Line built explicitly with 72-point polyline + 12 stations, both directions (2 routes).
Reverse bus routes: every base bus route duplicated as `<id>-rev` with reversed stops.

Total routes in memory: `31 + 31 + 2 + 16 = 80`. Tests assert `≥60` routes, `≥1000` stops, `≥30` bus, `≥1` train, `≥8` three-wheeler.

Speeds (`AvgSpeedMPS`) and capacities are per-route constants (e.g. bus 7–10 m/s, train 22 m/s, TW 7–8 m/s; bus 50–75 seats, train 800, TW 3).

See §17 for full ID catalogue.

---

## 8. Backend — Timetable Engine (Real-Time Layer)

Source: `backend/internal/engine/engine.go`, `api.go`.

### 8.1 Ingestion: `ProcessTelemetry`

Input (`Telemetry`):

```json
{
  "vehicle_id": "bus-138-01",
  "route_id": "138",
  "lat": 6.933211, "lng": 79.855435,
  "speed_mps": 9.0, "heading": 0,
  "timestamp": "2026-…"
}
```

Validation (outlier rejection):

1. `speed_mps > 30` → error.
2. Outside Sri Lanka bbox `lat 5.9–9.9, lng 79.6–81.9` → error.
3. Unknown `route_id` → error.
4. `MatchPoint` confidence `< 0.2` (>80m off route) → error.

On success:

- Finds `nextStopIdx`: first stop with `DistanceAlongM > distanceM + 20`.
- Computes ETA to that stop (Inf if stopped).
- `states.Update(...)` and returns `{status, vehicle_id, distance_m, confidence, next_stop_id/name, eta_s}`.

### 8.2 StateVector

```go
type VehicleState {
  VehicleID, RouteID, DistanceM, SpeedMPS, Heading,
  Lat, Lng, Confidence, LastPingTime, NextStopIdx
}
```

- `Update`: handles route changes (removes from old route index).
- `Get`, `GetByRoute`, `Remove`, `Snapshot` (copies), `Stats() (vehicles, routes)`.
- `Cleanup(staleAge)`: drops vehicles older than cutoff.
- `StartCleanup(interval, staleAge)`: ticker goroutine. Server uses `30s / 5min`.

### 8.3 Derived quantities

**ETA — `GetETA(routeID, stopID)`:**

- Skips vehicles already at/past stop (`distanceM >= stopDist - 20`), stopped/Inf vehicles.
- Returns `[{vehicle_id, distance_m, speed_mps, eta_s, confidence}]`.

**Journey — `GetJourney(routeID, fromStopID, toStopID)`:**

- Validates both stops exist and `fromIdx < toIdx`, else nil.
- `distanceKM = (to-from)/1000`.
- For each approaching vehicle: `etaFrom`, `etaTo`, `travelTime = etaTo-etaFrom`, `totalTime = etaTo`.
- Attaches fare map for all 5 service classes (via `internal/fare`).
- Returns `{from_stop, to_stop, distance_km, fare, options[]}`.

**Headway — `GetHeadway(routeID)`:**

- Requires ≥2 vehicles, sorts by `DistanceM` (insertion sort), computes consecutive gaps.
- Skips stopped lead vehicles. `gap_s = gap_m / leadSpeed`.
- Returns `[{vehicle_id, distance_m, next_vehicle_id, next_distance_m, gap_m, forward_speed_mps, gap_s}]`.

### 8.4 HTTP surface (engine)

Registered via `NewServer(eng).RegisterRoutesOn(mux)`:

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/telemetry` | open |
| GET | `/api/v1/eta?route_id=&stop_id=` | open |
| GET | `/api/v1/eta/journey?route_id=&from_stop=&to_stop=` | open* |
| GET | `/api/v1/headway?route_id=` | open |
| GET | `/api/v1/routes` | open |
| GET | `/api/v1/routes/:id` and `/routes/:id/stops` | open |
| GET | `/api/v1/status` | open |

`*` Journey handler itself does not enforce auth, but server middleware (see §14) may require it depending on path prefix matching. In current `needsAuth`, `/api/v1/eta` prefix covers `/eta/journey` as open.

Body limit 64KB, CORS `*`, JSON errors as `{"error": "..."}`.

---

## 9. Backend — Fare Calculator

Source: `backend/internal/fare/calculator.go`.

Stage model: `stages = ceil(km / 0.8)`, min 1 stage.

| Service | Base | Per extra stage |
|---|---|---|
| Normal | 30 | 9 |
| Semi-Luxury | 50 | 14 |
| Luxury | 80 | 22 |
| Super Luxury | 100 | 30 |

`ThreeWheeler(km)`: 100 for first km, +85 per commenced extra km (`100 + ceil(km-1)*85`).

Examples from tests / generated table:

- Normal: 0.8km→30, 1.0km→39, 5km→84, 10km→138
- Semi: 1km→64, 10km→218; Luxury 1km→102; TW 2km→185, 5km→440
- Generated `fare-table.json` contains samples for 1,2,3,5,10,15,20,30,50 km (bus) and 0.5–10 km (TW).

---

## 10. Backend — Auth Service

Source: `backend/internal/auth/`.

### 10.1 Users

```go
type UserType string // "traveller" | "driver" | "ntc"
type User { ID, Email, Name, Type, Hash, Salt, CreatedAt }
```

- `Signup(email,password,name,type)`: only `traveller`/`driver` allowed (`ntc` rejected). Validates email contains `@`, password ≥6 chars, unique email. `salt=hex(16B)`, `hash=SHA256(salt+password+salt)`, `id="user-"+hex(8B)`. Inserts into `users`, creates token.
- `Login(email,password)`: compares hash, creates token.
- `GetUser`, `GetUserByEmail`.

### 10.2 Tokens

Custom HMAC token (not JWT library):

- `payload = JSON{uid, typ, exp(+72h)}`, `token = hex(payload) + "." + hex(HMAC_SHA256(payload, random32BKey))`.
- Key is generated per-process in `NewStore` (`rand.Read(32)`), so tokens invalidate on restart — important operational note.
- `ValidateToken`: format, hex, JSON, expiry, HMAC compare, user-exists check.
- Sessions also inserted into `sessions(token, user_id, user_type, expires_at)`.

### 10.3 HTTP + middleware

`Server{store, vehicles VehicleRegistrar}`:

- `POST /api/v1/auth/signup {email,password,name,type, vehicle?}` → `201 {user,token,vehicle?}`. If `vehicle` present and registrar wired, registers vehicle + assigns driver.
- `POST /api/v1/auth/login {email,password}` → `200 {user,token}`.
- `GET /api/v1/auth/me` (auth required) → `User`.
- `Middleware(store,next)`: requires `Authorization: Bearer <token>`, injects user ID/type into context.
- `RequireType`, `UserIDFromContext`, `UserTypeFromContext` helpers.

### 10.4 Postgres (`db.go`)

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  type TEXT NOT NULL, hash TEXT NOT NULL, salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  user_type TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
```

`OpenDB` uses `pgx/stdlib`, pool 25/5, 5min lifetime. `StartSessionCleanup` deletes expired sessions hourly.

Tests in `auth_test.go` require `DATABASE_URL`, else skip.

---

## 11. Backend — Vehicle Registry

Source: `backend/internal/registry/registry.go`.

In-memory:

```go
type Vehicle { ID, PlateNumber, VehicleType, RouteID, DriverID, Seats }
```

Indexes by ID, plate, driver, route. `Register(plate, vehicleType, routeID)` → ID `veh-<plate>`. `AssignDriver(vehicleID, driverID)`.

`SeedDemoData(authStore, graph)`: for each route, finds/creates `driver@demo.com`, `driverN@demo.com` (`demo123`), registers `DEMO-<routeID>`, assigns driver. Prints count.

`Nearby(lat,lng,radiusKM, graph, eng)`:

- Snapshots engine states, haversine-filters by radius.
- Joins to registry by plate/route, attaches route name, next stop + ETA, `last_ping` as `HH:MM:SS`.
- Used by `GET /vehicles/nearby`.

---

## 12. Backend — Vehicle Simulator

Source: `backend/internal/simulator/simulator.go`.

Purpose: generate plausible live traffic without hardware.

- `RouteConfig{HeadwayMin/Max, DwellMin/Max, SpeedFactor, InitCount}` per route, generated by `generateConfigs`:
  - Major bus (`138,100,101,177,120,154` prefixes): headway 5–12min, init 3 (+1 if >30km); other bus 10–20min, init 2; reverse init 1.
  - Train: 20–40min, dwell 30–60s, init 1.
  - Three-wheeler: 1–3min, no dwell, init 3 (2 reverse).
- `Start()`: randomizes spawn timers, spawns `InitCount` vehicles per route with speed `Avg*(0.8–1.2)` and distance offset.
- `Tick()` (1 simulated second): moves each vehicle `distance += speed`, dwells at stops (speed 0 until `dwellUntil`), spawns due routes, removes finished vehicles.
- `emitTelemetry`: `InterpolatePosition` + ±~5m noise, `ProcessTelemetry` (errors ignored).
- `Run(speedMul)` ticker `1s/speedMul`; `RunAsync` in goroutine. Server starts with `sim-speed` flag default `10.0` (0 disables).
- `SetConfig` allows tests to override.

---

## 13. Backend — User API (Plans, GPS, Advisories)

Source: `backend/internal/userapi/api.go`. All routes require auth via server middleware (see §14/§15), except `/vehicles/nearby` which is open.

In-memory stores (no Postgres): `plans[userID]`, `gpsHistories[userID]` (capped 10k), `advisories[userID]`, counters.

**Travel plans:**

- `POST /api/v1/plans {route_id, from_stop_id, to_stop_id}` → validates stops on route, `from<to`, fare from `GetJourney` (normal), creates `plan-<n> {id,user_id,from_*,to_*,route_*,distance_km,fare,finalized:false,created_at}` → 201.
- `POST /api/v1/plans/finalize {plan_id}` → marks finalized.
- `GET /api/v1/plans/history?finalized=true` → list.

**Driver GPS:**

- `POST /api/v1/driver/gps {lat,lng,speed_mps}` → appends `{lat,lng,speed_mps,time:now}`.
- `GET /api/v1/driver/gps/history?since=RFC3339` → list (filtered if `since`).

**Advisories:**

- `GET /api/v1/driver/advisories` → list.
- `POST /api/v1/driver/advisories {route_id,title,body,severity(info default)}` → `adv-<n>`.
- `POST /api/v1/driver/advisories/:id/read` → marks read.

**Driver routes / vehicle / nearby:**

- `GET /api/v1/driver/routes` → all routes + `active_vehicles` count.
- `GET /api/v1/driver/routes/:id` and `.../stops` → detail.
- `GET /api/v1/driver/vehicle` → vehicle by driver ID or 404.
- `GET /api/v1/vehicles/nearby?lat=&lng=&radius=` (radius km, default 100) → `{vehicles,lat,lng,radius_km}`.

---

## 14. Backend — Entrypoints and Data Files

### `cmd/engine/main.go` (port `PORT` or `8080`)

1. Parses `-sim-speed` (default 10.0).
2. `godotenv.Load()`, `DATABASE_URL` or `postgresql://postgres:postgres@localhost:5432/agentrix?sslmode=disable`.
3. `OpenDB` + `MigrateDB` + `StartSessionCleanup`.
4. `graph.NewDefaultGraph()`, `engine.New(g)`, `StartCleanup(30s,5m)`.
5. Optional simulator `RunAsync`.
6. `auth.NewStore/NewServer`, `userapi.NewServer`, `registry.NewStore().SeedDemoData(...)`, wiring `WithVehicleRegistrar/WithRegistry`.
7. Mux: `/auth/*` (CORS), engine routes, userapi routes; wrapped in `authMiddleware` + logging.
8. Prints banner with route/stop/distance counts, serves.

`authMiddleware`: open paths (exact or prefix): `/auth/signup`, `/auth/login`, `/telemetry`, `/routes`, `/eta`, `/headway`, `/status`, `/vehicles/nearby`. Everything else → `auth.Middleware`.

CORS: `*`, `GET,POST,OPTIONS`, `Content-Type,Authorization`. `OPTIONS` short-circuits 200. Logging middleware logs method/path/status/duration.

### `cmd/datagen/main.go`

Verification CLI: prints route table, stop details, fare samples, integrity checks (≥2 polyline/stops, length ≥100m, non-negative/monotonic stop distances), exits non-zero on fail, writes `data/route-graph.json` + `data/fare-table.json`.

### Data files

- `backend/data/route-graph.json` (22KB): full `{routes: {id: {id,name,vehicle_type,polyline,stops,total_length_m,avg_speed_mps,capacity}}}`.
- `backend/data/fare-table.json` (2.1KB): `{normal,semi_luxury,luxury,super_luxury,three_wheeler: [{km,fare}]}`.

---

## 15. Complete HTTP API Reference

Base: `http://localhost:8080`. Errors: `{"error":"..."}`. Auth (where required): `Authorization: Bearer <token>`.

### 15.1 Auth

**POST `/api/v1/auth/signup` (open)**
```json
// request
{"email":"a@x.com","password":"secret1","name":"A","type":"traveller",
 "vehicle":{"plate_number":"ABC-123","vehicle_type":"bus","route_id":"138"}}
// 201 response
{"user":{"id":"user-…","email":"a@x.com","name":"A","type":"traveller","created_at":"…"},
 "token":"hex.hex","vehicle":{…}}
```

**POST `/api/v1/auth/login` (open)** `{email,password}` → `200 {user,token}`, `401` on bad credentials.

**GET `/api/v1/auth/me` (auth)** → `200 User`.

### 15.2 Live engine (open)

**POST `/api/v1/telemetry`**
```json
{"vehicle_id":"bus-138-01","route_id":"138","lat":6.933211,"lng":79.855435,"speed_mps":9.0}
// 200
{"status":"ok","vehicle_id":"bus-138-01","distance_m":12.3,"confidence":0.99,
 "next_stop_id":"138-s2","next_stop_name":"…","eta_s":123.4}
```
400 on outlier/unknown route/low confidence. Timestamp optional (defaults now).

**GET `/api/v1/eta?route_id=138&stop_id=138-s28`** → `200 {route_id,stop_id,vehicles:[{vehicle_id,distance_m,speed_mps,eta_s,confidence}]}`; 404 if route/stop unknown (nil result).

**GET `/api/v1/eta/journey?route_id=138&from_stop=138-s5&to_stop=138-s28`** → `200 {from_stop,to_stop,distance_km,fare:{normal,semi_luxury,luxury,super_luxury,three_wheeler},options:[{vehicle_id,eta_from_s,travel_time_s,total_time_s}]}`; 404 if invalid/reversed.

**GET `/api/v1/headway?route_id=138`** → `200 {route_id,vehicles:[{vehicle_id,distance_m,next_vehicle_id,next_distance_m,gap_m,forward_speed_mps,gap_s}]}`; 404 if unknown or <2 vehicles.

**GET `/api/v1/routes`** → `200 {routes:[{id,name,vehicle_type,stops,length_m,length_km,avg_speed_mps,capacity}]}`.

**GET `/api/v1/routes/:id`** → full `{id,name,vehicle_type,stops,polyline,total_length_m,avg_speed_mps,capacity}`. **GET `/api/v1/routes/:id/stops`** → `{route_id,stops}`.

**GET `/api/v1/status`** → `{vehicles_tracked,routes_monitored,total_routes}`.

### 15.3 Product API (auth except nearby)

- `POST /api/v1/plans`, `POST /api/v1/plans/finalize`, `GET /api/v1/plans/history`
- `POST /api/v1/driver/gps`, `GET /api/v1/driver/gps/history`
- `GET+POST /api/v1/driver/advisories`, `POST /api/v1/driver/advisories/:id/read`
- `GET /api/v1/driver/routes`, `GET /api/v1/driver/routes/:id[/stops]`
- `GET /api/v1/driver/vehicle`
- `GET /api/v1/vehicles/nearby?lat=&lng=&radius=` (open, default radius 100km)

See §13 for shapes. All POST bodies limited to 64KB.

---

## 16. Data Models

**Graph:** `LatLng`, `Stop{id,name,lat,lng,distance_m}`, `Route{id,name,vehicle_type,polyline,stops,total_length_m,avg_speed_mps,capacity}`.

**Engine:** `Telemetry`, `TelemetryResponse`, `VehicleState`, `ETAEntry`, `HeadwayEntry`, `JourneyOption`, `JourneyResult{from_stop,to_stop,distance_km,fare,options}`.

**Auth:** `User{id,email,name,type,created_at}`, sessions server-side.

**Registry:** `Vehicle{id,plate_number,vehicle_type,route_id,driver_id,seats}`, `NearbyVehicle{vehicle,route_name,lat,lng,distance_m,confidence,speed_mps,last_ping,next_stop_name,eta_s}`.

**User API:** `TravelPlan{id,user_id,from_stop_id/name,to_stop_id/name,route_id/name,distance_km,fare,finalized,created_at}`, `GPSPoint{lat,lng,speed_mps,time}`, `Advisory{id,user_id,route_id,title,body,severity,created_at,read}`.

**Agent plan (frontend):** `{from_stop,to_stop,route,duration_minutes,fare?,depart_at?,arrive_at?,transfers?[{from,to,at}],steps?[{instruction,duration_min?}],alerts?[{severity,title,description}]}`.

---

## 17. Route Network Catalogue

31 base bus definitions (each also has `-rev` reverse):

| ID | Name | Corridor |
|---|---|---|
| 138 | Pettah → Kottawa (High Level Rd) | High-Level Rd |
| 138-homagama | Pettah → Homagama | High-Level Rd ext |
| 138-maharagama | Pettah → Maharagama | High-Level Rd short |
| 138-2 | Pettah → Mattegoda | via Kottawa |
| 138-4 | Pettah → Athurugiriya | via Rukmalgama |
| 138-3 | Pettah → Rukmalgama | High-Level Rd |
| 100 | Pettah → Panadura (Galle Rd) | Coastal |
| 100-moratuwa | Pettah → Moratuwa (Galle Rd) | Coastal short |
| 101 | Pettah → Moratuwa (via Slave Is.) | Galle Rd alt |
| 154-kiribathgoda | Kiribathgoda → Angulana | Cross-town |
| 154-kadawatha | Kadawatha → Bambalapitiya | Cross-town short |
| 120-horana | Pettah → Horana (High Level Rd) | Southern |
| 120-kesbewa | Pettah → Kesbewa | Southern short |
| 120-piliyandala | Pettah → Piliyandala | Southern short |
| 141 | Narahenpita → Wellawatte | Short cross-town |
| 135 | Kohuwala → Kelaniya | Cross-town |
| 122-avissawella | Pettah → Avissawella | Avissawella Rd |
| 122-ratnapura | Pettah → Ratnapura | Long intercity |
| 125-padukka | Pettah → Padukka | Padukka Rd |
| 125-ingiriya | Pettah → Ingiriya | Ingiriya Rd |
| 177 | Kollupitiya → Kaduwela | Battaramulla Rd |
| 155-soysapura | Soysapura → Mattakkuliya | Coastal long |
| 155-mtlavinia | Mt. Lavinia → Mattakkuliya | Coastal long |
| 140 | Kollupitiya → Wellampitiya | Short |
| 175 | Kollupitiya → Kohilawatte | Short |
| 119 | Dehiwala → Maharagama | Cross-town |
| 174 | Kottawa → Borella | Cross-town |
| 163 | Dehiwala → Battaramulla | Cross-town |
| 176 | Karagampitiya → Hettiyawatte | Nawala loop |
| 103 | Narahenpita → Fort | Borella-Maradana |
| 187 | Fort → Airport | Airport express |

Train (2): `coast-line` (Colombo Fort → Galle, 12 stations, 72 pts, 22 m/s, 800 cap), `coast-line-rev`.

Three-wheeler (16 = 8×2 with `-rev`): `tw-pettah-fort`, `tw-wellawatta-dehiwala`, `tw-kollupitiya-bambalapitiya`, `tw-bambalapitiya-wellawatta`, `tw-maradana-borella`, `tw-nugegoda-maharagama`, `tw-kirulapone-nugegoda`, `tw-dehiwala-mtlavinia`.

Place bank: ~130 stops (Pettah, Fort Station, Galle Face, Kollupitiya, Bambalapitiya, Wellawatte, Dehiwala, Mt. Lavinia, Nugegoda, Maharagama, Kottawa, Kaduwela, Moratuwa, Panadura, Horana, Avissawella, Airport, etc.).

---

## 18. Frontend — Shared Foundations

Both apps:

- App Router, `app/layout.tsx` + `app/page.tsx` + `app/auth/*`, `app/globals.css` (Tailwind 4 + shadcn tokens, light/dark CSS vars).
- Path alias `@/*`, `lib/utils.ts` (`cn` via `clsx`+`tailwind-merge`), `hooks/use-mobile.ts` (768px breakpoint).
- `lib/api.ts`: `API_BASE = NEXT_PUBLIC_API_URL || http://localhost:8080`, localStorage `token`/`user`, `request()` with Bearer header, typed helpers. Driver version lacks plan/ETA helpers; traveller version adds `createPlan/finalizePlan/getPlanHistory/getRouteETA/getNearbyVehicles`.
- `lib/i18n.tsx`: `en|si|ta`, localStorage `agentrix-language`, `I18nProvider/useI18n`.
- `components/language-switcher.tsx`: English/සිංහල/தமிழ் dropdown.
- `components.json`: shadcn `radix-luma`, neutral, CSS vars, lucide.
- Config: `next.config.ts` (empty), `tsconfig.json` (bundler, `@/*`), `eslint.config.mjs` (next vitals+TS), `postcss.config.mjs` (tailwind), `.gitignore` (node/next/env), `pnpm-workspace.yaml` (allow sharp/unrs-resolver).

---

## 19. Frontend — Traveller App (TravelLanka)

Port `3010` (`PORT=3010 next dev`). Title: *TravelLanka - AI Travel Planner*.

### Pages

- `/` (`app/page.tsx`): guards `token` + `user.type==="traveller"`, else `/auth/login`; renders `HomeShell`.
- `/auth/login`, `/auth/signup` (`type="traveller"`), centered Card with show/hide password, error box, links.

### Shell (`homeshell.tsx` + `app-sidebar` + `app-header` + `chat-ui`)

- `PanelContext`: `isPlanPanelOpen (50vw right drawer)`, `isRoutesPanelOpen`, `isTimetablePanelOpen`.
- `AppSidebar`: icon-collapsible, persisted `traveller-sidebar-state`, New Chat (reload `/`).
- `AppHeader`: user name, language, Live button (`RealtimePanel`), Routes/Timetable/Plan toggles (mutually exclusive), overflow menu, sign out.
- `ChatUI`: SSE-driven messages (`Message{id,role,content,events?,timestamp}`), thinking/tool-call grouping per round, Markdown+GFM rendering, copy button, auto-scroll if at bottom, empty-state welcome + `MessageBar`.
- `MessageBar`: collapsed pill ↔ expanded textarea, Enter-send, global key focus, clipboard paste, Web Speech API mic (en-US, continuous/interim) if supported, stop-generation button.

### Panels

- `PlanPanel`: parses `planResult` JSON, resolves route ID fuzzily (`routeMapRef` from `getRoutes`), loads polyline/stops via `getRouteDetail`, shows `TravelPlanCard` + Leaflet `RouteMap` (OSM tiles, A/B markers, fitBounds) + Confirm (finds stops by name → `createPlan` → `finalizePlan`). Errors for invalid/unknown route/stop.
- `RoutesPanel`: lists all routes with bus/train/🔶 icons, counts.
- `DynamicTimetablePanel`: route list → detail → parallel `getRouteETA` per stop (10s refresh), timeline UI with min ETA, vehicle counts, `Due/s/m/h` formatting.
- `RealtimePanel`: geolocation (fallback Colombo 6.9271,79.8612) → `getNearbyVehicles(…,100km)` filtered `confidence≥0.2`, 10s refresh, plate/type/next-stop/ETA/distance/last-ping.
- `TravelPlanCard`: header route + from→to + depart/arrive, badges (duration/fare/transfers), numbered steps, transfers, severity-colored alerts.

### Agent wiring

- `app/api/agent/route.ts`: validates `{messages,token,lang}`, proxies `agentStream` as `text/event-stream` with `[DONE]`, 130s timeout.
- See §21 for LLM/tools.

---

## 20. Frontend — Driver App (DriveLanka)

Port `3020`. Title: *DriveLanka - Driver Dashboard*. No AI, no map, no traveller plan APIs.

`app/page.tsx` (525 lines):

- Guard `user.type==="driver"`, loads assigned vehicle (`getMyVehicle` → `route_id`, fallback `138`), browser geolocation.
- `fetchData` every 5s: `getRoutes`, `getRouteDetail(selected)`, `getHeadway(selected)`, `getAdvisories`, `getStatus`; `sendGPS(lat,lng,headwaySpeed)` if located.
- Derives speed (km/h), distance, progress %, next stop + ETA (local calc), headway history (last 30 points for chart).
- Layout: shadcn `Sidebar` (route shortcuts top 5, progress, quick stats: speed/headway/stops/vehicles, sign out) + `SidebarInset` header (route name, Live/ahead badges, language) + 4 stat Cards + headway AreaChart (recharts) + route progress/upcoming stops + advisories (click unread → `markAdvisoryRead` + refetch).

Auth pages mirror traveller but `type="driver"`, bus icon, driver copy.

---

## 21. AI Travel Assistant

Only in traveller app. Files: `lib/agent/agent.ts`, `lib/agent/tools.ts`, `app/api/agent/route.ts`.

**Model:** `GROQ_MODEL` or `qwen/qwen3-32b` via Groq OpenAI-compatible `https://api.groq.com/openai/v1`. Keys: `GROQ_API_KEYS` comma-separated or two built-in fallback keys (rotated per call, `maxRetries:0` in SDK, manual retry in code). Timeouts: LLM 120s, tool 30s, request 130s. `MAX_ROUNDS=10`, `MAX_RETRIES=3` with exponential backoff + localized retry notice. `reasoning_format:"parsed"` for `delta.reasoning`.

**Tools (6):**

| Tool | Args | Backend call |
|---|---|---|
| `resolve_stop` | `query` | `GET /routes` + `GET /routes/:id/stops` (5min cache), substring + scoring (exact +50, prefix +10, id-prefix +5) → top 10 |
| `get_eta` | `route_id, stop_id` | `GET /eta?...` |
| `get_fare` / `get_route` | `route_id, from_stop_id, to_stop_id` | `GET /eta/journey?...` |
| `get_service_alerts` | `route_id?` | `GET /driver/advisories` (auth forwarded), optional filter |
| `present_plan` | `from_stop,to_stop,route,duration_minutes,fare?,depart_at?,arrive_at?,transfers?,steps?,alerts?` | local echo (rendered as card) |

All fetches 10s abort timeout, errors as `{"error":…}` / `{"info":…}` JSON strings.

**System prompt (all languages, English shown):** Colombo assistant, lists 4 example routes + TW, mandates collecting origin/destination/mode (and optionally time) before planning, forbids guessing on vague queries (ask clarifying questions), requires `resolve_stop` → IDs → ETA/fare/route, then `present_plan` LAST with real names/fares, no duplicate text plan after.

**Streaming protocol (SSE `data: {...}` / `[DONE]`):** `thinking` → `thinking_append`* → `thinking_complete`, `text` deltas, `tool_call{id,name,arguments}`, `tool_result{id,result,isError}`, `error{error}`, `done`. Frontend reconstructs tool history for multi-turn context and opens PlanPanel on `present_plan` result.

---

## 22. Internationalization

Three locales: `en`, `si` (Sinhala), `ta` (Tamil). Driver has flat `driver/auth/app` keys; traveller has typed `Translations` (`app/nav/chat/plan/realtime/routes/timetable/auth/driver/agent/tools/common`) with function entries (`retrying`, `llmFailed`, etc. localized).

Examples: welcome — EN *“Hey there. I'm TravelLanka…”*, SI *“ආයුබෝවන්…”*, TA *“வணக்கம்…”*; timetable units, auth labels, agent prompts (system prompt currently English in all locales, status messages localized).

---

## 23. Authentication Flows

1. Signup (`traveller` or `driver`) → `{user,token}` → localStorage → `/`.
2. Login → same.
3. `getMe` / `HandleMe` validates session.
4. All product calls attach `Bearer`. Backend validates HMAC + expiry + user existence.
5. Driver signup may include `vehicle{plate_number,vehicle_type,route_id}` → registry + driver link.
6. Sign out = `clearToken()` + redirect. No refresh tokens; tokens die on server restart (in-memory HMAC key).

---

## 24. End-to-End Data Flows

**A. AI trip plan:** user chat → SSE → `resolve_stop` (find IDs) → `get_route`/`get_eta`/`get_service_alerts` → `present_plan` → right-drawer card + map → Confirm → `POST /plans` + `/finalize` → history.

**B. Live timetable:** select route → `GET /routes/:id` → parallel `GET /eta?route&stop` per stop → render ETAs, 10s refresh.

**C. Nearby buses:** geolocate → `GET /vehicles/nearby?lat&lng&radius` → filter/display, 10s refresh.

**D. Driver shift:** login → `GET /driver/vehicle` → select route → loop `GET /headway` + `POST /driver/gps` + advisories → chart/progress/next-stop UI.

**E. Synthetic traffic:** simulator `Tick` → `ProcessTelemetry` → state → all reads reflect movement without hardware.

---

## 25. Configuration and Environment Variables

| Var | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | backend | `8080` | HTTP listen port |
| `DATABASE_URL` | backend (+ tests) | `postgresql://postgres:postgres@localhost:5432/agentrix?sslmode=disable` | Postgres DSN |
| `NEXT_PUBLIC_API_URL` | both frontends | `http://localhost:8080` | Backend base URL |
| `GROQ_API_KEYS` | traveller server | built-in two keys | Comma-separated LLM keys, rotated |
| `GROQ_MODEL` | traveller server | `qwen/qwen3-32b` | Chat model |
| `-sim-speed` | backend flag | `10.0` | Simulator multiplier, `0` disables |

No `.env` files committed (gitignored). `godotenv.Load()` silently allows missing file.

---

## 26. Local Setup and Running

**Prerequisites:** Go 1.25+, Node 20+ with pnpm, Postgres 14+, Groq key for AI (optional, fallback keys in code).

```bash
# 1. Database
createdb agentrix
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentrix?sslmode=disable"

# 2. Backend
cd backend
go test ./...
go run ./cmd/datagen/     # verifies + writes data/*.json
go run ./cmd/engine/      # :8080, simulator 10x
# or: go run ./cmd/engine/ -sim-speed 0  # no synthetic traffic

# 3. Traveller
cd frontend/traveller
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8080 GROQ_API_KEYS=… pnpm dev  # :3010

# 4. Driver
cd frontend/driver
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm dev  # :3020
```

Seed demo drivers auto-created on backend boot (one per route). Signup a traveller + driver via UIs to exercise plans/GPS/advisories.

---

## 27. Testing

- `backend/internal/graph/graph_test.go`: counts (≥60 routes/≥1000 stops), per-route invariants, stop ordering (200m tolerance), type buckets, `GetRoute/StopsForRoute/ETAForStop`.
- `engine/engine_test.go`: valid/outlier/unknown telemetry, ETA, completed-journey filtering, headway, state cleanup/route-change, journey planning + invalid, HTTP `telemetry/eta/routes/status`.
- `fare/calculator_test.go`: normal/semi/luxury/three-wheeler vectors.
- `auth/auth_test.go`: signup/login/duplicate/invalid-type/wrong-password/invalid-token/get-user (skips without `DATABASE_URL`).
- `simulator/simulator_test.go`: start/tick/movement/telemetry/spawn/completion/dwell.
- Run: `cd backend && go test ./...`. Datagen doubles as integrity gate (non-zero exit on fail).

Frontend: lint only (`eslint`), no unit tests in repo.

---

## 28. Operational Notes

- **State is ephemeral:** engine/registry/plans/GPS/advisories lost on restart; only users/sessions persist.
- **Keys rotate in-memory:** auth HMAC key regenerates per boot → all tokens invalid after deploy/restart.
- **Cleanup jobs:** vehicle states >5min (swept 30s), sessions hourly SQL delete.
- **Limits:** 64KB bodies, speed ≤30 m/s, confidence ≥0.2, SL bbox enforced, GPS history 10k/user, stops cache 5min, SSE 130s cap.
- **CORS/logging:** `*` CORS on all JSON, request logger (method/path/status/latency), `OPTIONS` fast-path.
- **Binaries:** `backend/engine`, `backend/datagen` are build artifacts; rebuild via `go build ./cmd/...`.
- **Maps:** OSM tiles, no key required. Charts: recharts. Markdown: GFM.

---

## 29. Limitations and Future Work

Current gaps (based strictly on code):

- No transfer routing across routes (journey is single-route only; `present_plan.transfers` is LLM-filled, not engine-computed).
- No schedule/history persistence, no analytics dashboard, no admin roles (`ntc` type exists but signup blocked, no UI).
- No push/websocket (polling 5–10s + SSE for chat only).
- Token invalidation on restart, no refresh flow, SHA256 password hash (no bcrypt/argon2), sessions table written but never read for validation.
- Simulator dwell uses wall-clock (`time.Now`) so `sim-speed` accelerates movement but not dwell waits; global `letterCounter` not mutex-protected.
- Agent fallback API keys hardcoded; system prompt route list (4 routes) is stale vs 80-route engine; `resolve_stop` fans out to N route detail calls (could be slow without cache warmup).
- Driver app has no map; traveller plan confirm requires exact/fuzzy stop-name match on single route.

Natural next steps: multi-leg routing, persistent plans/history, proper JWT + refresh + bcrypt, admin analytics, websockets, real GTFS import, hardware GPS ingestion hardening, mobile apps.

---

*Generated from full reads of all source files (backend Go, both Next.js apps, configs, data samples). Dependency directories (`node_modules`, `.next`), VCS (`.git`), and binary media were inventoried but not inline-read.*
