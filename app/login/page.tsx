"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { resolvePostLoginPath, safeInternalRedirectPath } from "@/lib/post-login-redirect"

function readRedirectQuery(): string | null {
  return typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null
}

export default function LoginPage() {
  const router = useRouter()
  const { login, user, isLoading: authLoading } = useAuth()
  const [registerHref, setRegisterHref] = useState("/register")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  useEffect(() => {
    const r = safeInternalRedirectPath(readRedirectQuery())
    setRegisterHref(r ? `/register?redirect=${encodeURIComponent(r)}` : "/register")
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    void (async () => {
      const defaultPath = await resolvePostLoginPath(user.id)
      const wanted = safeInternalRedirectPath(readRedirectQuery())
      const next =
        wanted && !user.isAdmin ? wanted : defaultPath
      if (!cancelled) router.replace(next)
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, router])

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-muted-foreground">Redirecting…</p>
        </main>
        <Footer />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const emailToSend = formData.email.trim().toLowerCase()
      const passwordToSend = formData.password.trim()

      console.log("[login.form] submitting credentials", {
        email: emailToSend,
        password: passwordToSend,
      })

      const loggedIn = await login(emailToSend, passwordToSend)
      let nextPath = await resolvePostLoginPath(loggedIn.id)
      const wanted = safeInternalRedirectPath(readRedirectQuery())
      if (wanted && !loggedIn.isAdmin) {
        nextPath = wanted
      }
      router.push(nextPath)
    } catch (err) {
      console.error("[login.form] login failed", err)
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-12 rounded-xl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl gap-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social Login */}
            <div className="space-y-3">
              <Button variant="outline" size="lg" className="w-full h-12 rounded-xl gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="text-accent font-medium hover:text-accent/80 transition-colors">
              Create account
            </Link>
          </p>

        </div>
      </main>

      <Footer />
    </div>
  )
}
