"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"

export default function MyOrdersAliasPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent("/profile/orders")}`)
      return
    }
    if (user.profileRole === "buyer" && !user.isAdmin) {
      router.replace("/profile/orders")
      return
    }
    router.replace(user.isAdmin ? "/admin" : "/seller")
  }, [isLoading, user, router])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </main>
      <Footer />
    </div>
  )
}
