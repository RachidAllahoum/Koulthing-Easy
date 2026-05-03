import { parseOrderLines, linesForShop, sellerSubtotal, customerLabelFromShipping } from "@/lib/seller-dashboard-data"

/** Canonical lifecycle statuses (no `completed` — legacy rows are migrated to `delivered`). */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Map legacy DB/UI values for display only. */
export function normalizeOrderStatusForUi(status: string): string {
  const s = status.toLowerCase()
  return s === "completed" ? "delivered" : status
}

export function orderStatusDisplayLabel(status: string): string {
  return normalizeOrderStatusForUi(status).replace(/_/g, " ")
}

export function sellerCanCancelOrder(from: string): boolean {
  const s = from.toLowerCase()
  return s === "pending" || s === "confirmed"
}

export function buyerCanCancelOrder(from: string): boolean {
  return sellerCanCancelOrder(from)
}

/**
 * Next statuses for the seller dropdown (excludes `cancelled` — use the Cancel action + modal).
 * Confirmed → delivered directly (no intermediate steps required).
 */
export function allowedSellerNextStatuses(current: string): OrderStatus[] {
  const f = current.toLowerCase()
  if (f === "pending") return []
  if (f === "confirmed" || f === "processing" || f === "shipped") return ["delivered"]
  return []
}

export function canSellerApproveOrRejectPending(current: string): boolean {
  return current === "pending"
}

export function isValidSellerTransition(from: string, to: OrderStatus): boolean {
  const f = from.toLowerCase()
  if (f === "pending" && (to === "confirmed" || to === "cancelled")) return true
  if (to === "cancelled" && sellerCanCancelOrder(from)) return true
  if (to === "delivered" && (f === "confirmed" || f === "processing" || f === "shipped")) return true
  return false
}

export function isTerminalOrderStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "delivered" || s === "cancelled" || s === "completed"
}

export function orderIsSingleVendorForShop(itemsJson: unknown, shopId: string): boolean {
  const lines = parseOrderLines(itemsJson)
  if (lines.length === 0) return false
  const ids = new Set(lines.map((l) => l.shopId))
  return ids.size === 1 && ids.has(shopId)
}

export function formatShippingAddressLines(shipping: unknown): string {
  if (!shipping || typeof shipping !== "object") return "—"
  const a = shipping as Record<string, unknown>
  const parts: string[] = []
  const fullName = typeof a.fullName === "string" ? a.fullName.trim() : ""
  const addr = typeof a.address === "string" ? a.address.trim() : ""
  const city = typeof a.city === "string" ? a.city.trim() : ""
  const wilaya = typeof a.wilaya === "string" ? a.wilaya.trim() : ""
  if (fullName) parts.push(fullName)
  if (addr) parts.push(addr)
  if (city || wilaya) parts.push([city, wilaya].filter(Boolean).join(", "))
  const phone = typeof a.phone === "string" ? a.phone.trim() : ""
  const email = typeof a.email === "string" ? a.email.trim() : ""
  if (phone) parts.push(phone)
  if (email) parts.push(email)
  return parts.length ? parts.join(" · ") : "—"
}

export function buyerTotalFromShipping(shipping: unknown): number | null {
  if (!shipping || typeof shipping !== "object") return null
  const t = (shipping as Record<string, unknown>).total
  return typeof t === "number" ? t : typeof t === "string" ? Number(t) : null
}

function numericOrderField(v: unknown): number {
  if (v == null) return 0
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function orderBuyerGrandTotal(order: {
  shipping_address: unknown
  items_json: unknown
  delivery_price?: unknown
  koulthing_fee?: unknown
}): number {
  const fromShip = buyerTotalFromShipping(order.shipping_address)
  if (fromShip != null && Number.isFinite(fromShip)) return fromShip
  const lines = parseOrderLines(order.items_json)
  const sub = lines.reduce((s, l) => s + l.price * l.quantity, 0)
  return sub + numericOrderField(order.delivery_price) + numericOrderField(order.koulthing_fee)
}

export function sellerAttributedGrandTotal(
  order: {
    shipping_address: unknown
    items_json: unknown
    delivery_price?: unknown
    koulthing_fee?: unknown
  },
  shopId: string,
): number {
  const sellerLines = linesForShop(parseOrderLines(order.items_json), shopId)
  if (sellerLines.length === 0) return 0
  const sellerSub = sellerSubtotal(sellerLines)
  const allLines = parseOrderLines(order.items_json)
  const cartSub = allLines.reduce((s, l) => s + l.price * l.quantity, 0)
  if (cartSub <= 0) return 0
  return (orderBuyerGrandTotal(order) * sellerSub) / cartSub
}

export function sellerOrderLinesSummary(itemsJson: unknown, shopId: string) {
  const lines = linesForShop(parseOrderLines(itemsJson), shopId)
  const subtotal = sellerSubtotal(lines)
  const label = lines.map((l) => `${l.name} ×${l.quantity}`).join(", ") || "—"
  return { lines, subtotal, label }
}

export const SELLER_ORDER_TABS = ["All", "Pending", "Confirmed", "Delivered", "Cancelled"] as const
export type SellerOrderTab = (typeof SELLER_ORDER_TABS)[number]

export function orderMatchesSellerTab(status: string, tab: SellerOrderTab): boolean {
  const s = normalizeOrderStatusForUi(status).toLowerCase()
  if (tab === "All") return true
  if (tab === "Pending") return s === "pending"
  if (tab === "Confirmed") return s === "confirmed" || s === "processing" || s === "shipped"
  if (tab === "Delivered") return s === "delivered"
  if (tab === "Cancelled") return s === "cancelled"
  return true
}

/** Advance pipeline to delivered in one step (confirmed / processing / shipped). */
export function sellerFulfillmentAdvanceTarget(from: string): OrderStatus | null {
  const f = from.toLowerCase()
  if (f === "confirmed" || f === "processing" || f === "shipped") return "delivered"
  return null
}

export function sellerAttributedKoulthingFee(
  order: { items_json: unknown; koulthing_fee?: unknown },
  shopId: string,
): number {
  const feeRaw = order.koulthing_fee
  const fee = typeof feeRaw === "number" ? feeRaw : feeRaw != null ? Number(feeRaw) : 0
  const f = Number.isFinite(fee) ? fee : 0
  const allLines = parseOrderLines(order.items_json)
  const cartSub = allLines.reduce((s, l) => s + l.price * l.quantity, 0)
  if (cartSub <= 0) return 0
  const sellerLines = linesForShop(allLines, shopId)
  const sellerSub = sellerSubtotal(sellerLines)
  return Math.round((f * sellerSub) / cartSub)
}

export function sellerNetAfterAttributedFee(
  order: { items_json: unknown; koulthing_fee?: unknown },
  shopId: string,
  sellerSubtotalAmount: number,
): number {
  return Math.round(sellerSubtotalAmount - sellerAttributedKoulthingFee(order, shopId))
}

export function orderBuyerLabel(shipping: unknown, fallbackEmail?: string): string {
  const fromShip = customerLabelFromShipping(shipping)
  if (fromShip !== "Customer") return fromShip
  if (fallbackEmail) return fallbackEmail
  return "Customer"
}

export function formatCancellationSummary(order: {
  status: string
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
}): string | null {
  if (order.status.toLowerCase() !== "cancelled") return null
  const who =
    order.cancelled_by === "seller" ? "seller" : order.cancelled_by === "buyer" ? "buyer" : "user"
  const when = order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : "unknown date"
  const reason = order.cancellation_reason?.trim() || ""
  if (!reason) return `Cancelled by ${who} on ${when}.`
  return `Cancelled by ${who} on ${when} – Reason: ${reason}`
}
