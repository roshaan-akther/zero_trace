"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { TravelPlanCard } from "@/components/travel-plan-card"
import { X, Route, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRouteDetail, finalizePlan, createPlan, getRoutes } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const RouteMap = dynamic(() => import("@/components/route-map").then(m => ({ default: m.RouteMap })), { ssr: false })

interface ParsedPlan {
  from_stop: string
  to_stop: string
  route: string
  duration_minutes: number
  fare?: string
  depart_at?: string
  arrive_at?: string
  steps?: { instruction: string; duration_min?: number }[]
}

interface Props {
  planResult: string | null
  onClose: () => void
}

function resolveRouteID(routeStr: string, routeMap: Record<string, { id: string; name: string }>): string | null {
  if (!routeStr) return null
  const lower = routeStr.toLowerCase().trim()
  if (routeMap[lower]) return routeMap[lower].id
  const withoutPrefix = lower.replace(/^route\s+/, "")
  if (routeMap[withoutPrefix]) return routeMap[withoutPrefix].id
  for (const [key, val] of Object.entries(routeMap)) {
    if (key.includes(lower) || lower.includes(key)) return val.id
  }
  for (const [, val] of Object.entries(routeMap)) {
    if (val.name.toLowerCase().includes(lower) || lower.includes(val.name.toLowerCase())) return val.id
  }
  if (routeMap[routeStr]) return routeMap[routeStr].id
  return null
}

function findStopByName(stops: any[], name: string): any {
  if (!stops || !name) return null
  const lower = name.toLowerCase().trim()
  for (const s of stops) {
    if (s.name.toLowerCase() === lower) return s
  }
  for (const s of stops) {
    if (s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())) return s
  }
  return null
}

export function PlanPanel({ planResult, onClose }: Props) {
  const { t } = useI18n()
  const [plan, setPlan] = useState<ParsedPlan | null>(null)
  const [polyline, setPolyline] = useState<{ lat: number; lng: number }[]>([])
  const [stops, setStops] = useState<any[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [planID, setPlanID] = useState<string | null>(null)
  const [routeID, setRouteID] = useState<string | null>(null)
  const routeMapRef = useRef<Record<string, { id: string; name: string }>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    getRoutes().then(r => {
      const map: Record<string, { id: string; name: string }> = {}
      for (const rt of r.routes) {
        map[rt.id.toLowerCase()] = { id: rt.id, name: rt.name }
        map[rt.name.toLowerCase()] = { id: rt.id, name: rt.name }
      }
      routeMapRef.current = map
    }).catch(() => {})
  }, [])

  function isValidPlan(v: unknown): v is ParsedPlan {
    if (!v || typeof v !== "object") return false
    const p = v as Record<string, unknown>
    return (
      typeof p.from_stop === "string" &&
      typeof p.to_stop === "string" &&
      typeof p.route === "string" &&
      typeof p.duration_minutes === "number"
    )
  }

  useEffect(() => {
    if (!planResult) {
      setPlan(null)
      setPolyline([])
      setStops([])
      setConfirmed(false)
      setPlanID(null)
      setRouteID(null)
      setError("")
      return
    }
    try {
      const raw = JSON.parse(planResult)
      if (!isValidPlan(raw)) {
        setPlan(null)
        setError(t.plan.planInvalid)
        return
      }
      const p = raw as ParsedPlan
      setPlan(p)
      setConfirmed(false)
      setPlanID(null)

      const resolvedID = resolveRouteID(p.route, routeMapRef.current)
      setRouteID(resolvedID)
      if (!resolvedID) {
        setError(t.plan.unknownRoute.replace("{{route}}", p.route))
      } else {
        setError("")
      }
    } catch {
      setPlan(null)
      setError(t.plan.parseError)
    }
  }, [planResult, t])

  useEffect(() => {
    if (!routeID) {
      setPolyline([])
      setStops([])
      return
    }
    getRouteDetail(routeID).then(r => {
      if (r.polyline) setPolyline(r.polyline)
      if (r.stops) setStops(r.stops)
    }).catch(() => setError(t.plan.loadRouteFailed))
  }, [routeID, t])

  const handleConfirm = useCallback(async () => {
    if (!plan || confirming || !routeID) return
    setConfirming(true)
    setError("")
    try {
      const fromStop = findStopByName(stops, plan.from_stop)
      const toStop = findStopByName(stops, plan.to_stop)

      if (!fromStop) {
        setError(t.plan.stopNotFound.replace("{{stop}}", plan.from_stop))
        setConfirming(false)
        return
      }
      if (!toStop) {
        setError(t.plan.stopNotFound.replace("{{stop}}", plan.to_stop))
        setConfirming(false)
        return
      }

      const created = await createPlan(routeID, fromStop.id, toStop.id)
      if (created?.id) {
        await finalizePlan(created.id)
        setPlanID(created.id)
      }
      setConfirmed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.plan.confirmFailed)
    } finally {
      setConfirming(false)
    }
  }, [plan, routeID, stops, confirming, t])

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t.plan.title}</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 rounded-lg">{error}</div>
        )}
        {plan ? (
          <>
            <TravelPlanCard result={planResult!} />

            {polyline.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-medium mb-2">
                  {t.plan.routeMap}
                </p>
                <RouteMap
                  polyline={polyline}
                  stops={stops}
                  fromStop={plan.from_stop}
                  toStop={plan.to_stop}
                />
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={confirmed || confirming || !routeID}
              className="w-full gap-2"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {confirmed ? t.plan.planConfirmed : confirming ? t.plan.confirming : t.plan.confirmPlan}
            </Button>

            {confirmed && planID && (
              <p className="text-xs text-center text-muted-foreground">
                {t.plan.planAdded}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Route className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground/60">{t.plan.noPlan}</p>
            <p className="text-xs text-muted-foreground/40 mt-1">{t.plan.noPlanHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
