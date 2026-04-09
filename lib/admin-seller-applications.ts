"use client"

import { supabase } from "@/lib/supabase-client"

export type SellerApplicationRow = Record<string, unknown> & {
  id: string
  user_id: string
  status: string
  shop_name?: string | null
  description?: string | null
  logo_url?: string | null
}

export interface PendingSellerApplication {
  profile: {
    id: string
    email: string | null
    full_name: string | null
    role: string | null
    is_approved: boolean | null
  }
  application: SellerApplicationRow | null
}

async function requireAdminProfile(): Promise<{ id: string }> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error("You must be signed in.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", authData.user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to load admin profile: ${profileError.message}`)
  }

  if (!profile.is_admin) {
    throw new Error("Only admins can perform this action.")
  }

  return { id: authData.user.id }
}

export async function fetchPendingSellerApplications(): Promise<PendingSellerApplication[]> {
  await requireAdminProfile()

  const { data: pendingProfiles, error: sellersError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_approved")
    .eq("role", "seller")
    .eq("is_approved", false)

  if (sellersError) {
    throw new Error(`Failed to load pending seller profiles: ${sellersError.message}`)
  }

  const sellerList = pendingProfiles ?? []
  const userIds = sellerList.map((p) => p.id)

  let applicationsByUserId: Record<string, SellerApplicationRow> = {}
  if (userIds.length > 0) {
    const { data: apps, error: appsError } = await supabase
      .from("seller_applications")
      .select("*")
      .in("user_id", userIds)
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })

    if (appsError) {
      throw new Error(`Failed to load applications: ${appsError.message}`)
    }

    for (const row of apps ?? []) {
      const r = row as SellerApplicationRow
      if (!applicationsByUserId[r.user_id]) applicationsByUserId[r.user_id] = r
    }
  }

  return sellerList.map((p) => ({
    profile: p,
    application: applicationsByUserId[p.id] ?? null,
  }))
}

export async function approveSellerApplication(applicationId: string, reviewedBy: string): Promise<void> {
  await requireAdminProfile()

  const { data: application, error: appError } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("id", applicationId)
    .single()

  if (appError || !application) {
    throw new Error(`Failed to load application: ${appError?.message ?? "not found"}`)
  }

  const app = application as SellerApplicationRow
  if (app.status !== "pending") {
    throw new Error(`Application is already ${app.status}.`)
  }

  const userId = app.user_id as string
  const reviewedAt = new Date().toISOString()

  const { data: promoted, error: profileError } = await supabase
    .from("profiles")
    .update({ is_approved: true })
    .eq("id", userId)
    .eq("role", "seller")
    .select("id")

  if (profileError) {
    throw new Error(`Failed to approve seller profile: ${profileError.message}`)
  }
  if (!promoted?.length) {
    throw new Error("No profile updated (expected role=seller, is_approved=false).")
  }

  const { data: existingShops, error: shopLookupError } = await supabase
    .from("shops")
    .select("id")
    .eq("seller_id", userId)
    .limit(1)

  if (shopLookupError) {
    await supabase.from("profiles").update({ is_approved: false }).eq("id", userId).eq("role", "seller")
    throw new Error(`Failed to check existing shop: ${shopLookupError.message}`)
  }

  if ((existingShops ?? []).length > 0) {
    await supabase.from("profiles").update({ is_approved: false }).eq("id", userId).eq("role", "seller")
    throw new Error("Seller already has a shop.")
  }

  const { data: shopRow, error: createShopError } = await supabase
    .from("shops")
    .insert({
      seller_id: userId,
      name: (app.shop_name as string) ?? "Shop",
      description: (app.description as string | null) ?? "",
      logo_url: (app.logo_url as string | null) ?? null,
      is_active: true,
    })
    .select("id")
    .maybeSingle()

  if (createShopError || !shopRow?.id) {
    await supabase.from("profiles").update({ is_approved: false }).eq("id", userId).eq("role", "seller")
    throw new Error(`Failed to create shop: ${createShopError?.message ?? "no id"}`)
  }

  const { data: updatedApp, error: approveError } = await supabase
    .from("seller_applications")
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
    })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("id")

  if (approveError || !updatedApp?.length) {
    await supabase.from("shops").delete().eq("id", shopRow.id)
    await supabase.from("profiles").update({ is_approved: false }).eq("id", userId).eq("role", "seller")
    throw new Error(`Failed to finalize application: ${approveError?.message ?? "no rows"}`)
  }
}

export async function rejectSellerApplication(applicationId: string, reviewedBy: string): Promise<void> {
  await requireAdminProfile()
  const reviewedAt = new Date().toISOString()

  const { data: appRow, error: loadError } = await supabase
    .from("seller_applications")
    .select("user_id")
    .eq("id", applicationId)
    .maybeSingle()

  if (loadError || !appRow) {
    throw new Error(loadError?.message ?? "Application not found.")
  }

  const { data: rows, error } = await supabase
    .from("seller_applications")
    .update({
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
    })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("id")

  if (error) {
    throw new Error(`Failed to reject application: ${error.message}`)
  }

  if (!rows || rows.length === 0) {
    throw new Error("Application is not pending or no longer exists.")
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_approved: false })
    .eq("id", appRow.user_id)
    .eq("role", "seller")

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`)
  }
}
