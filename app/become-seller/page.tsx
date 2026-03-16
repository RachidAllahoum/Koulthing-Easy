"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  FileText,
} from "lucide-react"

const steps = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Shop Details" },
  { id: 3, title: "Verification" },
]

const categories = [
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Sports",
  "Handmade",
  "Food",
  "Services",
  "Other",
]

export default function BecomeSellerPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    email: "",
    phone: "",
    password: "",
    // Shop Details
    shopName: "",
    category: "",
    description: "",
    location: "",
    instagram: "",
    tiktok: "",
    // Verification
    idDocument: null as File | null,
    businessLicense: null as File | null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      return
    }
    setIsLoading(true)
    // Placeholder for registration logic
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Become a Seller</h1>
            <p className="text-muted-foreground">
              Start selling on Koulthing and reach thousands of customers
            </p>
          </div>

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
                    <span>{step.id}</span>
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

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Personal Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Create a password"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shop Details */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Shop Details</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Shop Name
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter your shop name"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <select
                      className="w-full h-12 px-4 rounded-xl bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe your shop and products..."
                      className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="City, Algeria"
                        className="pl-10 h-12 rounded-xl"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Instagram (optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="@username"
                        className="h-12 rounded-xl"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        TikTok (optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="@username"
                        className="h-12 rounded-xl"
                        value={formData.tiktok}
                        onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Verification */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Verification Documents</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload your documents for verification. This helps us ensure a safe marketplace for everyone.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      ID Document (National ID or Passport)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or PDF up to 10MB
                      </p>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setFormData({ ...formData, idDocument: e.target.files[0] })
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Business License (optional)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or PDF up to 10MB
                      </p>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setFormData({ ...formData, businessLicense: e.target.files[0] })
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                      By submitting this application, you agree to our{" "}
                      <Link href="/seller-terms" className="text-accent hover:underline">
                        Seller Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-accent hover:underline">
                        Privacy Policy
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="rounded-xl gap-2"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <ArrowLeft className="w-4 h-4" />
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
                  {isLoading ? (
                    "Submitting..."
                  ) : currentStep === 3 ? (
                    "Submit Application"
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Login Link */}
          <p className="text-center text-muted-foreground mt-6">
            Already a seller?{" "}
            <Link href="/seller/login" className="text-accent font-medium hover:text-accent/80 transition-colors">
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
