"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatShippingAddressLines, orderBuyerLabel, orderStatusDisplayLabel } from "@/lib/order-display"

type AdminOrder = {
  id: string
  status: string
  created_at: string
  items_json: unknown
  shipping_address: unknown
  delivery_instructions: string | null
  delivery_price: number | string | null
  koulthing_fee: number | string | null
}

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function orderShopNames(itemsJson: unknown): string[] {
  if (!Array.isArray(itemsJson)) return []
  const out = new Set<string>()
  for (const raw of itemsJson) {
    if (!raw || typeof raw !== "object") continue
    const rec = raw as Record<string, unknown>
    const n = typeof rec.shopName === "string" ? rec.shopName.trim() : ""
    if (n) out.add(n)
  }
  return [...out]
}

function orderSubtotal(itemsJson: unknown): number {
  if (!Array.isArray(itemsJson)) return 0
  return itemsJson.reduce((sum, raw) => {
    if (!raw || typeof raw !== "object") return sum
    const rec = raw as Record<string, unknown>
    const price = num(rec.price)
    const quantity = Math.max(0, Math.floor(num(rec.quantity)))
    return sum + price * quantity
  }, 0)
}

export default function AdminOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [shopFilter, setShopFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.isAdmin) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data } = await supabase
        .from("orders")
        .select("id, status, created_at, items_json, shipping_address, delivery_instructions, delivery_price, koulthing_fee")
        .order("created_at", { ascending: false })
        .limit(2000)
      if (!cancelled) {
        setOrders((data ?? []) as AdminOrder[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.isAdmin])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status.toLowerCase() !== statusFilter) return false
      if (shopFilter.trim()) {
        const q = shopFilter.trim().toLowerCase()
        const shopNames = orderShopNames(o.items_json).join(" ").toLowerCase()
        if (!shopNames.includes(q)) return false
      }
      const t = new Date(o.created_at).getTime()
      if (dateFrom) {
        const fromT = new Date(`${dateFrom}T00:00:00`).getTime()
        if (t < fromT) return false
      }
      if (dateTo) {
        const toT = new Date(`${dateTo}T23:59:59`).getTime()
        if (t > toT) return false
      }
      return true
    })
  }, [orders, statusFilter, shopFilter, dateFrom, dateTo])

  if (!user?.isAdmin) return null

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">All Orders</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <select
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Input
          placeholder="Filter by shop name"
          className="h-10 rounded-xl"
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
        />
        <Input type="date" className="h-10 rounded-xl" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="h-10 rounded-xl" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Spinner className="size-4" />
          Loading orders…
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isOpen = openId === o.id
            const subtotal = orderSubtotal(o.items_json)
            const shipping = num(o.delivery_price)
            const fee = num(o.koulthing_fee)
            const total = subtotal + shipping + fee
            const shops = orderShopNames(o.items_json)
            const ship = o.shipping_address as Record<string, unknown> | undefined
            const email = typeof ship?.email === "string" ? ship.email : undefined
            const buyer = orderBuyerLabel(o.shipping_address, email)
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card">
                <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs break-all text-foreground">{o.id}</p>
                    <p className="text-sm text-muted-foreground">{buyer}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">{orderStatusDisplayLabel(o.status)}</Badge>
                    <span className="text-sm font-medium">{Math.round(total).toLocaleString()} DZD</span>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setOpenId(isOpen ? null : o.id)}>
                      {isOpen ? "Hide details" : "View details"}
                    </Button>
                  </div>
                </div>
                {isOpen ? (
                  <div className="border-t border-border p-4 text-sm space-y-3">
                    <p><span className="text-muted-foreground">Shops:</span> {shops.join(", ") || "—"}</p>
                    <p><span className="text-muted-foreground">Shipping:</span> {formatShippingAddressLines(o.shipping_address)}</p>
                    {o.delivery_instructions ? (
                      <p><span className="text-muted-foreground">Instructions:</span> {o.delivery_instructions}</p>
                    ) : null}
                    <div className="grid sm:grid-cols-3 gap-2">
                      <p><span className="text-muted-foreground">Subtotal:</span> {Math.round(subtotal).toLocaleString()} DZD</p>
                      <p><span className="text-muted-foreground">Delivery:</span> {Math.round(shipping).toLocaleString()} DZD</p>
                      <p><span className="text-muted-foreground">Platform fee:</span> {Math.round(fee).toLocaleString()} DZD</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No orders match the selected filters.</p> : null}
        </div>
      )}
    </div>
  )
}

