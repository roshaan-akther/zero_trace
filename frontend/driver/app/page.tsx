"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  Bus,
  Clock,
  Gauge,
  MapPin,
  AlertTriangle,
  Navigation,
  Users,
  Bell,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Circle,
} from "lucide-react"
import { getToken, getUser, clearToken, getRoutes, getRouteDetail, getHeadway, getAdvisories, markAdvisoryRead, sendGPS, getMyVehicle, getStatus } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

const POLL_INTERVAL = 5000

const headwayColors = {
  headway: { label: "Headway", color: "var(--chart-1)" },
}

export default function DriverDashboard() {
  const router = useRouter()
  const { t } = useI18n()
  const [ready, setReady] = useState(false)
  const [user, setUserState] = useState<{ id: string; email: string; name: string; type: string } | null>(null)
  const [selectedRoute, setSelectedRoute] = useState("")
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [stops, setStops] = useState<any[]>([])
  const [headwayVehicles, setHeadwayVehicles] = useState<any[]>([])
  const [advisories, setAdvisories] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [headwayHistory, setHeadwayHistory] = useState<any[]>([])
  const [speed, setSpeed] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentDistance, setCurrentDistance] = useState(0)
  const [nextStopName, setNextStopName] = useState("")
  const [nextStopETA, setNextStopETA] = useState(0)
  const [routes, setRoutes] = useState<any[]>([])
  const [error, setError] = useState("")
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const token = getToken()
    const u = getUser()
    if (!token || !u || u.type !== "driver") {
      router.replace("/auth/login")
      return
    }
    setUserState(u)
    setReady(true)

    getMyVehicle().then(veh => {
      if (veh?.vehicle?.route_id) {
        setSelectedRoute(veh.vehicle.route_id)
      }
    }).catch(() => {
      setSelectedRoute("138")
    })

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [router])

  const fetchData = useCallback(async () => {
    if (!selectedRoute) return
    try {
      const [r, rd, h, a, s] = await Promise.all([
        getRoutes(),
        getRouteDetail(selectedRoute).catch(() => null),
        getHeadway(selectedRoute).catch(() => null),
        getAdvisories(),
        getStatus(),
      ])
      setRoutes(r.routes)
      setRouteInfo(rd)
      setStops(rd?.stops || [])
      setAdvisories(a.advisories)
      setStatus(s)

      if (gpsLocation) {
        sendGPS(gpsLocation.lat, gpsLocation.lng, (h?.vehicles?.[0]?.forward_speed_mps) || 0).catch(() => {})
      }

      if (h?.vehicles && h.vehicles.length > 0) {
        setHeadwayVehicles(h.vehicles)
        const gapKM = (h.vehicles[0]?.gap_m || 0) / 1000
        setHeadwayHistory(prev => {
          const now = new Date()
          const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
          const next = [...prev, { time, headway: Math.round(gapKM * 10) / 10 }]
          if (next.length > 30) next.shift()
          return next
        })

        if (h.vehicles[0]?.forward_speed_mps) {
          setSpeed(Math.round(h.vehicles[0].forward_speed_mps * 3.6))
        }
        if (h.vehicles[0]?.distance_m) {
          const dist = h.vehicles[0].distance_m
          setCurrentDistance(dist)
          if (rd?.total_length_m) {
            setProgress(Math.round((dist / rd.total_length_m) * 100))
          }
        }
      }
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data")
    }
  }, [selectedRoute, gpsLocation])

  useEffect(() => {
    if (!ready) return
    fetchData()
    const iv = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(iv)
  }, [ready, fetchData])

  const findNextStop = useCallback(() => {
    if (!stops.length || !currentDistance) return
    for (const s of stops) {
      if (s.distance_m > currentDistance + 20) {
        setNextStopName(s.name)
        const remainingKM = (s.distance_m - currentDistance) / 1000
        const speedKMH = speed || 30
        const etaMin = Math.round((remainingKM / speedKMH) * 60)
        setNextStopETA(etaMin)
        return
      }
    }
    setNextStopName("Terminal")
    setNextStopETA(0)
  }, [stops, currentDistance, speed, t])

  useEffect(() => {
    findNextStop()
  }, [findNextStop])

  const handleSignOut = () => {
    clearToken()
    router.push("/auth/login")
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "DR"

  if (!ready) return null

  const upcomingStops = stops
    .filter(s => s.distance_m > (currentDistance || 0) + 20)
    .slice(0, 5)
    .map((s, i) => {
      const remainingKM = (s.distance_m - (currentDistance || 0)) / 1000
      const etaMin = Math.round((remainingKM / Math.max(speed, 20)) * 60)
      return { name: s.name, eta: `${etaMin} ${t.driver.min}`, status: i === 0 ? ("next" as const) : ("upcoming" as const) }
    })

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:!p-0">
                <Avatar size="lg" className="rounded-lg">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{user?.name || t.driver.driver}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t.driver.route}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {routes.slice(0, 5).map(r => (
                  <SidebarMenuItem key={r.id}>
                    <SidebarMenuButton
                      onClick={() => setSelectedRoute(r.id)}
                      data-active={r.id === selectedRoute}
                      className="data-[active=true]:bg-muted"
                    >
                      <Bus />
                      <span>{r.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{t.driver.routeProgress}</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 group-data-[collapsible=icon]:hidden">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{(currentDistance / 1000).toFixed(1)} km</span>
                  <span>{routeInfo ? (routeInfo.total_length_m / 1000).toFixed(1) : "?"} km</span>
                </div>
                <Progress value={progress} />
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span>{nextStopName || t.driver.unknown} · {nextStopETA} {t.driver.min} away</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{t.driver.quickStats}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Gauge />
                    <div className="flex w-full items-center justify-between">
                      <span>{t.driver.speed}</span>
                      <span className="text-xs text-muted-foreground">{speed} {t.driver.kmh}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Navigation />
                    <div className="flex w-full items-center justify-between">
                      <span>{t.driver.headway}</span>
                      <span className="text-xs text-muted-foreground">
                        {headwayVehicles[0] ? `${(headwayVehicles[0].gap_m / 1000).toFixed(1)} ${t.driver.km}` : t.driver.na}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Users />
                    <div className="flex w-full items-center justify-between">
                      <span>{t.driver.stops}</span>
                      <span className="text-xs text-muted-foreground">{stops.length} {t.driver.total}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Bus />
                    <div className="flex w-full items-center justify-between">
                      <span>{t.driver.vehicles}</span>
                      <span className="text-xs text-muted-foreground">{status?.vehicles_tracked || 0} {t.driver.tracked}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="text-destructive">
                <Bell />
                <span>{t.app.signOut}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-3 border-b border-border px-6 py-3">
          <SidebarTrigger />
          <LanguageSwitcher />
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-2">
              <Bus className="size-5 text-primary" />
              <h1 className="text-lg font-semibold">{routeInfo?.name || selectedRoute}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Circle className="size-2 fill-green-500 text-green-500" />
                {t.driver.live}
              </Badge>
              {headwayVehicles.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Circle className="size-2 fill-yellow-500 text-yellow-500" />
                  {headwayVehicles.length} {t.driver.ahead}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="px-6 pt-4">
            <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 rounded-lg">{error}</div>
          </div>
        )}
        <div className="flex-1 space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.driver.speed}</CardTitle>
                <Gauge className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{speed} <span className="text-sm font-normal text-muted-foreground">{t.driver.kmh}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.driver.headwayAhead}</CardTitle>
                <Navigation className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {headwayVehicles[0] ? `${(headwayVehicles[0].gap_m / 1000).toFixed(1)}` : t.driver.na}
                  <span className="text-sm font-normal text-muted-foreground"> {t.driver.km}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.driver.vehiclesTracked}</CardTitle>
                <Navigation className="size-4 rotate-180 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status?.vehicles_tracked || 0} <span className="text-sm font-normal text-muted-foreground">{t.driver.buses}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.driver.nextStopETA}</CardTitle>
                <MapPin className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{nextStopETA} <span className="text-sm font-normal text-muted-foreground">{t.driver.min}</span></div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {nextStopName || t.driver.unknown}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>{t.driver.headwayTrend}</CardTitle>
                <p className="text-sm text-muted-foreground">{t.driver.headwayTrendDesc}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={headwayColors} className="aspect-auto h-[250px] w-full">
                  <AreaChart data={headwayHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillHeadway" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-headway)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-headway)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} unit={` ${t.driver.km}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="headway"
                      stroke="var(--color-headway)"
                      fill="url(#fillHeadway)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{t.driver.routeProgressTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">{routeInfo?.name || selectedRoute}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.driver.progress}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{(currentDistance / 1000).toFixed(1)} {t.driver.km} {t.driver.done}</span>
                    <span>{routeInfo ? (((routeInfo.total_length_m - currentDistance) / 1000)).toFixed(1) : "?"} {t.driver.km} {t.driver.left}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t.driver.upcomingStops}</h4>
                  <div className="space-y-2">
                    {upcomingStops.length > 0 ? upcomingStops.map((stop) => (
                      <div
                        key={stop.name}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50"
                      >
                        <div className="flex size-6 items-center justify-center">
                          {stop.status === "next" ? (
                            <MapPin className="size-4 text-primary" />
                          ) : (
                            <Circle className="size-2 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <span className="text-sm font-medium">{stop.name}</span>
                          <span className="text-xs text-muted-foreground">{stop.eta}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">{t.driver.noUpcomingStops}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.driver.advisories}</CardTitle>
                <p className="text-sm text-muted-foreground">{t.driver.advisoriesDesc}</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Bell className="size-3" />
                {advisories.filter(a => !a.read).length} {t.driver.new}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {advisories.length > 0 ? advisories.map((advisory) => {
                const isWarning = advisory.severity === "warning" || advisory.severity === "critical"
                return (
                  <div
                    key={advisory.id}
                    className={`flex items-start gap-3 rounded-2xl border border-border p-4 ${!advisory.read ? "bg-muted/20" : ""}`}
                    onClick={() => {
                      if (!advisory.read) markAdvisoryRead(advisory.id).then(fetchData).catch(() => {})
                    }}
                    style={{ cursor: !advisory.read ? "pointer" : "default" }}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                      isWarning
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isWarning ? <AlertTriangle className="size-4" /> : <ChevronRight className="size-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{advisory.title}</p>
                      <p className="text-xs text-muted-foreground">{advisory.body}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(advisory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!advisory.read && (
                        <span className="text-[10px] text-primary font-medium">{t.driver.new}</span>
                      )}
                    </div>
                  </div>
                )
              }) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t.driver.noAdvisories}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </>
  )
}
