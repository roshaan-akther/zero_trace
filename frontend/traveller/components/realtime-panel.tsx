"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, Bus, Navigation, MapPin, RefreshCw, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNearbyVehicles, NearbyVehicle } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const COLOMBO_CENTER = { lat: 6.9271, lng: 79.8612 }

interface Props {
  isOpen: boolean
  onToggle: () => void
}

export function RealtimePanel({ isOpen, onToggle }: Props) {
  const { t } = useI18n()
  const [vehicles, setVehicles] = useState<NearbyVehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(COLOMBO_CENTER)
  const [error, setError] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationRef = useRef(COLOMBO_CENTER)

  const fetchVehicles = async (lat: number, lng: number) => {
    setLoading(true)
    setError("")
    try {
      const res = await getNearbyVehicles(lat, lng, 100)
      setVehicles(res.vehicles.filter(v => v.confidence >= 0.2))
    } catch (e) {
      setError(e instanceof Error ? e.message : t.realtime.failed)
    } finally {
      setLoading(false)
    }
  }

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          locationRef.current = loc
          setLocation(loc)
          fetchVehicles(loc.lat, loc.lng)
        },
        () => {
          fetchVehicles(COLOMBO_CENTER.lat, COLOMBO_CENTER.lng)
        }
      )
    } else {
      fetchVehicles(COLOMBO_CENTER.lat, COLOMBO_CENTER.lng)
    }
  }

  useEffect(() => {
    if (isOpen) {
      requestLocation()
      intervalRef.current = setInterval(() => {
        const loc = locationRef.current
        fetchVehicles(loc.lat, loc.lng)
      }, 10000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen])

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onToggle} className="gap-1.5">
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">{t.realtime.live}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-14 right-4 w-[380px] max-h-[480px] overflow-hidden rounded-xl border bg-popover shadow-2xl z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t.realtime.nearbyVehicles}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" onClick={requestLocation} title={t.realtime.useLocation}>
                <LocateFixed className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => fetchVehicles(location.lat, location.lng)} title={t.realtime.refresh}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="px-4 py-3 text-xs text-destructive">{error}</div>
            )}

            {!loading && vehicles.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bus className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground/60">{t.realtime.noVehicles}</p>
              </div>
            )}

            {vehicles.length > 0 && (
              <div className="divide-y">
                {vehicles.map((v, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium truncate">{v.route_name}</span>
                        </div>
                        {v.vehicle && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {v.vehicle.plate_number} · {v.vehicle.vehicle_type}
                          </p>
                        )}
                        {v.next_stop_name && (
                          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {t.realtime.next}: {v.next_stop_name}
                            {v.eta_s !== undefined && v.eta_s > 0 && v.eta_s < 1e9 && (
                              <span className="font-medium text-foreground/80">
                                · {Math.round(v.eta_s / 60)} {t.realtime.min}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Navigation className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-xs font-medium tabular-nums">
                            {(v.distance_m / 1000).toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {v.last_ping}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading && vehicles.length > 0 && (
              <div className="px-4 py-2 text-xs text-muted-foreground/50 text-center border-t">
                {t.realtime.refreshing}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t text-[10px] text-muted-foreground/40 text-center shrink-0">
            {t.realtime.footer}
          </div>
        </div>
      )}
    </>
  )
}
