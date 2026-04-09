"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Store } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AccountType = "buyer" | "seller"

const SHOP_CATEGORIES = [
  "Fashion",
  "Electronics",
  "Home",
  "Beauty",
  "Sports",
  "Food",
  "Health",
  "Other",
]

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>("buyer")
  const [sellerStep, setSellerStep] = useState<1 | 2>(1)
  const [message, setMessage] = useState("")
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    shopName: "",
    shopDescription: "",
    businessRegistration: "",
    taxId: "",
    shopPhone: "",
    street: "",
    city: "",
    wilaya: "",
    shopCategory: "",
    instagramUrl: "",
    facebookUrl: "",
    bankInfo: "",
  })
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null)

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(formData.password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
  ]

  const uploadShopLogo = async (userId: string): Promise<string | null> => {
    if (!shopLogoFile) return null

    const ext = shopLogoFile.name.split(".").pop()?.toLowerCase() || "jpg"
    const filePath = `${userId}/${Date.now()}-logo.${ext}`
    const { error: uploadError } = await supabase.storage.from("shop-logos").upload(filePath, shopLogoFile, {
      upsert: true,
      contentType: shopLogoFile.type || "image/jpeg",
    })

    if (uploadError) {
      throw new Error(`Logo upload failed: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from("shop-logos").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleBuyerSubmit = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName.trim(),
        },
      },
    })

    if (error) throw error
    if (!data.user?.id) throw new Error("No user returned from signup.")

    const { error: profileError } = await supabase.from("profiles").update({
      full_name: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      role: "buyer",
      is_approved: null,
    }).eq("id", data.user.id)

    if (profileError) throw profileError
    router.push("/")
  }

  const handleSellerSubmit = async () => {
    const email = formData.email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName.trim(),
        },
      },
    })

    if (error) throw error
    if (!data.user?.id) throw new Error("No user returned from signup.")

    const logoUrl = await uploadShopLogo(data.user.id)

    const { error: profileError } = await supabase.from("profiles").update({
      full_name: formData.fullName.trim(),
      email,
      role: "seller",
      is_approved: false,
    }).eq("id", data.user.id)
    if (profileError) throw profileError

    const { error: applicationError } = await supabase.from("seller_applications").insert({
      user_id: data.user.id,
      shop_name: formData.shopName.trim(),
      description: formData.shopDescription.trim(),
      business_registration: formData.businessRegistration.trim(),
      tax_id: formData.taxId.trim() || null,
      shop_phone: formData.shopPhone.trim(),
      street_address: formData.street.trim(),
      city: formData.city.trim(),
      wilaya: formData.wilaya.trim(),
      shop_category: formData.shopCategory,
      logo_url: logoUrl,
      instagram_url: formData.instagramUrl.trim() || null,
      facebook_url: formData.facebookUrl.trim() || null,
      bank_info: formData.bankInfo.trim(),
      status: "pending",
    })

    if (applicationError) throw applicationError
    setMessage("Your seller account is pending admin approval")
    router.push("/login")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match")
      return
    }
    setIsLoading(true)
    setMessage("")
    try {
      if (accountType === "seller") {
        if (!formData.shopCategory.trim()) {
          alert("Please select a shop category.")
          setIsLoading(false)
          return
        }
      }
      if (accountType === "buyer") {
        await handleBuyerSubmit()
      } else {
        await handleSellerSubmit()
      }
    } catch (error) {
      const err = error as { message?: string }
      alert(err?.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className={`w-full ${accountType === "seller" ? "max-w-2xl" : "max-w-md"}`}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">Join Koulthing and start your journey</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">Choose account type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["buyer", "seller"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setAccountType(role)
                      setSellerStep(1)
                    }}
                    className={`p-5 rounded-xl border-2 transition-colors text-sm font-semibold ${
                      accountType === role
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {role === "buyer" ? <User className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                      {role === "buyer" ? "Sign up as Buyer" : "Sign up as Seller"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    className="pl-10 h-12 rounded-xl"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
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
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? "text-green-600" : "text-muted-foreground"
                        }`}
                      >
                        <Check className={`w-3 h-3 ${req.met ? "opacity-100" : "opacity-30"}`} />
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 h-12 rounded-xl"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {accountType === "seller" && (
                <>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">Seller details - Step {sellerStep} of 2</p>
                      {sellerStep === 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 rounded-lg"
                          onClick={() => setSellerStep(2)}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 rounded-lg"
                          onClick={() => setSellerStep(1)}
                        >
                          Back to Step 1
                        </Button>
                      )}
                    </div>
                  </div>

                  {sellerStep === 2 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Shop Name</label>
                        <Input
                          className="h-12 rounded-xl"
                          value={formData.shopName}
                          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                          required={accountType === "seller"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Shop Description</label>
                        <textarea
                          className="w-full min-h-[110px] px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          value={formData.shopDescription}
                          onChange={(e) => setFormData({ ...formData, shopDescription: e.target.value })}
                          required={accountType === "seller"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Business Registration</label>
                        <Input
                          className="h-12 rounded-xl"
                          value={formData.businessRegistration}
                          onChange={(e) => setFormData({ ...formData, businessRegistration: e.target.value })}
                          required={accountType === "seller"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Tax ID (optional)</label>
                        <Input
                          className="h-12 rounded-xl"
                          value={formData.taxId}
                          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Shop Phone</label>
                        <Input
                          className="h-12 rounded-xl"
                          value={formData.shopPhone}
                          onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                          required={accountType === "seller"}
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Street</label>
                          <Input
                            className="h-12 rounded-xl"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            required={accountType === "seller"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">City</label>
                          <Input
                            className="h-12 rounded-xl"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required={accountType === "seller"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Wilaya</label>
                          <Input
                            className="h-12 rounded-xl"
                            value={formData.wilaya}
                            onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                            required={accountType === "seller"}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Shop Category</label>
                        <Select
                          value={formData.shopCategory}
                          onValueChange={(value) => setFormData({ ...formData, shopCategory: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHOP_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Shop Logo Upload</label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="h-12 rounded-xl file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
                          onChange={(e) => setShopLogoFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Instagram URL</label>
                          <Input
                            className="h-12 rounded-xl"
                            value={formData.instagramUrl}
                            onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Facebook URL</label>
                          <Input
                            className="h-12 rounded-xl"
                            value={formData.facebookUrl}
                            onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Bank Info</label>
                        <textarea
                          className="w-full min-h-[90px] px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          value={formData.bankInfo}
                          onChange={(e) => setFormData({ ...formData, bankInfo: e.target.value })}
                          required={accountType === "seller"}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {message ? <p className="text-sm text-green-600">{message}</p> : null}

              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
              </p>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl gap-2"
                disabled={isLoading || (accountType === "seller" && sellerStep !== 2)}
              >
                {isLoading ? "Creating account..." : accountType === "buyer" ? "Create Buyer Account" : "Create Seller Account"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          </div>

          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-medium hover:text-accent/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
