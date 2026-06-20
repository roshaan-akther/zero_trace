"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomeShell from "@/components/homeshell"
import { getToken, getUser } from "@/lib/api"

export default function Home() {
  // Force client-side rendering
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    const user = getUser()
    if (!token || !user || user.type !== "traveller") {
      router.replace("/auth/login")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return null

  return <HomeShell />
}
