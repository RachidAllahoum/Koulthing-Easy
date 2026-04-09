"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"

export default function SellerPendingApprovalPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [resolved, setResolved] = useState<"pending" | "rejected" | "loading">("loading")

  useEffect(() => {
    if (authLoading || !user) return

    if (user.profileRole !== "seller") {
      router.replace("/")
      return
    }
    if (user.isSeller) {
      router.replace("/seller")
      return
    }

    void (async () => {
      const { data: rows } = await supabase
        .from("seller_applications")
        .select("status")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)

      const latest = rows?.[0]?.status as string | undefined
      if (latest === "rejected") {
        setResolved("rejected")
        return
      }
      setResolved("pending")
    })()
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (user.profileRole !== "seller" || user.isSeller) {
    return null
  }

  const isRejected = resolved === "rejected"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center space-y-4 bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground">
            {resolved === "loading" ? "Checking your application…" : isRejected ? "Application not approved" : "Almost there"}
          </h1>
          {resolved === "loading" ? (
            <p className="text-muted-foreground text-sm">Please wait.</p>
          ) : isRejected ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your seller application was not approved. If you think this is a mistake, contact support or register again with a
              different approach after speaking with the team.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your account is pending approval. We&apos;ll notify you once an administrator has reviewed your seller application.
            </p>
          )}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Back to home
            </Link>
            {!isRejected && resolved !== "loading" ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Refresh status
              </button>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
