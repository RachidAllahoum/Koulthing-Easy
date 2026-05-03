import type { SupabaseClient } from "@supabase/supabase-js"

/** Available units = stocks.quantity_total (no reservations). */
export async function getAvailableStock(supabase: SupabaseClient, variantId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_available_stock", { p_variant_id: variantId })
  if (error) {
    console.warn("[inventory] get_available_stock", error.message)
    return 0
  }
  return typeof data === "number" ? Math.max(0, Math.floor(data)) : Math.max(0, Math.floor(Number(data) || 0))
}
