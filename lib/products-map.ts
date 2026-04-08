import type { Article } from "@/lib/filter-utils"

export interface ProductRow {
  id: string
  shop_id: string
  name: string
  description: string | null
  price: number | string
  sizes_array: string[] | null
  colors_array: string[] | null
  stock: number
  images_array: string[] | null
  created_at: string
  shops?: { name: string; seller_id?: string; is_active?: boolean } | { name: string; seller_id?: string; is_active?: boolean }[] | null
}

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=400&fit=crop"

export function mapProductToArticle(row: ProductRow, shopNameFallback = "Shop"): Article {
  const joined = row.shops
  const shopName =
    joined && !Array.isArray(joined)
      ? joined.name
      : Array.isArray(joined) && joined[0]?.name
        ? joined[0].name
        : shopNameFallback
  const price = typeof row.price === "string" ? parseFloat(row.price) : row.price
  const image = row.images_array?.[0] || PLACEHOLDER_IMG

  return {
    id: row.id,
    title: row.name,
    price: Number.isFinite(price) ? price : 0,
    shopName,
    shopId: row.shop_id,
    rating: 4.5,
    reviewCount: 0,
    image,
    category: shopName,
    createdAt: row.created_at,
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
