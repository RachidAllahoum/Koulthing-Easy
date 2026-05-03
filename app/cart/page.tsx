"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { computeKoulthingFee, KOULTHING_FEE_LABEL } from "@/lib/koulthing-fee"
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Package,
} from "lucide-react"
import { NoProductImage } from "@/components/no-uploaded-media"

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, total } = useCart()
  const { user } = useAuth()
  const [busyLineId, setBusyLineId] = useState<string | null>(null)

  const shipping = total > 10000 ? 0 : 500
  const koulthingFee = computeKoulthingFee(total, shipping)
  const finalTotal = total + shipping + koulthingFee

  const isBuyerUser = Boolean(user && user.profileRole === "buyer" && !user.isAdmin)
  const canManageCart = !user || isBuyerUser
  const canCheckoutAsBuyer = isBuyerUser

  const handleCheckout = () => {
    if (!canManageCart) {
      return
    }
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/checkout")}`)
      return
    }
    if (!canCheckoutAsBuyer) {
      alert("Admin accounts cannot check out.")
      return
    }
    router.push("/checkout")
  }

  const getAvailableForLine = async (lineId: string): Promise<number | null> => {
    const line = items.find((x) => x.id === lineId)
    if (!line) return null
    if (line.variantId) {
      const { data, error } = await supabase
        .from("stocks")
        .select("quantity_total")
        .eq("variant_id", line.variantId)
        .limit(1)
        .maybeSingle()
      if (error) return null
      return Math.max(0, Math.floor(Number(data?.quantity_total) || 0))
    }
    const { data, error } = await supabase
      .from("products")
      .select("stock")
      .eq("id", line.productId)
      .limit(1)
      .maybeSingle()
    if (error) return null
    return Math.max(0, Math.floor(Number(data?.stock) || 0))
  }

  const handleIncrease = async (lineId: string) => {
    const line = items.find((x) => x.id === lineId)
    if (!line) return
    setBusyLineId(lineId)
    try {
      const available = await getAvailableForLine(lineId)
      if (available != null && line.quantity + 1 > available) {
        alert(`Only ${available} items available`)
        return
      }
      updateQuantity(lineId, line.quantity + 1)
    } finally {
      setBusyLineId(null)
    }
  }

  if (!canManageCart) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Cart Unavailable</h1>
            <p className="text-muted-foreground mb-6">Shopping cart is available for buyer accounts only.</p>
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link href="/articles">
                Browse Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">
              Looks like you haven&apos;t added any items to your cart yet.
            </p>
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link href="/articles">
                Start Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Shopping Cart</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
          Shopping Cart ({items.length} items)
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 md:p-6"
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl bg-secondary overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <NoProductImage />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/shop/${item.shopId}`}
                          className="text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          {item.shopName}
                        </Link>
                        <h3 className="font-medium text-foreground line-clamp-2 mt-1">
                          {item.name}
                        </h3>
                        {(item.color || item.size) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                            {item.color ? <span>Color: {item.color}</span> : null}
                            {item.size ? <span>Size: {item.size}</span> : null}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity */}
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={busyLineId === item.id}
                          className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => void handleIncrease(item.id)}
                          disabled={busyLineId === item.id}
                          className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <p className="font-semibold text-foreground">
                        {(item.price * item.quantity).toLocaleString()} DZD
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-8 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>

              <div className="space-y-3 py-4 border-t border-b border-border">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{total.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "0 DZD" : `${shipping.toLocaleString()} DZD`}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{KOULTHING_FEE_LABEL}</span>
                  <span>{koulthingFee.toLocaleString()} DZD</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-semibold text-foreground">
                <span>Total</span>
                <span>{finalTotal.toLocaleString()} DZD</span>
              </div>

              <Button size="lg" className="w-full rounded-full gap-2" onClick={handleCheckout}>
                {user ? "Proceed to Checkout" : "Sign in to check out"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  You can keep browsing; your cart stays on this device until you sign in.
                </p>
              )}

              <Button 
                variant="outline" 
                className="w-full rounded-full"
                asChild
              >
                <Link href="/articles">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
