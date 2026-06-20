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
import { MoreHorizontal, Route } from "lucide-react"
import { RealtimePanel } from "@/components/realtime-panel"
import { usePanel } from "@/components/homeshell"
import { clearToken, getUser } from "@/lib/api"

export function AppHeader() {
  const router = useRouter()
  const { isPlanPanelOpen, setPlanPanelOpen } = usePanel()
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
          Transit Travel Assistant
        </span>
      </div>
      <div className="flex items-center gap-2 animate-in fade-in duration-300">
        <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
        <div className="relative">
          <RealtimePanel isOpen={liveOpen} onToggle={() => setLiveOpen(p => !p)} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPlanPanelOpen(!isPlanPanelOpen)}
        >
          <Route className="h-4 w-4 mr-2" />
          Plan
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Route className="mr-2 h-4 w-4" />
              Travel History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
