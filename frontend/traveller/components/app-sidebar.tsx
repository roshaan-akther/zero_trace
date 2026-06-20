"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { PencilLineIcon } from "lucide-react"
import { useI18n } from "@/lib/i18n"

const SIDEBAR_STATE_KEY = "traveller-sidebar-state"

function Navigation() {
  const { t } = useI18n()
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile

  const handleNewChat = () => {
    window.location.href = "/"
  }

  return (
    <SidebarGroup className="py-1">
      <SidebarGroupContent>
        <SidebarMenu className="animate-in fade-in duration-300">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t.app.newChat}
              onClick={handleNewChat}
            >
              <PencilLineIcon />
              {!isCollapsed && <span>{t.app.newChat}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar()
  const hasInitialized = useRef(false)
  const isMobileRef = useRef(isMobile)
  const mobileInitialized = useRef(false)

  useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  useEffect(() => {
    if (!hasInitialized.current && !isMobileRef.current) {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (savedState === "collapsed") {
        setOpen(false)
      } else if (savedState === "expanded") {
        setOpen(true)
      }
      hasInitialized.current = true
    }
  }, [setOpen])

  useEffect(() => {
    if (hasInitialized.current && !isMobileRef.current) {
      if (state === "collapsed") {
        localStorage.setItem(SIDEBAR_STATE_KEY, "collapsed")
      } else if (state === "expanded") {
        localStorage.setItem(SIDEBAR_STATE_KEY, "expanded")
      }
    }
  }, [state])

  useEffect(() => {
    if (isMobile && !mobileInitialized.current && !openMobile) {
      setOpenMobile(true)
      mobileInitialized.current = true
    }
  }, [isMobile, openMobile, setOpenMobile])

  const collapsible = isMobile ? "offcanvas" : "icon"

  return (
    <Sidebar collapsible={collapsible} className="bg-background border-border/25" {...props}>
      <SidebarContent className="border-border/25">
        <Navigation />
      </SidebarContent>
      <SidebarRail className="border-border/25" />
    </Sidebar>
  )
}
