"use client"

import { useState, useEffect } from "react"
import { X, Bus, Train, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRoutes } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function RoutesPanel({ isOpen, onClose }: Props) {
  const { t } = useI18n()
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getRoutes().then(r => {
      setRoutes(r.routes || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [isOpen])

  return (
    <div className={`fixed right-0 top-0 h-full bg-background border-l border-border transition-all duration-300 z-30 ${isOpen ? 'w-[50vw]' : 'w-0 overflow-hidden'}`}>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t.routes.title}</span>
            {routes.length > 0 && (
              <span className="text-xs text-muted-foreground/50">({routes.length})</span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
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
              {routes.map((r: any) => (
                <div key={r.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {r.type === "train" ? (
                      <Train className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : r.type === "three_wheeler" ? (
                      <span className="text-lg shrink-0 leading-none">🔶</span>
                    ) : (
                      <Bus className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground/50 ml-2">({r.id})</span>
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {r.stops} {t.routes.stops} · {r.type?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
