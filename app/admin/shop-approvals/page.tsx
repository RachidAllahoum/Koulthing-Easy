"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { shopPayloadFromSellerApplication } from "@/lib/shop-from-application"
import { OrderCancelDialog } from "@/components/order-cancel-dialog"

interface PendingSellerProfile {
  id: string
  email: string | null
  full_name: string | null
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
  const [rows, setRows] = useState<{ profile: PendingSellerProfile | null; application: SellerApplicationRecord }[]>([])
  const [rejected, setRejected] = useState<SellerApplicationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{ application: SellerApplicationRecord | null; userId: string } | null>(null)

  const fetchQueue = useCallback(async () => {
    setIsLoading(true)
    if (!user?.id) {
      setRows([])
      setRejected([])
      setIsLoading(false)
      return
    }

    const { data: pendingApps, error: appsError } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })

    if (appsError) {
      console.error("[admin approvals] pending applications fetch failed", appsError)
      setRows([])
      setRejected([])
      setIsLoading(false)
      return
    }

    const apps = (pendingApps ?? []) as SellerApplicationRecord[]
    const userIds = [...new Set(apps.map((a) => String(a.user_id)).filter(Boolean))]
    let profilesById: Record<string, PendingSellerProfile> = {}
    if (userIds.length > 0) {
      const { data: profileRows, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds)
      if (profileErr) {
        console.warn("[admin approvals] profiles lookup failed", profileErr)
      } else {
        profilesById = ((profileRows ?? []) as PendingSellerProfile[]).reduce<Record<string, PendingSellerProfile>>((acc, p) => {
          acc[p.id] = p
          return acc
        }, {})
      }
    }

    const merged = apps.map((application) => ({
      profile: profilesById[String(application.user_id)] ?? null,
      application,
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

  const pendingCount = rows.length

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

      const shopPayload = shopPayloadFromSellerApplication(applicationUserId, application)

      const { data: shopRow, error: shopError } = await supabase
        .from("shops")
        .insert(shopPayload)
        .select("id")
        .maybeSingle()

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

  const handleReject = async (application: SellerApplicationRecord, applicationUserId: string, reviewNotes: string) => {
    const id = application.id
    setProcessingId(id)
    try {
      const reviewedAt = new Date().toISOString()
      const notes = reviewNotes.trim()
      if (!notes) throw new Error("Rejection reason is required.")

      const { data: updated, error: appError } = await supabase
        .from("seller_applications")
        .update({ status: "rejected", reviewed_at: reviewedAt, reviewed_by: user.id, review_notes: notes })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")

      if (appError) throw new Error(`Application update failed: ${appError.message}`)
      if (!updated?.length) throw new Error("Application is not pending.")

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: false, role: "seller" })
        .eq("id", applicationUserId)

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)

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
        Pending rows from <span className="font-medium text-foreground">seller_applications</span>
        {pendingCount > 0 ? ` — ${pendingCount} pending application${pendingCount === 1 ? "" : "s"}` : ""}.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {rows.map(({ profile, application }) => (
            <div key={String(application.id)} className="border rounded-xl p-5 space-y-4 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-lg">{profile?.full_name || "Applicant"}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email || "No email"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Profile id: <span className="font-mono">{String(application.user_id)}</span>
                  </p>
                </div>
                <Badge variant="default">Pending application</Badge>
              </div>

              <>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Numéro d'identification nationale (NIF) ou registre de commerce
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">
                    {formatFieldValue(application.business_registration)}
                  </p>
                </div>
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
                    onClick={() => setRejectTarget({ application, userId: String(application.user_id) })}
                    disabled={processingId !== null}
                  >
                    Reject
                  </Button>
                </div>
              </>
            </div>
          ))}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending seller applications in the queue.</p>
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
                    {a.review_notes ? (
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">Reason: </span>
                        <span className="text-foreground">{String(a.review_notes)}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <OrderCancelDialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
        title="Reject seller application"
        description="Reason for rejection (required). This reason will be visible to the seller."
        confirmLabel="Reject application"
        busy={
          rejectTarget != null &&
          processingId === (rejectTarget.application?.id ?? rejectTarget.userId)
        }
        onConfirm={async (reason) => {
          if (!rejectTarget?.application) return
          await handleReject(rejectTarget.application, rejectTarget.userId, reason)
          setRejectTarget(null)
        }}
      />
    </div>
  )
}
