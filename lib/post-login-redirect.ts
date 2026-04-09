"use client"

import { supabase } from "@/lib/supabase-client"

/** Resolves where to send the user after a successful password login (uses `profiles` + latest application). */
export async function resolvePostLoginPath(userId: string): Promise<string> {
  const { data: p, error } = await supabase
    .from("profiles")
    .select("role, is_approved, is_admin")
    .eq("id", userId)
    .maybeSingle()

  if (error || !p) {
    return "/"
  }

  if (p.is_admin === true) {
    return "/admin"
  }

  const role = p.role ?? "buyer"
  if (role === "buyer") {
    return "/"
  }

  if (role === "seller") {
    if (p.is_approved === true) {
      return "/seller"
    }

    const { data: rows } = await supabase
      .from("seller_applications")
      .select("status")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)

    const latest = rows?.[0]?.status as string | undefined
    if (latest === "rejected") {
      return "/seller/pending-approval?reason=rejected"
    }
    return "/seller/pending-approval"
  }

  return "/"
}
