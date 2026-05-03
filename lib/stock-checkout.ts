import type { SupabaseClient } from "@supabase/supabase-js"

export type CartLineForStock = {
  productId: string
  name: string
  quantity: number
  variantId?: string
  size?: string
  color?: string
}

type AggKey = string

function aggKey(line: CartLineForStock): AggKey {
  const pid = String(line.productId ?? "").trim()
  if (!pid) return ""
  if (line.variantId && String(line.variantId).trim()) {
    return `vid:${String(line.variantId).trim()}`
  }
  const sz = String(line.size ?? "").trim()
  const col = String(line.color ?? "").trim()
  return `pid:${pid}|${sz}|${col}`
}

function parseAggKey(key: AggKey): { variantId: string | null; productId: string; size: string; color: string } | null {
  if (!key) return null
  if (key.startsWith("vid:")) {
    return { variantId: key.slice(4), productId: "", size: "", color: "" }
  }
  const m = key.match(/^pid:([^|]+)\|(.*)\|(.*)$/)
  if (!m) return null
  return { variantId: null, productId: m[1], size: m[2], color: m[3] }
}

function availableFromStockRow(row: { quantity_total?: unknown } | null | undefined): number {
  if (!row) return 0
  return Math.max(0, Math.floor(Number(row.quantity_total) || 0))
}

/** Aggregate cart lines by variant (or product+size+color) and ensure stock covers each. */
export async function validateCheckoutStock(
  supabase: SupabaseClient,
  lines: CartLineForStock[],
): Promise<{ ok: true } | { ok: false; productName: string }> {
  if (lines.length === 0) return { ok: true }

  const aggregated = new Map<AggKey, { name: string; qty: number }>()
  for (const line of lines) {
    const key = aggKey(line)
    if (!key) continue
    const prev = aggregated.get(key)
    const qty = (prev?.qty ?? 0) + (Number(line.quantity) || 0)
    aggregated.set(key, { name: prev?.name ?? line.name, qty })
  }

  const keys = [...aggregated.keys()]
  if (keys.length === 0) return { ok: true }

  const variantIds = keys.filter((k) => k.startsWith("vid:")).map((k) => k.slice(4))
  const comboKeys = keys.filter((k) => !k.startsWith("vid:"))

  if (variantIds.length > 0) {
    const { data, error } = await supabase.from("stocks").select("variant_id, quantity_total").in("variant_id", variantIds)
    if (error) {
      return { ok: false, productName: lines[0]?.name ?? "Unknown" }
    }
    const byVid = new Map((data ?? []).map((row) => [row.variant_id as string, row]))
    for (const vid of variantIds) {
      const { name, qty } = aggregated.get(`vid:${vid}`) ?? { name: "Product", qty: 0 }
      const row = byVid.get(vid)
      const available = availableFromStockRow(row)
      if (available < qty) return { ok: false, productName: name }
    }
  }

  if (comboKeys.length > 0) {
    const productIds = new Set<string>()
    for (const k of comboKeys) {
      const p = parseAggKey(k)
      if (p?.productId) productIds.add(p.productId)
    }
    const ids = [...productIds]
    if (ids.length === 0) return { ok: true }

    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, size, color, stocks ( quantity_total )")
      .in("product_id", ids)

    if (error) {
      return { ok: false, productName: lines[0]?.name ?? "Unknown" }
    }

    const rows = data ?? []
    for (const key of comboKeys) {
      const parsed = parseAggKey(key)
      if (!parsed?.productId) continue
      const { name, qty } = aggregated.get(key) ?? { name: "Product", qty: 0 }
      const row = rows.find(
        (r) =>
          String(r.product_id) === parsed.productId &&
          String(r.size ?? "").trim() === parsed.size &&
          String(r.color ?? "").trim() === parsed.color,
      )
      if (!row) return { ok: false, productName: name }
      const stocks = row.stocks as { quantity_total?: unknown } | { quantity_total?: unknown }[] | null
      const stockRow = Array.isArray(stocks) ? stocks[0] : stocks
      const available = availableFromStockRow(stockRow)
      if (available < qty) return { ok: false, productName: name }
    }
  }

  return { ok: true }
}
