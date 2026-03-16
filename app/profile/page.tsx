"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { ShoppingBag, Heart, MapPin, Phone, Mail, Edit2, LogOut, ArrowRight, Store } from "lucide-react"

const mockOrders = [
  {
    id: "ORD-001",
    shop: "Digital Design Studio",
    products: [
      { name: "UI Kit Pro", price: 49.99, qty: 1 },
      { name: "Icon Pack", price: 19.99, qty: 1 },
    ],
    total: 69.98,
    status: "delivered",
    date: "2024-03-10",
  },
  {
    id: "ORD-002",
    shop: "Photography Basics",
    products: [{ name: "Photography Guide", price: 29.99, qty: 1 }],
    total: 29.99,
    status: "in-transit",
    date: "2024-03-08",
  },
  {
    id: "ORD-003",
    shop: "Graphic Masters",
    products: [
      { name: "Branding Templates", price: 39.99, qty: 2 },
    ],
    total: 79.98,
    status: "processing",
    date: "2024-03-05",
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-foreground mb-4">Please log in to view your profile</p>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const statuses = {
    processing: { label: "Processing", color: "bg-blue-100 text-blue-700" },
    "in-transit": { label: "In Transit", color: "bg-yellow-100 text-yellow-700" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header with tabs */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Section */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-20">
                <div className="text-center mb-6">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary"
                  />
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <span className="inline-block mt-3 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full capitalize">
                    {user.role} Account
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="w-4 h-4" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                  <Link href="/profile/settings" className="block">
                    <Button variant="outline" className="w-full rounded-xl">
                      Settings
                    </Button>
                  </Link>
                  {user.role === "seller" && (
                    <Link href="/seller" className="block">
                      <Button className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90">
                        <Store className="w-4 h-4" />
                        Store Dashboard
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Quick Stats - Only show for buyers */}
                {user.role === "buyer" && (
                  <div className="space-y-3 border-t border-border pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Orders</span>
                      <span className="font-semibold text-foreground">3</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Spent</span>
                      <span className="font-semibold text-foreground">DZD 179.95</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Wishlist Items</span>
                      <span className="font-semibold text-foreground">5</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Edit Profile Form */}
              {isEditing && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Edit Profile</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Full Name
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        placeholder="+213 123 456 789"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Address
                      </label>
                      <Input
                        placeholder="Street address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          City
                        </label>
                        <Input
                          placeholder="Algiers"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Postal Code
                        </label>
                        <Input
                          placeholder="16000"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <Button className="w-full rounded-lg gap-2 mt-6">
                      Save Changes
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Orders Section - Only show for buyers */}
              {user.role === "buyer" && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-foreground gap-2 flex items-center">
                      <ShoppingBag className="w-5 h-5" />
                      My Orders
                    </h3>
                    <Link href="/profile/orders">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        View All
                      </Button>
                    </Link>
                  </div>

                  {mockOrders.length > 0 ? (
                    <div className="space-y-3">
                      {mockOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{order.id}</p>
                              <p className="text-sm text-muted-foreground">{order.shop}</p>
                              <div className="flex gap-3 mt-2 text-sm">
                                <span className="text-foreground">{order.products.length} item(s)</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-foreground font-medium">DZD {order.total.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`inline-block px-3 py-1 text-xs font-medium rounded-full capitalize ${
                                  statuses[order.status as keyof typeof statuses]?.color
                                }`}
                              >
                                {statuses[order.status as keyof typeof statuses]?.label}
                              </span>
                              <p className="text-xs text-muted-foreground mt-2">{order.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No orders yet</p>
                  )}
                </div>
              )}

              {/* Wishlist Section - Only show for buyers */}
              {user.role === "buyer" && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground gap-2 flex items-center mb-6">
                    <Heart className="w-5 h-5" />
                    Wishlist
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div
                        key={item}
                        className="aspect-square bg-secondary rounded-lg flex items-center justify-center text-muted-foreground"
                      >
                        <Heart className="w-6 h-6 opacity-30" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin/Seller Notice */}
              {(user.role === "admin" || user.role === "seller") && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    {user.role === "admin" ? "Admin Account" : "Seller Account"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    As a {user.role}, you can browse shops and articles but cannot make purchases.
                    {user.role === "seller" && " Manage your shop from the Seller Dashboard."}
                  </p>
                  {user.role === "seller" && (
                    <Link href="/seller">
                      <Button className="rounded-xl gap-2">
                        <Store className="w-4 h-4" />
                        Go to Seller Dashboard
                      </Button>
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link href="/admin/shop-approvals">
                      <Button className="rounded-xl">
                        Admin Panel
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
