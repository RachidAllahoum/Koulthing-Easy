"use client"

import { useEffect, useState } from "react"
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
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"

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

const emptyShopData: ShopData = {
  name: "",
  description: "",
  logo: "",
  banner: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  twitter: "",
}

export default function SellerShopPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [shopRowId, setShopRowId] = useState<string | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [shopData, setShopData] = useState<ShopData>(emptyShopData)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data: shop, error } = await supabase
        .from("shops")
        .select("id, name, description, logo_url, created_at")
        .eq("seller_id", user.id)
        .maybeSingle()

      if (error) {
        console.error(error)
        setShopRowId(null)
        setShopData(emptyShopData)
        setLoading(false)
        return
      }

      if (!shop) {
        setShopRowId(null)
        setShopData(emptyShopData)
        setProductCount(0)
        setLoading(false)
        return
      }

      setShopRowId(shop.id)
      setShopData({
        ...emptyShopData,
        name: shop.name,
        description: shop.description ?? "",
        logo: shop.logo_url ?? "",
      })

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shop.id)
      setProductCount(count ?? 0)
      setLoading(false)
    }

    load()
  }, [user?.id])

  const handleSave = async () => {
    if (!shopRowId || !user) {
      setIsEditing(false)
      return
    }
    const { error } = await supabase
      .from("shops")
      .update({
        name: shopData.name,
        description: shopData.description,
      })
      .eq("id", shopRowId)
      .eq("seller_id", user.id)

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" })
      return
    }
    setIsEditing(false)
    toast({ title: "Shop updated", description: "Your shop details were saved." })
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading your shop…</p>
      </div>
    )
  }

  if (!shopRowId) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">My Shop</h1>
        <p className="text-muted-foreground max-w-md">
          No shop found for your account. This usually appears after an admin approves your seller application and a shop row is created for your user.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Shop</h1>
          <p className="text-muted-foreground">Manage your shop profile (data from your approved application)</p>
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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative h-40 bg-gradient-to-r from-primary/20 to-accent/20">
              {isEditing && (
                <button
                  type="button"
                  className="absolute right-4 top-4 p-2 bg-card/80 backdrop-blur rounded-lg hover:bg-card transition-colors opacity-50 cursor-not-allowed"
                  title="Banner upload coming soon"
                >
                  <Camera className="w-5 h-5 text-foreground" />
                </button>
              )}
            </div>
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <div className="relative">
                  <div className="w-24 h-24 rounded-xl bg-secondary border-4 border-card flex items-center justify-center overflow-hidden">
                    {shopData.logo ? (
                      <img src={shopData.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      className="absolute -right-1 -bottom-1 p-1.5 bg-primary text-primary-foreground rounded-lg opacity-50 cursor-not-allowed"
                      title="Logo upload coming soon"
                    >
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
                      <span className="text-sm font-medium">—</span>
                    </div>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm text-muted-foreground">Followers —</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Shop Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                {isEditing ? (
                  <textarea
                    value={shopData.description}
                    onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                    className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                ) : (
                  <p className="text-foreground">{shopData.description || "No description yet."}</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Contact fields below are optional and stored only in this form until you add columns in the database.
              </p>

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
                    <p className="text-foreground">{shopData.address || "—"}</p>
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
                    <p className="text-foreground">{shopData.phone || "—"}</p>
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
                    <p className="text-foreground">{shopData.email || "—"}</p>
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
                    <p className="text-foreground">{shopData.website || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                  <p className="text-foreground">{shopData.instagram || "—"}</p>
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
                  <p className="text-foreground">{shopData.facebook || "—"}</p>
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
                  <p className="text-foreground">{shopData.twitter || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
                <span className="font-semibold text-foreground">{productCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Events</span>
                </div>
                <span className="font-semibold text-foreground">—</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">Followers</span>
                </div>
                <span className="font-semibold text-foreground">—</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Products</h3>
            <p className="text-sm text-muted-foreground">Product sales stats will appear here when order data is connected.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
