"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Bus, Train, Route, RefreshCw, Clock, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRoutes, getRouteDetail, getRouteETA, type ETAVehicle } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface StopWithETA {
  id: string
  name: string
  distance_m: number
  vehicles: ETAVehicle[]
}

export function DynamicTimetablePanel({ isOpen, onClose }: Props) {
  const { t } = useI18n()
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null)
  const [stops, setStops] = useState<any[]>([])
  const [stopETAs, setStopETAs] = useState<StopWithETA[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedRef = useRef(selectedRoute)
  selectedRef.current = selectedRoute

  useEffect(() => {
    if (!isOpen) return
    setLoadingRoutes(true)
    getRoutes().then(r => {
      setRoutes(r.routes || [])
    }).catch(() => {}).finally(() => setLoadingRoutes(false))

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedRoute) {
      setStops([])
      setStopETAs([])
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    setLoading(true)
    getRouteDetail(selectedRoute.id).then(r => {
      const route = r.route || r
      const stopList = route.stops || []
      setStops(stopList)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedRoute])

  const fetchETAs = useCallback(async () => {
    const route = selectedRef.current
    if (!route) return

    setRefreshing(true)
    try {
      const detail = await getRouteDetail(route.id)
      const routeData = detail.route || detail
      const stopList = routeData.stops || []
      setStops(stopList)

      const results = await Promise.allSettled(
        stopList.map((s: any) =>
          getRouteETA(route.id, s.id).then(res => ({
            id: s.id,
            name: s.name,
            distance_m: s.distance_m,
            vehicles: res.vehicles || [],
          }))
        )
      )

      const withETA: StopWithETA[] = []
      for (const r of results) {
        if (r.status === "fulfilled") withETA.push(r.value)
      }
      setStopETAs(withETA)
    } catch {
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedRoute) return
    fetchETAs()

    intervalRef.current = setInterval(fetchETAs, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [selectedRoute, fetchETAs])

  function formatETA(seconds: number): string {
    if (seconds <= 0) return t.timetable.due
    if (seconds < 60) return `${Math.round(seconds)}${t.timetable.seconds}`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${t.timetable.minutes} ${Math.round(seconds % 60)}${t.timetable.seconds}`
    return `${Math.floor(seconds / 3600)}${t.timetable.hours} ${Math.floor((seconds % 3600) / 60)}${t.timetable.minutes}`
  }

  function getMinETA(stop: StopWithETA): string {
    if (stop.vehicles.length === 0) return "—"
    const min = Math.min(...stop.vehicles.map(v => v.eta_s))
    return formatETA(min)
  }

  function getVehicleCount(stop: StopWithETA): number {
    return stop.vehicles.length
  }

  return (
    <div className={`fixed right-0 top-0 h-full bg-background border-l border-border transition-all duration-300 z-30 ${isOpen ? 'w-[50vw]' : 'w-0 overflow-hidden'}`}>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t.timetable.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {selectedRoute && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={fetchETAs}
                disabled={refreshing}
                title={t.realtime.refresh}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedRoute && (
            <div>
              {loadingRoutes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Route className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground/60">{t.routes.noRoutes}</p>
                </div>
              ) : (
                <div className="divide-y">
                  <div className="px-4 py-2 text-xs text-muted-foreground/50 uppercase tracking-wider font-medium">
                    {t.timetable.selectRoute}
                  </div>
                  {routes.map((r: any) => (
                    <button
                      key={r.id}
                      className="w-full px-4 py-2.5 hover:bg-muted/30 transition-colors text-left flex items-center gap-2"
                      onClick={() => setSelectedRoute(r)}
                    >
                      {r.vehicle_type === "train" ? (
                        <Train className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : r.vehicle_type === "three_wheeler" ? (
                        <span className="text-lg shrink-0 leading-none">🔶</span>
                      ) : (
                        <Bus className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm">{r.name}</span>
                        <span className="text-xs text-muted-foreground/50 ml-2">({r.id})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedRoute && (
            <div>
              <div className="px-4 py-3 border-b bg-muted/10">
                <button
                  className="text-xs text-muted-foreground/60 hover:text-foreground mb-2 flex items-center gap-1"
                  onClick={() => {
                    setSelectedRoute(null)
                    setStopETAs([])
                  }}
                >
                  <ChevronRight className="w-3 h-3 rotate-180" /> {t.timetable.backToRoutes}
                </button>
                <div className="flex items-center gap-2">
                  {selectedRoute.vehicle_type === "train" ? (
                    <Train className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : selectedRoute.vehicle_type === "three_wheeler" ? (
                    <span className="text-lg shrink-0 leading-none">🔶</span>
                  ) : (
                    <Bus className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-medium">{selectedRoute.name}</h3>
                    <p className="text-xs text-muted-foreground/60">{stops.length} {t.timetable.stops}</p>
                  </div>
                </div>
              </div>

              {loading || refreshing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : stopETAs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground/60">{t.timetable.noData}</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    {t.timetable.noDataHint}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {stopETAs.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className={`px-4 py-3 hover:bg-muted/20 transition-colors ${getVehicleCount(stop) === 0 ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 ${getVehicleCount(stop) > 0 ? "bg-green-500 border-green-500" : "bg-transparent border-muted-300"}`} />
                          {idx < stopETAs.length - 1 && (
                            <div className="w-px h-8 bg-border mt-0.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium truncate">{stop.name}</span>
                            {getVehicleCount(stop) > 0 ? (
                              <span className="text-lg font-bold tabular-nums shrink-0 text-green-600">
                                {getMinETA(stop)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40 shrink-0">—</span>
                            )}
                          </div>
                          {stop.vehicles.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground/70">
                                {stop.vehicles.length === 1
                                  ? `1 ${t.timetable.vehicle} · ${formatETA(stop.vehicles[0].eta_s)}`
                                  : `${stop.vehicles.length} ${t.timetable.vehicles} · ${t.timetable.nextIn} ${getMinETA(stop)}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
