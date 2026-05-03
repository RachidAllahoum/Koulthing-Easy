import type { Article } from "@/lib/filter-utils"

export function normalizeStringArray(v: string[] | null | undefined): string[] {
  if (!Array.isArray(v)) return []
  return v.map((s) => String(s).trim()).filter(Boolean)
}

export interface VariantStockRow {
  quantity_total: number
}

export interface ProductVariantRow {
  id: string
  size: string
  color: string
  sku: string
  price: number | string | null
  stocks?: VariantStockRow[] | VariantStockRow | null
}

export interface ProductRow {
  id: string
  shop_id: string
  name: string
  description: string | null
  price: number | string
  base_price?: number | string | null
  sizes_array: string[] | null
  colors_array: string[] | null
  stock: number
  images_array: string[] | null
  created_at: string
  product_variants?: ProductVariantRow[] | null
  shops?:
    | { name: string; seller_id?: string; is_active?: boolean; shop_category?: string | null }
    | { name: string; seller_id?: string; is_active?: boolean; shop_category?: string | null }[]
    | null
}

export function variantStockTotals(stocks: ProductVariantRow["stocks"]): { total: number } {
  const row = Array.isArray(stocks) ? stocks[0] : stocks
  const total = Math.max(0, Math.floor(Number(row?.quantity_total) || 0))
  return { total }
}

export function variantAvailable(variant: ProductVariantRow): number {
  const { total } = variantStockTotals(variant.stocks)
  return total
}

function parseBasePrice(row: ProductRow): number {
  const raw = row.base_price ?? row.price
  return typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
}

export function mapProductToArticle(row: ProductRow, shopNameFallback = "Shop"): Article {
  const joined = row.shops
  const shopName =
    joined && !Array.isArray(joined)
      ? joined.name
      : Array.isArray(joined) && joined[0]?.name
        ? joined[0].name
        : shopNameFallback
  const shopSellerId =
    joined && !Array.isArray(joined)
      ? (joined.seller_id ?? null)
      : Array.isArray(joined) && joined[0]
        ? (joined[0].seller_id ?? null)
        : null
  const category =
    joined && !Array.isArray(joined)
      ? joined.shop_category?.trim() || shopName
      : Array.isArray(joined) && joined[0]
        ? joined[0].shop_category?.trim() || shopName
        : shopName
  const basePrice = parseBasePrice(row)
  let listPrice = typeof row.price === "string" ? parseFloat(row.price) : row.price
  if (!Number.isFinite(listPrice)) listPrice = 0
  const image = row.images_array?.filter(Boolean)[0] ?? ""
  const stockRaw = row.stock
  let stock =
    typeof stockRaw === "number" && Number.isFinite(stockRaw)
      ? Math.max(0, Math.floor(stockRaw))
      : Math.max(0, Math.floor(Number(stockRaw) || 0))

  const variants = row.product_variants ?? []
  let defaultVariantId: string | null = null
  let defaultVariantSku: string | null = null

  if (variants.length > 0) {
    let minPrice = Number.POSITIVE_INFINITY
    let totalAvail = 0
    const inStock: ProductVariantRow[] = []
    for (const v of variants) {
      const av = variantAvailable(v)
      if (av <= 0) continue
      totalAvail += av
      inStock.push(v)
      const rawP = v.price
      const vp =
        rawP != null && String(rawP).trim() !== ""
          ? typeof rawP === "string"
            ? parseFloat(rawP)
            : Number(rawP)
          : basePrice
      if (Number.isFinite(vp)) {
        minPrice = Math.min(minPrice, vp)
      }
    }
    if (minPrice !== Number.POSITIVE_INFINITY) {
      listPrice = minPrice
    }
    stock = totalAvail
    if (inStock.length === 1) {
      defaultVariantId = String(inStock[0].id)
      defaultVariantSku = inStock[0].sku ? String(inStock[0].sku) : null
    }
  }

  return {
    id: row.id,
    title: row.name,
    price: Number.isFinite(listPrice) ? listPrice : 0,
    shopName,
    shopId: row.shop_id,
    shopSellerId,
    rating: 4.5,
    reviewCount: 0,
    image,
    category,
    createdAt: row.created_at,
    sizes: normalizeStringArray(row.sizes_array),
    colors: normalizeStringArray(row.colors_array),
    soldCount: 0,
    stock,
    defaultVariantId,
    defaultVariantSku,
  }
}

const COLOR_LOOKUP: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#EAB308",
  purple: "#A855F7",
  pink: "#EC4899",
  orange: "#F97316",
  black: "#171717",
  white: "#FFFFFF",
  gray: "#6B7280",
  grey: "#6B7280",
  brown: "#92400E",
  navy: "#1E3A5F",
  cream: "#F5F0E6",
  sage: "#9CAF88",
  rose: "#E8B4B8",
}

function hashHue(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h % 360
}

export function mapColorNameToSwatch(name: string): { name: string; value: string } {
  const key = name.trim().toLowerCase()
  if (COLOR_LOOKUP[key]) {
    return { name, value: COLOR_LOOKUP[key] }
  }
  const hue = hashHue(key)
  return { name, value: `hsl(${hue}, 55%, 45%)` }
}
