const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function setToken(token: string) {
  localStorage.setItem("token", token)
}

export function clearToken() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export function getUser(): { id: string; email: string; name: string; type: string } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("user")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setUser(user: { id: string; email: string; name: string; type: string }) {
  localStorage.setItem("user", JSON.stringify(user))
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }

  return data as T
}

export interface User {
  id: string
  email: string
  name: string
  type: string
  created_at: string
}

export interface AuthResponse {
  user: User
  token: string
}

export function signup(email: string, password: string, name: string, type: string) {
  return request<AuthResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name, type }),
  })
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function getMe() {
  return request<User>("/api/v1/auth/me")
}

export interface GPSPoint {
  lat: number
  lng: number
  speed_mps: number
  time: string
}

export function sendGPS(lat: number, lng: number, speedMPS: number) {
  return request<{ status: string }>("/api/v1/driver/gps", {
    method: "POST",
    body: JSON.stringify({ lat, lng, speed_mps: speedMPS }),
  })
}

export function getGPSHistory(since?: string) {
  const query = since ? `?since=${encodeURIComponent(since)}` : ""
  return request<{ points: GPSPoint[] }>(`/api/v1/driver/gps/history${query}`)
}

export interface Advisory {
  id: string
  user_id: string
  route_id: string
  title: string
  body: string
  severity: string
  created_at: string
  read: boolean
}

export function getAdvisories() {
  return request<{ advisories: Advisory[] }>("/api/v1/driver/advisories")
}

export function markAdvisoryRead(advisoryID: string) {
  return request<{ status: string }>(`/api/v1/driver/advisories/${advisoryID}/read`, {
    method: "POST",
  })
}

export interface RouteInfo {
  id: string
  name: string
  vehicle_type: string
  stops: number
  length_m: number
  length_km: number
  active_vehicles?: number
}

export function getRoutes() {
  return request<{ routes: RouteInfo[] }>("/api/v1/routes")
}

export function getRouteDetail(routeID: string) {
  return request<any>(`/api/v1/routes/${routeID}`)
}

export function getRouteStops(routeID: string) {
  return request<{ route_id: string; stops: any[] }>(`/api/v1/routes/${routeID}/stops`)
}

export function getHeadway(routeID: string) {
  return request<{ route_id: string; vehicles: any[] }>(`/api/v1/headway?route_id=${encodeURIComponent(routeID)}`)
}

export function getStatus() {
  return request<{ vehicles_tracked: number; routes_monitored: number; total_routes: number }>("/api/v1/status")
}

export function getNearbyVehicles(lat: number, lng: number, radiusKM = 100) {
  return request<{ vehicles: any[] }>(`/api/v1/vehicles/nearby?lat=${lat}&lng=${lng}&radius=${radiusKM}`)
}

export interface VehicleInfo {
  id: string
  plate_number: string
  vehicle_type: string
  route_id: string
  driver_id: string
}

export function getMyVehicle() {
  return request<{ vehicle: VehicleInfo }>("/api/v1/driver/vehicle").catch(() => null)
}
