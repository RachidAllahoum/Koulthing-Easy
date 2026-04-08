"use client"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

interface SellerApplication {
  id: string
  user_id: string
  shop_name: string
  business_registration: string
  description: string
  status: "pending" | "approved" | "rejected"
  submitted_at: string
}

export default function AdminShopApprovalsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setIsLoading(true)
    const { data: profile } = await supabase.from("profiles").select("id, is_admin").eq("id", user?.id ?? "").maybeSingle()
    if (!profile?.is_admin) {
      setApplications([])
      setIsLoading(false)
      return
    }
    const { data } = await supabase
      .from("seller_applications")
      .select("id, user_id, shop_name, business_registration, description, status, submitted_at")
      .order("submitted_at", { ascending: false })
    setApplications((data ?? []) as SellerApplication[])
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && user?.isAdmin) void fetchApplications()
  }, [authLoading, user?.isAdmin, fetchApplications])

  if (authLoading) return <div className="p-6">Loading...</div>
  if (!user?.isAdmin) {
    router.replace("/")
    return null
  }

  const pending = applications.filter((a) => a.status === "pending")
  const rejected = applications.filter((a) => a.status === "rejected")

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    let step1Applied = false
    try {
      console.log("[approve] start", { applicationId: id, adminId: user.id })
      const { data: target, error: targetError } = await supabase
        .from("seller_applications")
        .select("id, user_id, shop_name, description, status")
        .eq("id", id)
        .single()

      if (targetError) {
        console.error("[approve] failed at fetch application", targetError)
        throw new Error(`Failed to load application: ${targetError.message}`)
      }
      if (!target) {
        console.error("[approve] application not found", { applicationId: id })
        throw new Error("Application not found")
      }
      if (target.status !== "pending") {
        console.error("[approve] application is not pending", { applicationId: id, status: target.status })
        throw new Error(`Application is already ${target.status}.`)
      }
      const applicationUserId = target.user_id

      const reviewedAt = new Date().toISOString()
      console.log("[approve] resolved application user id", {
        applicationId: id,
        applicationUserId,
      })

      // Step 1: update application status
      const { data: approvedRows, error: approveError } = await supabase
        .from("seller_applications")
        .update({ status: "approved", reviewed_at: reviewedAt, reviewed_by: user.id })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")

      if (approveError) {
        console.error("[approve] failed at step 1 (seller_applications update)", approveError)
        throw new Error(`Step 1 failed (application status): ${approveError.message}`)
      }
      if (!approvedRows || approvedRows.length === 0) {
        console.error("[approve] step 1 updated zero rows", { applicationId: id })
        throw new Error("Step 1 failed (application status): no rows updated.")
      }
      step1Applied = true
      console.log("[approve] step 1 success", { applicationId: id })

      // Step 2: direct profile update (no .single() pre-check)
      console.log("[approve] step 2 start (direct update)", { userId: applicationUserId })
      const { error: updateError, data: updatedRows } = await supabase
        .from("profiles")
        .update({ is_seller: true })
        .eq("id", applicationUserId)
        .select()

      console.log("[approve] step 2 update result", {
        userId: applicationUserId,
        updatedRowsCount: updatedRows?.length ?? 0,
        updateError: updateError ? { message: updateError.message, code: updateError.code, details: updateError.details } : null,
      })
      console.log("[approve] step 2 raw supabase response", {
        userId: applicationUserId,
        updatedRows,
        updateError,
      })

      if (updateError) {
        throw updateError
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(`Step 2 failed: no profile row updated for user ${applicationUserId}`)
      }
      console.log("[approve] step 2 success", { userId: applicationUserId })

      // Step 3: create shop
      const { error: insertShopError } = await supabase.from("shops").insert({
        seller_id: applicationUserId,
        name: target.shop_name,
        description: target.description ?? "",
      })

      if (insertShopError) {
        console.error("[approve] failed at step 3 (shop insert)", insertShopError, { userId: applicationUserId })
        throw new Error(`Step 3 failed (shop insert): ${insertShopError.message}`)
      }
      console.log("[approve] step 3 success", { userId: applicationUserId, shopName: target.shop_name })

      await fetchApplications()
      console.log("[approve] complete + refreshed", { applicationId: id })
      toast({ title: "Approved" })
    } catch (error) {
      if (step1Applied) {
        // Compensation rollback: keep application pending if later steps fail.
        const rollbackReviewedAt = new Date().toISOString()
        const { error: rollbackError } = await supabase
          .from("seller_applications")
          .update({ status: "pending", reviewed_at: rollbackReviewedAt, reviewed_by: user.id })
          .eq("id", id)
          .eq("status", "approved")

        if (rollbackError) {
          console.error("[approve] rollback failed after step 1", rollbackError, { applicationId: id })
        } else {
          console.log("[approve] rollback success -> status returned to pending", { applicationId: id })
        }
      }

      console.error("[approve] approval flow failed", error, { applicationId: id })
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Approval failed.",
        variant: "destructive",
      })
      await fetchApplications()
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      await supabase.from("seller_applications").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", id)
      await fetchApplications()
      toast({ title: "Rejected" })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Shop approvals</h1>
      <p className="mb-4 text-muted-foreground">Pending: {pending.length} | Rejected: {rejected.length}</p>
      {isLoading ? (
        <p>Loading applications...</p>
      ) : (
        <div className="space-y-4">
          {pending.map((a) => (
            <div key={a.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{a.shop_name}</h3>
                <Badge>Pending</Badge>
              </div>
              <p className="text-sm mb-2">{a.description}</p>
              <p className="text-xs text-muted-foreground mb-3">{a.business_registration}</p>
              <div className="flex gap-2">
                <Button onClick={() => void handleApprove(a.id)} disabled={processingId === a.id}>{processingId === a.id ? "Approving..." : "Approve"}</Button>
                <Button variant="outline" onClick={() => void handleReject(a.id)} disabled={processingId === a.id}>{processingId === a.id ? "Working..." : "Reject"}</Button>
              </div>
            </div>
          ))}
          {rejected.map((a) => (
            <div key={a.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{a.shop_name}</h3>
                <Badge variant="destructive">Rejected</Badge>
              </div>
              <p className="text-sm">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
