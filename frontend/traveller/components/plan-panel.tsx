"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { TravelPlanCard } from "@/components/travel-plan-card"
import { X, Route, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRouteDetail, finalizePlan, createPlan } from "@/lib/api"

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

export function PlanPanel({ planResult, onClose }: Props) {
  const [plan, setPlan] = useState<ParsedPlan | null>(null)
  const [polyline, setPolyline] = useState<{ lat: number; lng: number }[]>([])
  const [stops, setStops] = useState<any[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [planID, setPlanID] = useState<string | null>(null)

  useEffect(() => {
    if (!planResult) {
      setPlan(null)
      setPolyline([])
      setStops([])
      setConfirmed(false)
      setPlanID(null)
      return
    }
    try {
      const p = JSON.parse(planResult) as ParsedPlan
      setPlan(p)
      setConfirmed(false)
      setPlanID(null)
    } catch {
      setPlan(null)
    }
  }, [planResult])

  useEffect(() => {
    if (!plan?.route) {
      setPolyline([])
      setStops([])
      return
    }
    getRouteDetail(plan.route).then(r => {
      if (r.polyline) setPolyline(r.polyline)
      if (r.stops) setStops(r.stops)
    }).catch(() => {})
  }, [plan?.route])

  const handleConfirm = useCallback(async () => {
    if (!plan || confirming) return
    setConfirming(true)
    try {
      const routeID = plan.route
      const fromName = plan.from_stop
      const toName = plan.to_stop

      const fromStop = stops.find(s => s.name === fromName)
      const toStop = stops.find(s => s.name === toName)

      if (!fromStop || !toStop) {
        const created = await createPlan(routeID, fromName, toName)
        if (created?.id) {
          await finalizePlan(created.id)
          setPlanID(created.id)
        }
      } else {
        const created = await createPlan(routeID, fromStop.id, toStop.id)
        if (created?.id) {
          await finalizePlan(created.id)
          setPlanID(created.id)
        }
      }
      setConfirmed(true)
    } catch (e) {
      console.error("Confirm failed:", e)
    } finally {
      setConfirming(false)
    }
  }, [plan, stops, confirming])

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Travel Plan</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plan ? (
          <>
            <TravelPlanCard result={planResult!} />

            {polyline.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-medium mb-2">
                  Route Map
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
              disabled={confirmed || confirming}
              className="w-full gap-2"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {confirmed ? "Plan Confirmed" : confirming ? "Confirming..." : "Confirm Plan"}
            </Button>

            {confirmed && planID && (
              <p className="text-xs text-center text-muted-foreground">
                Plan added to your travel history
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Route className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground/60">No travel plan yet</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Ask the assistant to plan a journey</p>
          </div>
        )}
      </div>
    </div>
  )
}
