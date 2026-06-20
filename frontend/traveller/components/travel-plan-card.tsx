"use client"

import { Train, Clock, DollarSign, ArrowRight, AlertTriangle, Info, AlertCircle, MapPin, Luggage } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PlanStep {
  instruction: string
  duration_min?: number
}

interface Transfer {
  from: string
  to: string
  at: string
}

interface Alert {
  severity: "info" | "warning" | "critical"
  title: string
  description: string
}

interface TravelPlan {
  from_stop: string
  to_stop: string
  route: string
  duration_minutes: number
  fare?: string
  depart_at?: string
  arrive_at?: string
  transfers?: Transfer[]
  steps?: PlanStep[]
  alerts?: Alert[]
}

interface Props {
  result: string
}

function parsePlan(result: string): TravelPlan | null {
  try {
    return JSON.parse(result) as TravelPlan
  } catch {
    return null
  }
}

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const severityColor = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
}

export function TravelPlanCard({ result }: Props) {
  const plan = parsePlan(result)
  if (!plan) return null

  return (
    <div className="rounded-xl border bg-card overflow-hidden mb-3">
      {/* Route header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Train className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{plan.route}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{plan.from_stop}</p>
            {plan.depart_at && (
              <p className="text-xs text-muted-foreground mt-0.5">{plan.depart_at}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold text-foreground">{plan.to_stop}</p>
            {plan.arrive_at && (
              <p className="text-xs text-muted-foreground mt-0.5">{plan.arrive_at}</p>
            )}
          </div>
        </div>
      </div>

      {/* Key info badges */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b bg-card">
        <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 rounded-lg">
          <Clock className="w-3 h-3" />
          {plan.duration_minutes} min
        </Badge>
        {plan.fare && (
          <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 rounded-lg">
            <DollarSign className="w-3 h-3" />
            {plan.fare}
          </Badge>
        )}
        {plan.transfers && plan.transfers.length > 0 && (
          <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 rounded-lg">
            <Luggage className="w-3 h-3" />
            {plan.transfers.length} transfer{plan.transfers.length > 1 ? "s" : ""}
          </Badge>
        )}
        {plan.depart_at && plan.arrive_at && (
          <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5 rounded-lg">
            <MapPin className="w-3 h-3" />
            {plan.depart_at} → {plan.arrive_at}
          </Badge>
        )}
      </div>

      {/* Step-by-step instructions */}
      {plan.steps && plan.steps.length > 0 && (
        <div className="px-4 py-3 border-b">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-2.5">Journey Steps</p>
          <div className="space-y-2">
            {plan.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < plan.steps!.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm text-foreground/90">{step.instruction}</p>
                  {step.duration_min && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.duration_min} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfers */}
      {plan.transfers && plan.transfers.length > 0 && (
        <div className="px-4 py-3 border-b">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-2.5">Transfers</p>
          <div className="space-y-1.5">
            {plan.transfers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="text-xs">From <span className="font-medium text-foreground/80">{t.from}</span> to <span className="font-medium text-foreground/80">{t.to}</span> at <span className="font-medium text-foreground/80">{t.at}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service alerts */}
      {plan.alerts && plan.alerts.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-2.5">Service Alerts</p>
          <div className="space-y-2">
            {plan.alerts.map((alert, i) => {
              const Icon = severityIcon[alert.severity]
              const color = severityColor[alert.severity]
              return (
                <div key={i} className="flex gap-2.5 text-sm">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground/90">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
