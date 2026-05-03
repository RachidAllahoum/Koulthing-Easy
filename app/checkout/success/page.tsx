"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CheckCircle, Package, ArrowRight, Home } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { buyerTotalFromShipping, formatShippingAddressLines } from "@/lib/order-display"
import { KOULTHING_FEE_LABEL } from "@/lib/koulthing-fee"

function paymentLabel(method: unknown): string {
  if (method === "cod") return "Cash on delivery"
  if (method === "edahabia") return "DAHABIA"
  return typeof method === "string" ? method : "—"
}

function CheckoutSuccessInner() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [loading, setLoading] = useState(!!orderId)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<{
    id: string
    status: string
    shipping_address: unknown
    koulthing_fee: number | string | null
    delivery_price: number | string | null
  } | null>(null)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      const { data, error: qErr } = await supabase
        .from("orders")
        .select("id, status, shipping_address, koulthing_fee, delivery_price")
        .eq("id", orderId)
        .maybeSingle()
      if (cancelled) return
      if (qErr) {
        setError(qErr.message)
        setOrder(null)
      } else if (!data) {
        setError("Order not found")
        setOrder(null)
      } else {
        setOrder(data)
        setError(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  const shipping = order?.shipping_address as Record<string, unknown> | undefined
  const paymentMethod = shipping?.paymentMethod
  const addressText = order ? formatShippingAddressLines(order.shipping_address) : null
  const grand =
    order != null ? (buyerTotalFromShipping(order.shipping_address) ?? null) : null
  const nf = (v: unknown) => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
    return Number.isFinite(n) ? n : 0
  }
  const feeShown = order != null ? nf(order.koulthing_fee) : 0
  const deliveryShown = order != null ? nf(order.delivery_price) : 0
  const subtotalShown = shipping?.subtotal != null ? nf(shipping.subtotal) : null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Order confirmed</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>

          <div className="bg-card border border-border rounded-xl p-6 mb-8 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <p className="text-sm text-muted-foreground">Order number</p>
                <p className="font-semibold text-foreground font-mono text-sm break-all">
                  {loading ? "…" : order?.id ?? (orderId || "—")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive py-4">{error}</p>
            ) : (
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium capitalize">
                    {order?.status ?? "pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estimated delivery</span>
                  <span className="font-medium text-foreground">5–7 business days</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payment method</span>
                  <span className="font-medium text-foreground">{paymentLabel(paymentMethod)}</span>
                </div>
                {grand != null ? (
                  <>
                    {subtotalShown != null ? (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">
                          {subtotalShown.toLocaleString()} DZD
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-medium text-foreground">
                        {deliveryShown.toLocaleString()} DZD
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{KOULTHING_FEE_LABEL}</span>
                      <span className="font-medium text-foreground">{feeShown.toLocaleString()} DZD</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-foreground">{grand.toLocaleString()} DZD</span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Shipping address</p>
              <p className="text-sm text-foreground">{addressText ?? "See your order confirmation email."}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            You can track this order anytime from{" "}
            <Link href="/profile/orders" className="text-primary underline-offset-4 hover:underline">
              My orders
            </Link>
            .
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-xl gap-2">
              <Link href="/articles">
                Continue shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl gap-2">
              <Link href="/">
                <Home className="w-4 h-4" />
                Homepage
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading…</p>
          </main>
          <Footer />
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  )
}
