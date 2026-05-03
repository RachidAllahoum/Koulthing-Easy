/** Parsed line from `orders.items_json` (see checkout payload). */
export interface OrderItemLine {
  productId: string
  shopId: string
  name: string
  price: number
  quantity: number
}

export function parseOrderLines(itemsJson: unknown): OrderItemLine[] {
  if (!Array.isArray(itemsJson)) return []
  const out: OrderItemLine[] = []
  for (const raw of itemsJson) {
    if (!raw || typeof raw !== "object") continue
    const o = raw as Record<string, unknown>
    const productId = String(o.productId ?? "")
    const shopId = String(o.shopId ?? "")
    const name = typeof o.name === "string" ? o.name : "Product"
    const price = typeof o.price === "number" ? o.price : Number(o.price) || 0
    const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity) || 0
    if (!productId || !shopId) continue
    out.push({ productId, shopId, name, price, quantity })
  }
  return out
}

export function linesForShop(lines: OrderItemLine[], shopId: string): OrderItemLine[] {
  return lines.filter((l) => l.shopId === shopId)
}

export function sellerSubtotal(lines: OrderItemLine[]): number {
  return lines.reduce((s, l) => s + l.price * l.quantity, 0)
}

export function customerLabelFromShipping(shippingAddress: unknown): string {
  if (!shippingAddress || typeof shippingAddress !== "object") return "Customer"
  const a = shippingAddress as Record<string, unknown>
  const full = typeof a.fullName === "string" ? a.fullName.trim() : ""
  if (full) return full
  const fn = typeof a.firstName === "string" ? a.firstName : ""
  const ln = typeof a.lastName === "string" ? a.lastName : ""
  const name = `${fn} ${ln}`.trim()
  if (name) return name
  if (typeof a.email === "string" && a.email) return a.email
  return "Customer"
}
