"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Package } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { parseOrderLines } from "@/lib/seller-dashboard-data"
import {
  buyerTotalFromShipping,
  formatShippingAddressLines,
  buyerCanCancelOrder,
  formatCancellationSummary,
  normalizeOrderStatusForUi,
  orderStatusDisplayLabel,
} from "@/lib/order-display"
import { OrderCancelDialog } from "@/components/order-cancel-dialog"

interface OrderRecord {
  id: string
  status: string
  created_at: string
  shipping_address: unknown
  delivery_instructions: string | null
  items_json: unknown
  delivery_price: number | string | null
  koulthing_fee: number | string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-cyan-100 text-cyan-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function orderSubtotal(order: OrderRecord): number {
  const ship = order.shipping_address as Record<string, unknown> | undefined
  const s = ship?.subtotal
  if (typeof s === "number" && Number.isFinite(s)) return s
  if (typeof s === "string" && Number.isFinite(Number(s))) return Number(s)
  return parseOrderLines(order.items_json).reduce((acc, l) => acc + l.price * l.quantity, 0)
}

function orderTotal(order: OrderRecord): number {
  const fromShip = buyerTotalFromShipping(order.shipping_address)
  if (fromShip != null && Number.isFinite(fromShip)) return fromShip
  return orderSubtotal(order) + num(order.delivery_price) + num(order.koulthing_fee)
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const isBuyer = Boolean(user && user.profileRole === "buyer" && !user.isAdmin)

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from("orders")
      .select(
        "id, status, created_at, shipping_address, delivery_instructions, items_json, delivery_price, koulthing_fee, cancelled_by, cancelled_at, cancellation_reason",
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })

    if (qErr) {
      setError(qErr.message)
      setOrders([])
    } else {
      setOrders((data ?? []) as OrderRecord[])
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const submitBuyerCancel = async (orderId: string, reason: string) => {
    if (!user?.id) return
    setCancellingId(orderId)
    setError(null)
    try {
      const now = new Date().toISOString()
      const { error: upErr } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_by: "buyer",
          cancellation_reason: reason.trim(),
          cancelled_at: now,
        })
        .eq("id", orderId)
        .eq("buyer_id", user.id)
        .in("status", ["pending", "confirmed"])
      if (upErr) {
        setError(upErr.message)
        throw new Error(upErr.message)
      }
      toast({
        title: "Order cancelled successfully",
        description: `Reason: ${reason.trim()}`,
      })
      await loadOrders()
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    if (authLoading || !user || isBuyer) return
    router.replace(user.isAdmin ? "/admin" : "/seller")
  }, [authLoading, user, isBuyer, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-foreground mb-4">Please sign in to view your orders.</p>
            <Button asChild>
              <Link href="/login?redirect=/profile/orders">Sign in</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isBuyer) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">My orders</h1>
          </div>

          {error ? (
            <p className="text-destructive text-sm mb-4">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-muted-foreground">Loading orders…</p>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const lines = parseOrderLines(order.items_json)
                const subtotal = orderSubtotal(order)
                const delivery = num(order.delivery_price)
                const statusKey = normalizeOrderStatusForUi(order.status).toLowerCase()
                const badgeClass =
                  statusStyles[statusKey] ?? "bg-secondary text-secondary-foreground"
                const cancelSummary = formatCancellationSummary(order)
                return (
                  <div key={order.id} className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground font-mono text-sm break-all">
                          {order.id}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full capitalize ${badgeClass}`}
                        >
                          {orderStatusDisplayLabel(order.status)}
                        </span>
                        {buyerCanCancelOrder(order.status) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-destructive border-destructive/40 hover:bg-destructive/10"
                            disabled={cancellingId === order.id}
                            onClick={() => setCancelTargetId(order.id)}
                          >
                            {cancellingId === order.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner className="size-4" />
                                Cancelling…
                              </span>
                            ) : (
                              "Cancel order"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {cancelSummary ? (
                      <p className="text-sm text-destructive mb-4">{cancelSummary}</p>
                    ) : null}

                    <div className="border-t border-border pt-4 mb-4 space-y-2">
                      {lines.map((line) => (
                        <div key={`${order.id}-${line.productId}`} className="flex justify-between gap-4 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{line.name}</p>
                            <p className="text-xs text-muted-foreground">Qty {line.quantity}</p>
                          </div>
                          <p className="font-medium text-foreground shrink-0">
                            {(line.price * line.quantity).toLocaleString()} DZD
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">{subtotal.toLocaleString()} DZD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="font-medium text-foreground">{delivery.toLocaleString()} DZD</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-xl font-bold text-foreground">
                          {orderTotal(order).toLocaleString()} DZD
                        </span>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Delivery address</p>
                        <p className="text-foreground">{formatShippingAddressLines(order.shipping_address)}</p>
                      </div>
                      {order.delivery_instructions ? (
                        <div>
                          <p className="text-muted-foreground mb-1">Delivery instructions</p>
                          <p className="text-foreground">{order.delivery_instructions}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden />
              <p className="text-muted-foreground mb-4">You have not placed any orders yet.</p>
              <Link href="/articles">
                <Button className="rounded-lg">Browse products</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <OrderCancelDialog
        open={cancelTargetId != null}
        onOpenChange={(open) => {
          if (!open) setCancelTargetId(null)
        }}
        title="Cancel order"
        busy={cancelTargetId != null && cancellingId === cancelTargetId}
        onConfirm={async (reason) => {
          if (!cancelTargetId) return
          await submitBuyerCancel(cancelTargetId, reason)
          setCancelTargetId(null)
        }}
      />
    </div>
  )
}
