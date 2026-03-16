"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Package,
} from "lucide-react"

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, total } = useCart()
  const { isAuthenticated, user } = useAuth()

  const shipping = total > 10000 ? 0 : 500
  const finalTotal = total + shipping

  // Check if user can purchase (only buyers can purchase)
  const canPurchase = !user || user.role === "buyer"

  const handleCheckout = () => {
    if (!canPurchase) {
      alert("Admin and seller accounts cannot make purchases. Please use a buyer account.")
      return
    }
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout")
      return
    }
    router.push("/checkout")
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
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
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
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          {item.color && <span>Color: {item.color}</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity */}
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
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
                  <span className={shipping === 0 ? "text-green-600" : ""}>
                    {shipping === 0 ? "FREE" : `${shipping.toLocaleString()} DZD`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-semibold text-foreground">
                <span>Total</span>
                <span>{finalTotal.toLocaleString()} DZD</span>
              </div>

              {total <= 10000 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                  Free shipping on orders over 10,000 DZD! Add {(10000 - total).toLocaleString()} more to qualify.
                </p>
              )}

              {!canPurchase && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mb-2">
                  {user?.role === "admin" ? "Admin" : "Seller"} accounts cannot make purchases. Please use a buyer account.
                </p>
              )}

              <Button 
                size="lg" 
                className="w-full rounded-full gap-2"
                onClick={handleCheckout}
                disabled={!canPurchase}
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Button>

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
