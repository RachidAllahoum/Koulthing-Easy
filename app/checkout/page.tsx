"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  Check,
  ChevronRight,
  Package,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react"

const steps = [
  { id: 1, title: "Information", icon: User },
  { id: 2, title: "Shipping", icon: Truck },
  { id: 3, title: "Payment", icon: CreditCard },
]

const shippingMethods = [
  {
    id: "standard",
    name: "Standard Shipping",
    description: "5-7 business days",
    price: 500,
  },
  {
    id: "express",
    name: "Express Shipping",
    description: "2-3 business days",
    price: 1200,
  },
  {
    id: "pickup",
    name: "Store Pickup",
    description: "Ready in 24 hours",
    price: 0,
  },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { items: cartItems, total: subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    wilaya: "",
    shippingMethod: "standard",
    paymentMethod: "cod",
  })

  const selectedShipping = shippingMethods.find((m) => m.id === formData.shippingMethod)
  const shipping = selectedShipping?.price || 0
  const total = subtotal + shipping

  // Block admin and anyone registered as a seller (including pending approval) from checkout
  if (user && (user.isAdmin || user.profileRole === "seller")) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Checkout Not Available</h1>
            <p className="text-muted-foreground mb-6">
              {user.isAdmin ? "Admin" : "Seller"} accounts cannot make purchases.
              Please use a buyer account to place orders.
            </p>
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link href="/articles">
                Browse Products
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Redirect to cart if empty
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">Please add items to your cart before checking out.</p>
            <Button asChild size="lg" className="rounded-full gap-2">
              <Link href="/articles">
                Start Shopping
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      return
    }
    setIsLoading(true)
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        throw new Error("You must be logged in to place an order.")
      }

      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        wilaya: formData.wilaya,
        shippingMethod: formData.shippingMethod,
        shippingFee: shipping,
        paymentMethod: formData.paymentMethod,
        subtotal,
        total,
      }

      const itemsPayload = cartItems.map((item) => ({
        lineId: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        shopId: item.shopId,
        shopName: item.shopName,
        color: item.color,
        size: item.size,
        image: item.image,
      }))

      const { error: insertError } = await supabase.from("orders").insert({
        buyer_id: authUser.id,
        shipping_address: shippingAddress,
        delivery_instructions: null,
        items_json: itemsPayload,
        status: "pending",
      })

      if (insertError) {
        throw insertError
      }

      clearCart()
      router.push("/checkout/success")
    } catch (err: any) {
      console.error(err)
      alert(err?.message || "Failed to place order")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/cart" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        </nav>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-green-100 text-green-700"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    currentStep > step.id ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8">
              {/* Step 1: Information */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Contact Information
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          placeholder="John"
                          className="pl-10 h-12 rounded-xl"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Last Name
                      </label>
                      <Input
                        placeholder="Doe"
                        className="h-12 rounded-xl"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="+213 XXX XXX XXX"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Delivery Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-4 w-5 h-5 text-muted-foreground" />
                      <textarea
                        placeholder="Enter your full address"
                        className="w-full min-h-[100px] pl-10 pr-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City
                      </label>
                      <Input
                        placeholder="City"
                        className="h-12 rounded-xl"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Wilaya
                      </label>
                      <Input
                        placeholder="Wilaya"
                        className="h-12 rounded-xl"
                        value={formData.wilaya}
                        onChange={(e) =>
                          setFormData({ ...formData, wilaya: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Shipping Method
                  </h2>

                  <div className="space-y-3">
                    {shippingMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          formData.shippingMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="radio"
                            name="shipping"
                            value={method.id}
                            checked={formData.shippingMethod === method.id}
                            onChange={(e) =>
                              setFormData({ ...formData, shippingMethod: e.target.value })
                            }
                            className="w-4 h-4 text-primary"
                          />
                          <div>
                            <p className="font-medium text-foreground">{method.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-foreground">
                          {method.price === 0 ? "Free" : `${method.price.toLocaleString()} DZD`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Payment Method
                  </h2>

                  <div className="space-y-3">
                    <label
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.paymentMethod === "cod"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="payment"
                          value="cod"
                          checked={formData.paymentMethod === "cod"}
                          onChange={(e) =>
                            setFormData({ ...formData, paymentMethod: e.target.value })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-foreground">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">
                            Pay when you receive your order
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.paymentMethod === "card"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="payment"
                          value="card"
                          checked={formData.paymentMethod === "card"}
                          onChange={(e) =>
                            setFormData({ ...formData, paymentMethod: e.target.value })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-foreground">CIB/Edahabia Card</p>
                          <p className="text-sm text-muted-foreground">
                            Pay securely with your bank card
                          </p>
                        </div>
                      </div>
                      <CreditCard className="w-6 h-6 text-muted-foreground" />
                    </label>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-secondary rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-muted-foreground">
                      Your payment information is secure and encrypted
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="rounded-xl"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-xl gap-2"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : currentStep === 3
                    ? "Place Order"
                    : "Continue"}
                  {!isLoading && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>

              <div className="space-y-4 pb-4 border-b border-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {(item.price * item.quantity).toLocaleString()} DZD
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-b border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    {subtotal.toLocaleString()} DZD
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-foreground">
                    {shipping === 0 ? "Free" : `${shipping.toLocaleString()} DZD`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">
                  {total.toLocaleString()} DZD
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
