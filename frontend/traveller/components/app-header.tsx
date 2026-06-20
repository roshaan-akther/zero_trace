"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Route, Clock } from "lucide-react"
import { RealtimePanel } from "@/components/realtime-panel"
import { usePanel } from "@/components/homeshell"
import { clearToken, getUser } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"

export function AppHeader() {
  const router = useRouter()
  const { t } = useI18n()
  const { isPlanPanelOpen, setPlanPanelOpen, isRoutesPanelOpen, setRoutesPanelOpen, isTimetablePanelOpen, setTimetablePanelOpen } = usePanel() as any
  const [userName, setUserName] = useState("")
  const [liveOpen, setLiveOpen] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (user) setUserName(user.name)
  }, [])

  const handleSignOut = () => {
    clearToken()
    router.push("/auth/login")
  }

  return (
    <header className="absolute top-0 left-0 right-0 h-14 flex shrink-0 items-center justify-between px-4 z-10 bg-background md:bg-transparent">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground animate-in fade-in duration-300">
          {t.app.header}
        </span>
      </div>
      <div className="flex items-center gap-2 animate-in fade-in duration-300">
        <LanguageSwitcher />
        <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
        <div className="relative">
          <RealtimePanel isOpen={liveOpen} onToggle={() => setLiveOpen(p => !p)} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRoutesPanelOpen(!isRoutesPanelOpen)
            if (!isRoutesPanelOpen) { setTimetablePanelOpen(false); setPlanPanelOpen(false) }
          }}
        >
          <Route className="h-4 w-4 mr-2" />
          {t.nav.routes}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTimetablePanelOpen(!isTimetablePanelOpen)
            if (!isTimetablePanelOpen) { setRoutesPanelOpen(false); setPlanPanelOpen(false) }
          }}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t.nav.timetable}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPlanPanelOpen(!isPlanPanelOpen)
            if (!isPlanPanelOpen) { setRoutesPanelOpen(false); setTimetablePanelOpen(false) }
          }}
        >
          <Route className="h-4 w-4 mr-2" />
          {t.nav.plan}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { setTimetablePanelOpen(true); setRoutesPanelOpen(false); setPlanPanelOpen(false) }}>
              <Clock className="mr-2 h-4 w-4" />
              {t.nav.timetable}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPlanPanelOpen(true); setRoutesPanelOpen(false); setTimetablePanelOpen(false) }}>
              <Route className="mr-2 h-4 w-4" />
              {t.nav.travelPlan}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              {t.app.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
