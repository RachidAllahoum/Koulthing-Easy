"use client"

import { supabase } from "@/lib/supabase-client"

export interface PendingSellerApplication {
  id: string
  user_id: string
  shop_name: string
  business_registration: string
  description: string
  submitted_at: string
  applicant_name: string
  applicant_email: string
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

  const { data: rows, error } = await supabase
    .from("seller_applications")
    .select("id, user_id, shop_name, business_registration, description, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load pending applications: ${error.message}`)
  }

  const userIds = Array.from(new Set((rows ?? []).map((row) => row.user_id)))
  let profilesById: Record<string, { full_name: string | null; email: string | null }> = {}

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)

    if (profileError) {
      throw new Error(`Failed to load applicant profiles: ${profileError.message}`)
    }

    profilesById = (profiles ?? []).reduce(
      (acc, row) => {
        acc[row.id] = { full_name: row.full_name, email: row.email }
        return acc
      },
      {} as Record<string, { full_name: string | null; email: string | null }>,
    )
  }

  return (rows ?? []).map((row) => ({
    ...row,
    applicant_name: profilesById[row.user_id]?.full_name || "Seller",
    applicant_email: profilesById[row.user_id]?.email || "",
  }))
}

export async function approveSellerApplication(applicationId: string): Promise<void> {
  const admin = await requireAdminProfile()

  const { data: application, error: appError } = await supabase
    .from("seller_applications")
    .select("id, user_id, shop_name, description, status")
    .eq("id", applicationId)
    .single()

  if (appError) {
    throw new Error(`Failed to load application: ${appError.message}`)
  }

  if (application.status !== "pending") {
    throw new Error(`Application is already ${application.status}.`)
  }

  const reviewedAt = new Date().toISOString()

  const { error: approveError } = await supabase
    .from("seller_applications")
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewed_by: admin.id,
    })
    .eq("id", application.id)
    .eq("status", "pending")

  if (approveError) {
    throw new Error(`Failed to approve application: ${approveError.message}`)
  }

  const { error: promoteError } = await supabase
    .from("profiles")
    .update({ is_seller: true })
    .eq("id", application.user_id)

  if (promoteError) {
    throw new Error(`Failed to promote seller profile: ${promoteError.message}`)
  }

  const { data: existingShops, error: shopLookupError } = await supabase
    .from("shops")
    .select("id")
    .eq("seller_id", application.user_id)
    .limit(1)

  if (shopLookupError) {
    throw new Error(`Failed to check existing shop: ${shopLookupError.message}`)
  }

  if ((existingShops ?? []).length === 0) {
    const { error: createShopError } = await supabase.from("shops").insert({
      seller_id: application.user_id,
      name: application.shop_name,
      description: application.description ?? "",
      is_active: true,
    })

    if (createShopError) {
      throw new Error(`Failed to create shop: ${createShopError.message}`)
    }
  }
}

export async function rejectSellerApplication(applicationId: string): Promise<void> {
  const admin = await requireAdminProfile()
  const reviewedAt = new Date().toISOString()

  const { data: rows, error } = await supabase
    .from("seller_applications")
    .update({
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by: admin.id,
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
}
