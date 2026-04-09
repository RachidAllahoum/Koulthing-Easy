"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

interface PendingSellerProfile {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  is_approved: boolean | null
}

/** Full row from seller_applications (select *). */
type SellerApplicationRecord = Record<string, unknown> & {
  id: string
  user_id: string
  status: string
  shop_name?: string | null
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export default function AdminShopApprovalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<{ profile: PendingSellerProfile; application: SellerApplicationRecord | null }[]>(
    [],
  )
  const [rejected, setRejected] = useState<SellerApplicationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    setIsLoading(true)
    if (!user?.id) {
      setRows([])
      setRejected([])
      setIsLoading(false)
      return
    }

    const { data: pendingProfiles, error: sellersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_approved")
      .eq("role", "seller")
      .eq("is_approved", false)

    if (sellersError) {
      console.error("[admin approvals] pending sellers fetch failed", sellersError)
      setRows([])
      setRejected([])
      setIsLoading(false)
      return
    }

    const sellerList = (pendingProfiles ?? []) as PendingSellerProfile[]
    const userIds = sellerList.map((p) => p.id)

    let applicationsByUserId: Record<string, SellerApplicationRecord> = {}
    if (userIds.length > 0) {
      const { data: apps, error: appsError } = await supabase
        .from("seller_applications")
        .select("*")
        .in("user_id", userIds)
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })

      if (appsError) {
        console.error("[admin approvals] applications fetch failed", appsError)
        setRows([])
        setRejected([])
        setIsLoading(false)
        return
      }

      for (const row of apps ?? []) {
        const r = row as SellerApplicationRecord
        const uid = r.user_id as string
        if (!applicationsByUserId[uid]) applicationsByUserId[uid] = r
      }
    }

    const merged = sellerList.map((profileRow) => ({
      profile: profileRow,
      application: applicationsByUserId[profileRow.id] ?? null,
    }))

    const { data: rejectedApps, error: rejError } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("status", "rejected")
      .order("submitted_at", { ascending: false })
      .limit(50)

    if (rejError) {
      console.warn("[admin approvals] rejected list fetch failed", rejError)
      setRejected([])
    } else {
      setRejected((rejectedApps ?? []) as SellerApplicationRecord[])
    }

    setRows(merged)
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && user?.isAdmin) void fetchQueue()
  }, [authLoading, user?.isAdmin, fetchQueue])

  if (authLoading) return <div className="p-6">Loading...</div>
  if (!user?.isAdmin) {
    router.replace("/")
    return null
  }

  const pendingCount = rows.filter((r) => r.application).length

  const handleApprove = async (application: SellerApplicationRecord) => {
    const id = application.id as string
    const applicationUserId = application.user_id as string
    if (application.status !== "pending") {
      toast({ title: "Already processed", variant: "destructive" })
      return
    }

    setProcessingId(id)
    let profilePromoted = false
    let shopId: string | null = null

    try {
      const reviewedAt = new Date().toISOString()

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", applicationUserId)
        .eq("role", "seller")
        .select("id")

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      if (!profileRows?.length) throw new Error("No profile row updated (check role/is_approved).")
      profilePromoted = true

      const { data: existingShop } = await supabase
        .from("shops")
        .select("id")
        .eq("seller_id", applicationUserId)
        .limit(1)
      if ((existingShop ?? []).length > 0) {
        throw new Error("This seller already has a shop.")
      }

      const shopPayload = {
        seller_id: applicationUserId,
        name: (application.shop_name as string) ?? "Shop",
        description: (application.description as string | null) ?? "",
        logo_url: (application.logo_url as string | null) ?? null,
        is_active: true,
      }

      const { data: shopRow, error: shopError } = await supabase.from("shops").insert(shopPayload).select("id").maybeSingle()

      if (shopError) throw new Error(`Shop create failed: ${shopError.message}`)
      shopId = shopRow?.id ?? null
      if (!shopId) throw new Error("Shop create returned no id.")

      const { data: appRows, error: appError } = await supabase
        .from("seller_applications")
        .update({ status: "approved", reviewed_at: reviewedAt, reviewed_by: user.id })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")

      if (appError) throw new Error(`Application update failed: ${appError.message}`)
      if (!appRows?.length) throw new Error("Application was not pending or could not be marked approved.")

      toast({ title: "Approved" })
      await fetchQueue()
    } catch (error) {
      if (shopId) {
        await supabase.from("shops").delete().eq("id", shopId)
      }
      if (profilePromoted) {
        await supabase.from("profiles").update({ is_approved: false }).eq("id", applicationUserId).eq("role", "seller")
      }
      console.error("[admin approvals] approve failed", error)
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Approval failed.",
        variant: "destructive",
      })
      await fetchQueue()
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (application: SellerApplicationRecord | null, applicationUserId: string) => {
    const id = application?.id
    setProcessingId(id ?? applicationUserId)
    try {
      const reviewedAt = new Date().toISOString()

      if (id) {
        const { data: updated, error: appError } = await supabase
          .from("seller_applications")
          .update({ status: "rejected", reviewed_at: reviewedAt, reviewed_by: user.id })
          .eq("id", id)
          .eq("status", "pending")
          .select("id")

        if (appError) throw new Error(`Application update failed: ${appError.message}`)
        if (!updated?.length) throw new Error("Application is not pending.")

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_approved: false })
          .eq("id", applicationUserId)
          .eq("role", "seller")

        if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      } else {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: "buyer", is_approved: null })
          .eq("id", applicationUserId)

        if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      }

      toast({ title: "Rejected" })
      await fetchQueue()
    } catch (error) {
      console.error("[admin approvals] reject failed", error)
      toast({
        title: "Reject failed",
        description: error instanceof Error ? error.message : "Reject failed.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Seller applications</h1>
      <p className="mb-6 text-muted-foreground text-sm">
        Profiles with <span className="font-medium text-foreground">role = seller</span> and{" "}
        <span className="font-medium text-foreground">is_approved = false</span>
        {pendingCount > 0 ? ` — ${pendingCount} with a pending application row` : ""}.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {rows.map(({ profile, application }) => (
            <div key={profile.id} className="border rounded-xl p-5 space-y-4 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-lg">{profile.full_name || "Applicant"}</h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Profile id: <span className="font-mono">{profile.id}</span>
                  </p>
                </div>
                <Badge variant={application ? "default" : "secondary"}>{application ? "Pending application" : "No pending row"}</Badge>
              </div>

              {application ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm border-t border-border pt-4">
                    {Object.entries(application)
                      .filter(([key]) => !["reviewed_by"].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-0.5">
                          <span className="text-xs text-muted-foreground">{formatFieldLabel(key)}</span>
                          <span className="text-foreground break-all">{formatFieldValue(value)}</span>
                        </div>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleApprove(application)} disabled={processingId !== null}>
                      {processingId === application.id ? "Working…" : "Approve"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleReject(application, profile.id)}
                      disabled={processingId !== null}
                    >
                      Reject
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-700 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  This seller profile is unapproved but has no pending <code className="text-xs">seller_applications</code> row.
                  You can reject to demote the account to buyer, or fix data in Supabase.
                </p>
              )}

              {!application ? (
                <Button variant="outline" onClick={() => void handleReject(null, profile.id)} disabled={processingId !== null}>
                  Reject (demote to buyer)
                </Button>
              ) : null}
            </div>
          ))}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unapproved seller profiles in the queue.</p>
          ) : null}

          {rejected.length > 0 ? (
            <div className="pt-8 border-t border-border">
              <h3 className="font-semibold mb-3">Recently rejected (last 50)</h3>
              <div className="space-y-3">
                {rejected.map((a) => (
                  <div key={String(a.id)} className="border rounded-lg p-3 text-sm opacity-90">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{String(a.shop_name ?? "—")}</span>
                      <Badge variant="destructive">Rejected</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">User: {String(a.user_id)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
