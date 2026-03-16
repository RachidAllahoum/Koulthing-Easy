"use client"

import { useState } from "react"
import { 
  Store, 
  Camera, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter,
  MapPin,
  Phone,
  Mail,
  Edit,
  Save,
  Package,
  Calendar,
  Users,
  Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShopData {
  name: string
  description: string
  logo: string
  banner: string
  address: string
  phone: string
  email: string
  website: string
  instagram: string
  facebook: string
  twitter: string
}

const initialShopData: ShopData = {
  name: "Fashion House",
  description: "Premium fashion boutique offering the latest trends in clothing, accessories, and lifestyle products. We believe in quality and style that speaks to the modern individual.",
  logo: "",
  banner: "",
  address: "123 Main Street, Algiers, Algeria",
  phone: "+213 555 123 456",
  email: "contact@fashionhouse.dz",
  website: "www.fashionhouse.dz",
  instagram: "@fashionhouse.dz",
  facebook: "FashionHouseDZ",
  twitter: "@FashionHouseDZ",
}

const shopStats = {
  totalProducts: 48,
  totalEvents: 3,
  followers: 12500,
  rating: 4.8,
  totalOrders: 1250,
  totalRevenue: 2450000,
}

const recentProducts = [
  { name: "Summer Dress", price: 4500, sold: 45 },
  { name: "Leather Wallet", price: 2800, sold: 38 },
  { name: "Wireless Earbuds", price: 8900, sold: 32 },
  { name: "Ceramic Vase", price: 3200, sold: 28 },
]

const activeEvents = [
  { name: "Spring Sale 2024", discount: 30, endDate: "2024-03-31" },
  { name: "Ramadan Special", discount: 25, endDate: "2024-04-09" },
]

export default function SellerShopPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [shopData, setShopData] = useState(initialShopData)

  const handleSave = () => {
    setIsEditing(false)
    // Save logic would go here
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Shop</h1>
          <p className="text-muted-foreground">Manage your shop profile and settings</p>
        </div>
        {isEditing ? (
          <Button className="rounded-xl gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        ) : (
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4" />
            Edit Shop
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Shop Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Banner & Logo */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative h-40 bg-gradient-to-r from-primary/20 to-accent/20">
              {isEditing && (
                <button className="absolute right-4 top-4 p-2 bg-card/80 backdrop-blur rounded-lg hover:bg-card transition-colors">
                  <Camera className="w-5 h-5 text-foreground" />
                </button>
              )}
            </div>
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-xl bg-secondary border-4 border-card flex items-center justify-center">
                    <Store className="w-10 h-10 text-muted-foreground" />
                  </div>
                  {isEditing && (
                    <button className="absolute -right-1 -bottom-1 p-1.5 bg-primary text-primary-foreground rounded-lg">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <Input 
                      value={shopData.name}
                      onChange={(e) => setShopData({ ...shopData, name: e.target.value })}
                      className="text-xl font-bold h-11 rounded-xl"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-foreground">{shopData.name}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{shopStats.rating}</span>
                    </div>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm text-muted-foreground">
                      {shopStats.followers.toLocaleString()} followers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Details */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Shop Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={shopData.description}
                    onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                    className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                ) : (
                  <p className="text-foreground">{shopData.description}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Address
                  </label>
                  {isEditing ? (
                    <Input 
                      value={shopData.address}
                      onChange={(e) => setShopData({ ...shopData, address: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.address}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  {isEditing ? (
                    <Input 
                      value={shopData.phone}
                      onChange={(e) => setShopData({ ...shopData, phone: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <Input 
                      value={shopData.email}
                      onChange={(e) => setShopData({ ...shopData, email: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  {isEditing ? (
                    <Input 
                      value={shopData.website}
                      onChange={(e) => setShopData({ ...shopData, website: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.website}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Social Links</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Instagram className="w-4 h-4 inline mr-1" />
                  Instagram
                </label>
                {isEditing ? (
                  <Input 
                    value={shopData.instagram}
                    onChange={(e) => setShopData({ ...shopData, instagram: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                ) : (
                  <p className="text-foreground">{shopData.instagram}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Facebook className="w-4 h-4 inline mr-1" />
                  Facebook
                </label>
                {isEditing ? (
                  <Input 
                    value={shopData.facebook}
                    onChange={(e) => setShopData({ ...shopData, facebook: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                ) : (
                  <p className="text-foreground">{shopData.facebook}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Twitter className="w-4 h-4 inline mr-1" />
                  Twitter
                </label>
                {isEditing ? (
                  <Input 
                    value={shopData.twitter}
                    onChange={(e) => setShopData({ ...shopData, twitter: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                ) : (
                  <p className="text-foreground">{shopData.twitter}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Shop Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Products</span>
                </div>
                <span className="font-semibold text-foreground">{shopStats.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Events</span>
                </div>
                <span className="font-semibold text-foreground">{shopStats.totalEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Followers</span>
                </div>
                <span className="font-semibold text-foreground">{shopStats.followers.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Recent Products */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Products</h3>
            <div className="space-y-3">
              {recentProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {product.price.toLocaleString()} DZD
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Events */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Active Events</h3>
            <div className="space-y-3">
              {activeEvents.map((event, index) => (
                <div key={index} className="p-3 bg-secondary/50 rounded-xl">
                  <p className="text-sm font-medium text-foreground">{event.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Ends {event.endDate}</span>
                    <span className="text-xs font-medium text-accent">{event.discount}% off</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
