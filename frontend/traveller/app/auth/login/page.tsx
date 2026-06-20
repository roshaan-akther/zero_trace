"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { login, setToken, setUser } from "@/lib/api"
import { Train, Eye, EyeOff } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await login(email, password)
      setToken(res.token)
      setUser(res.user)
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.loginFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Train className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight">{t.auth.welcomeBack}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t.auth.signInTitle}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pb-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">{t.auth.password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" disabled={loading} className="w-full h-10 rounded-xl">
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t.auth.noAccount}{" "}
            <Link href="/auth/signup" className="text-primary font-medium hover:underline">
              {t.auth.createOne}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
