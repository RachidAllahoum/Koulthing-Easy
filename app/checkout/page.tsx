"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import {
  ALGERIA_WILAYAS,
  formatWilayaOption,
  getDeliveryQuote,
  getWilayaByCode,
  type DeliveryMode,
} from "@/lib/delivery-rates-dz"
import { computeKoulthingFee, KOULTHING_FEE_LABEL } from "@/lib/koulthing-fee"
import { buildOrderShippingAddressJson, clipCheckoutText } from "@/lib/checkout-address"
import { validateCheckoutStock } from "@/lib/stock-checkout"
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  MessageSquare,
} from "lucide-react"
import { NoProductImage } from "@/components/no-uploaded-media"

const steps = [
  { id: 1, title: "Information", icon: User },
  { id: 2, title: "Shipping", icon: Truck },
  { id: 3, title: "Payment", icon: CreditCard },
]

function buyerDeliveryStorageKey(userId: string) {
  return `koulthing_buyer_delivery_v1_${userId}`
}

function splitFullName(full: string | null | undefined): { firstName: string; lastName: string } {
  const s = (full ?? "").trim()
  if (!s) return { firstName: "", lastName: "" }
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items: cartItems, total: subtotal, clearCart } = useCart()
  const { user, profile } = useAuth()
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
    wilayaCode: "",
    deliveryMode: "bureau" as DeliveryMode,
    paymentMethod: "cod",
    deliveryInstructions: "",
  })

  const isBuyerUser = Boolean(user && user.profileRole === "buyer" && !user.isAdmin)
  /** After the seller/admin gate, signed-in users here are buyers. */
  const isLoggedInBuyer = isBuyerUser

  /**
   * Phone, city, wilaya, and address are never read from `profiles` — only from this form and device cache.
   * Name/email may be prefilled from the signed-in user / profile for convenience; delivery fields stay empty until the buyer fills them.
   */
  const hydrateCheckoutForm = useCallback(() => {
    if (!user) return

    const fullNameSource = (user.name ?? "").trim() || (profile?.full_name?.trim() ? profile.full_name : "")
    const { firstName: fn0, lastName: ln0 } = splitFullName(fullNameSource)
    const email = (user.email ?? profile?.email ?? "").trim()

    let cache: {
      phone?: string
      city?: string
      wilaya?: string
      wilayaCode?: string
      address?: string
      deliveryMode?: DeliveryMode
    } = {}
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(buyerDeliveryStorageKey(user.id)) : null
      if (raw) cache = JSON.parse(raw) as typeof cache
    } catch {
      cache = {}
    }

    setFormData((prev) => ({
      ...prev,
      firstName: fn0 || prev.firstName,
      lastName: ln0 || prev.lastName,
      email: email || prev.email,
      phone: cache.phone || prev.phone,
      city: cache.city || prev.city,
      wilaya: cache.wilaya || prev.wilaya,
      wilayaCode: cache.wilayaCode || prev.wilayaCode,
      deliveryMode: cache.deliveryMode === "home" || cache.deliveryMode === "bureau" ? cache.deliveryMode : prev.deliveryMode,
      address: cache.address || prev.address,
    }))
  }, [user, profile?.full_name, profile?.email])

  useEffect(() => {
    hydrateCheckoutForm()
  }, [hydrateCheckoutForm])

  useEffect(() => {
    if (!user || isBuyerUser) return
    router.replace(user.isAdmin ? "/admin" : "/seller")
  }, [user, isBuyerUser, router])

  /** Checkout requires a signed-in buyer; guests are sent to log in with return URL. */
  if (!user && cartItems.length > 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground max-w-md">
            Sign in or create a buyer account to complete your order. Your cart is saved on this device.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild className="rounded-full">
              <Link href={`/login?redirect=${encodeURIComponent("/checkout")}`}>Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/register?redirect=${encodeURIComponent("/checkout")}`}>Create account</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (user && !isBuyerUser) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-16 flex items-center justify-center">
          <p className="text-muted-foreground">Redirecting…</p>
        </main>
        <Footer />
      </div>
    )
  }

  const deliveryQuote =
    formData.wilayaCode.trim() && getWilayaByCode(formData.wilayaCode)
      ? getDeliveryQuote(formData.wilayaCode, formData.deliveryMode)
      : null
  const bureauQuote = formData.wilayaCode ? getDeliveryQuote(formData.wilayaCode, "bureau") : null
  const homeQuote = formData.wilayaCode ? getDeliveryQuote(formData.wilayaCode, "home") : null
  const shipping = deliveryQuote?.price ?? 0
  const koulthingFee = computeKoulthingFee(subtotal, shipping)
  const grandTotal = subtotal + shipping + koulthingFee

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

  const persistBuyerDeliveryCache = () => {
    if (!user) return
    try {
      localStorage.setItem(
        buyerDeliveryStorageKey(user.id),
        JSON.stringify({
          phone: formData.phone,
          city: formData.city,
          wilaya: formData.wilaya,
          wilayaCode: formData.wilayaCode,
          deliveryMode: formData.deliveryMode,
          address: formData.address,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  const validateStep1 = (): boolean => {
    if (!formData.firstName.trim()) {
      alert("Enter first name.")
      return false
    }
    if (!formData.lastName.trim()) {
      alert("Enter last name.")
      return false
    }
    if (!formData.email.trim()) {
      alert("Enter email.")
      return false
    }
    if (!formData.phone.trim()) {
      alert("Enter phone.")
      return false
    }
    if (!formData.address.trim()) {
      alert("Enter delivery address.")
      return false
    }
    if (!formData.city.trim()) {
      alert("Enter city.")
      return false
    }
    if (!formData.wilayaCode.trim() || !getWilayaByCode(formData.wilayaCode)) {
      alert("Select wilaya.")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep < 3) {
      if (currentStep === 1 && !validateStep1()) return
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
        router.replace(`/login?redirect=${encodeURIComponent("/checkout")}`)
        return
      }

      if (!validateStep1()) return

      const stockCheck = await validateCheckoutStock(supabase, cartItems)
      if (!stockCheck.ok) {
        alert(`Not enough stock for ${stockCheck.productName}`)
        return
      }

      const shippingAddress = buildOrderShippingAddressJson({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        wilaya: formData.wilaya,
        wilayaCode: formData.wilayaCode,
        deliveryMode: formData.deliveryMode,
        paymentMethod: formData.paymentMethod,
        subtotal,
        koulthingFee,
        grandTotal,
        shipping,
        etaLabel: deliveryQuote?.etaLabel ?? null,
        band: deliveryQuote?.band != null ? String(deliveryQuote.band) : null,
      })

      const itemsPayload = cartItems.map((item) => ({
        lineId: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        shopId: item.shopId,
        shopName: item.shopName,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
        image: item.image,
      }))

      const { data: createdOrder, error: insertError } = await supabase
        .from("orders")
        .insert({
          buyer_id: authUser.id,
          shipping_address: shippingAddress,
          delivery_instructions: clipCheckoutText(formData.deliveryInstructions, 2000) || null,
          items_json: itemsPayload,
          status: "pending",
          delivery_mode: formData.deliveryMode,
          delivery_price: shipping,
          koulthing_fee: koulthingFee,
        })
        .select("id")
        .single()

      if (insertError) {
        throw insertError
      }

      const orderId = createdOrder.id as string
      const orderItemRows = cartItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        shop_id: item.shopId,
        name: item.name,
        size: item.size ?? "",
        color: item.color ?? "",
        sku: item.sku ?? null,
        price: item.price,
        quantity: item.quantity,
        line_id: item.id,
      }))
      if (orderItemRows.length > 0) {
        console.log("[checkout] inserting order_items", {
          authUserId: authUser.id,
          orderId,
          rowCount: orderItemRows.length,
          firstRow: orderItemRows[0],
        })
        const { error: oiErr } = await supabase.from("order_items").insert(orderItemRows)
        if (oiErr) {
          console.error("[checkout] order_items insert failed", {
            message: oiErr.message,
            code: oiErr.code,
            details: oiErr.details,
            hint: oiErr.hint,
            orderId,
            authUserId: authUser.id,
          })
          throw oiErr
        }
      }

      persistBuyerDeliveryCache()
      clearCart()
      const q = createdOrder?.id ? `?orderId=${encodeURIComponent(createdOrder.id)}` : ""
      router.push(`/checkout/success${q}`)
    } catch (err: unknown) {
      console.error(err)
      const msg =
        err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : null
      alert(msg || "Failed to place order")
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
                  className={`w-8 h-0.5 mx-1 ${currentStep > step.id ? "bg-green-500" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8">
              {/* Step 1 */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  {isLoggedInBuyer ? (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-2">Delivery &amp; contact</h2>
                      <p className="text-sm text-muted-foreground mb-6">
                        Name and email may be prefilled from your sign-in. Phone, address, city, and wilaya are
                        always collected here for this order and stored only on the order record (never from a
                        missing profile). This device may remember delivery fields for your next checkout.
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            First name <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              placeholder="John"
                              className="pl-10 h-12 rounded-xl"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Last name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="Doe"
                            className="h-12 rounded-xl"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="email"
                            className="pl-10 h-12 rounded-xl"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone number <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="+213 XXX XXX XXX"
                            className="pl-10 h-12 rounded-xl"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Delivery address <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <textarea
                            placeholder="Enter your full delivery address"
                            className="w-full min-h-[100px] pl-10 pr-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            City <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="City"
                            className="h-12 rounded-xl"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Wilaya <span className="text-destructive">*</span>
                          </label>
                          <select
                            className="w-full h-12 rounded-xl border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={formData.wilayaCode}
                            onChange={(e) => {
                              const code = e.target.value
                              const w = getWilayaByCode(code)
                              setFormData({
                                ...formData,
                                wilayaCode: code,
                                wilaya: w?.name ?? "",
                              })
                            }}
                            required
                          >
                            <option value="">Select wilaya</option>
                            {ALGERIA_WILAYAS.map((w) => (
                              <option key={w.code} value={w.code}>
                                {formatWilayaOption(w)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {formData.wilayaCode ? (
                        <div className="space-y-3 rounded-xl border border-border p-4 bg-secondary/30">
                          <p className="text-sm font-medium text-foreground">Delivery type</p>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                              formData.deliveryMode === "bureau"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryMode"
                              value="bureau"
                              checked={formData.deliveryMode === "bureau"}
                              onChange={() => setFormData({ ...formData, deliveryMode: "bureau" })}
                              className="mt-1 w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Pickup at bureau</p>
                              <p className="text-sm text-muted-foreground">Cheaper, slower — collect at the carrier office.</p>
                              {bureauQuote ? (
                                <p className="text-sm font-semibold text-foreground mt-1">
                                  {bureauQuote.price.toLocaleString()} DZD · {bureauQuote.etaLabel}
                                </p>
                              ) : null}
                            </div>
                          </label>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                              formData.deliveryMode === "home"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryMode"
                              value="home"
                              checked={formData.deliveryMode === "home"}
                              onChange={() => setFormData({ ...formData, deliveryMode: "home" })}
                              className="mt-1 w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Home delivery</p>
                              <p className="text-sm text-muted-foreground">Faster, more expensive — to your address.</p>
                              {homeQuote ? (
                                <p className="text-sm font-semibold text-foreground mt-1">
                                  {homeQuote.price.toLocaleString()} DZD · {homeQuote.etaLabel}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        </div>
                      ) : null}

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Delivery instructions{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <Textarea
                            placeholder="e.g. Ring twice, leave with guard…"
                            className="pl-10 min-h-[88px] rounded-xl resize-none"
                            value={formData.deliveryInstructions}
                            onChange={(e) =>
                              setFormData({ ...formData, deliveryInstructions: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold text-foreground mb-6">Contact Information</h2>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              placeholder="John"
                              className="pl-10 h-12 rounded-xl"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                          <Input
                            placeholder="Doe"
                            className="h-12 rounded-xl"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10 h-12 rounded-xl"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="+213 XXX XXX XXX"
                            className="pl-10 h-12 rounded-xl"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Delivery Address <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <textarea
                            placeholder="Enter your full address"
                            className="w-full min-h-[100px] pl-10 pr-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">City</label>
                          <Input
                            placeholder="City"
                            className="h-12 rounded-xl"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Wilaya</label>
                          <select
                            className="w-full h-12 rounded-xl border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={formData.wilayaCode}
                            onChange={(e) => {
                              const code = e.target.value
                              const w = getWilayaByCode(code)
                              setFormData({
                                ...formData,
                                wilayaCode: code,
                                wilaya: w?.name ?? "",
                              })
                            }}
                            required
                          >
                            <option value="">Select wilaya</option>
                            {ALGERIA_WILAYAS.map((w) => (
                              <option key={w.code} value={w.code}>
                                {formatWilayaOption(w)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {formData.wilayaCode ? (
                        <div className="space-y-3 rounded-xl border border-border p-4 bg-secondary/30">
                          <p className="text-sm font-medium text-foreground">Delivery type</p>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                              formData.deliveryMode === "bureau"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryModeGuest"
                              value="bureau"
                              checked={formData.deliveryMode === "bureau"}
                              onChange={() => setFormData({ ...formData, deliveryMode: "bureau" })}
                              className="mt-1 w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Pickup at bureau</p>
                              <p className="text-sm text-muted-foreground">Cheaper, slower — collect at the carrier office.</p>
                              {bureauQuote ? (
                                <p className="text-sm font-semibold text-foreground mt-1">
                                  {bureauQuote.price.toLocaleString()} DZD · {bureauQuote.etaLabel}
                                </p>
                              ) : null}
                            </div>
                          </label>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                              formData.deliveryMode === "home"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryModeGuest"
                              value="home"
                              checked={formData.deliveryMode === "home"}
                              onChange={() => setFormData({ ...formData, deliveryMode: "home" })}
                              className="mt-1 w-4 h-4 text-primary"
                            />
                            <div>
                              <p className="font-medium text-foreground">Home delivery</p>
                              <p className="text-sm text-muted-foreground">Faster, more expensive — to your address.</p>
                              {homeQuote ? (
                                <p className="text-sm font-semibold text-foreground mt-1">
                                  {homeQuote.price.toLocaleString()} DZD · {homeQuote.etaLabel}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        </div>
                      ) : null}

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Delivery instructions{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <Textarea
                            placeholder="e.g. Ring twice, leave with guard…"
                            className="pl-10 min-h-[88px] rounded-xl resize-none"
                            value={formData.deliveryInstructions}
                            onChange={(e) =>
                              setFormData({ ...formData, deliveryInstructions: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Shipping — confirm delivery choice */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Delivery summary</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review your wilaya, delivery type, and fee before payment.
                  </p>

                  <div className="rounded-xl border border-border p-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Wilaya</span>
                      <span className="font-medium text-foreground text-right">
                        {formData.wilaya || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground text-right">
                        {formData.deliveryMode === "bureau" ? "Pickup at bureau" : "Home delivery"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Delivery fee</span>
                      <span className="font-semibold text-foreground">
                        {deliveryQuote ? `${shipping.toLocaleString()} DZD` : "—"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-muted-foreground mb-1">Estimated time</p>
                      <p className="font-medium text-foreground">{deliveryQuote?.etaLabel ?? "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Payment Method</h2>

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
                          <p className="font-medium text-foreground">Cash on delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        formData.paymentMethod === "edahabia"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="payment"
                          value="edahabia"
                          checked={formData.paymentMethod === "edahabia"}
                          onChange={(e) =>
                            setFormData({ ...formData, paymentMethod: e.target.value })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium text-foreground">DAHABIA</p>
                          <p className="text-sm text-muted-foreground">Pay with your Algerian bank card</p>
                        </div>
                      </div>
                      <CreditCard className="w-6 h-6 text-muted-foreground shrink-0" />
                    </label>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-secondary rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
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
                <Button type="submit" size="lg" className="rounded-xl gap-2" disabled={isLoading}>
                  {isLoading ? "Processing..." : currentStep === 3 ? "Place Order" : "Continue"}
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
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <NoProductImage />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      {(item.color || item.size) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground shrink-0">
                      {(item.price * item.quantity).toLocaleString()} DZD
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-b border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{subtotal.toLocaleString()} DZD</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium text-foreground">
                    {!deliveryQuote
                      ? "Select wilaya"
                      : `${shipping.toLocaleString()} DZD`}
                  </span>
                </div>
                {deliveryQuote ? (
                  <p className="text-xs text-muted-foreground leading-snug">{deliveryQuote.etaLabel}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Choose wilaya and delivery type in step 1.</p>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">{KOULTHING_FEE_LABEL}</span>
                  <span className="font-medium text-foreground">{koulthingFee.toLocaleString()} DZD</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">{grandTotal.toLocaleString()} DZD</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
