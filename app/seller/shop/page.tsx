"use client"

import { useEffect, useState, useRef } from "react"
import {
  Store,
  Camera,
  Globe,
  Instagram,
  Facebook,
  MapPin,
  Phone,
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
import { useShops } from "@/lib/shops-context"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { uploadPublicImage } from "@/lib/storage-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface ShopData {
  name: string
  description: string
  logo: string
  cover: string
  shop_category: string
  street_address: string
  city: string
  wilaya: string
  shop_phone: string
  instagram: string
  facebook: string
}

const emptyShopData: ShopData = {
  name: "",
  description: "",
  logo: "",
  cover: "",
  shop_category: "",
  street_address: "",
  city: "",
  wilaya: "",
  shop_phone: "",
  instagram: "",
  facebook: "",
}

export default function SellerShopPage() {
  const { user } = useAuth()
  const { refresh: refreshShops } = useShops()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [shopRowId, setShopRowId] = useState<string | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [shopData, setShopData] = useState<ShopData>(emptyShopData)
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data: shop, error } = await supabase
        .from("shops")
        .select(
          "id, name, description, logo_url, cover_url, shop_category, street_address, city, wilaya, shop_phone, instagram_url, facebook_url, created_at",
        )
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
        name: shop.name,
        description: shop.description ?? "",
        logo: shop.logo_url ?? "",
        cover: shop.cover_url ?? "",
        shop_category: shop.shop_category ?? "",
        street_address: shop.street_address ?? "",
        city: shop.city ?? "",
        wilaya: shop.wilaya ?? "",
        shop_phone: shop.shop_phone ?? "",
        instagram: shop.instagram_url ?? "",
        facebook: shop.facebook_url ?? "",
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

  const uploadLogo = async (file: File) => {
    if (!user) return
    setUploading("logo")
    try {
      const url = await uploadPublicImage("shop-logos", user.id, file)
      setShopData((d) => ({ ...d, logo: url }))
      toast({ title: "Logo uploaded" })
    } catch (e) {
      toast({
        title: "Logo upload failed",
        description: e instanceof Error ? e.message : "Upload error",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const uploadCover = async (file: File) => {
    if (!user) return
    setUploading("cover")
    try {
      const url = await uploadPublicImage("shop-covers", user.id, file)
      setShopData((d) => ({ ...d, cover: url }))
      toast({ title: "Cover uploaded" })
    } catch (e) {
      toast({
        title: "Cover upload failed",
        description: e instanceof Error ? e.message : "Upload error",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    if (!shopRowId || !user) {
      setIsEditing(false)
      return
    }
    const { error } = await supabase
      .from("shops")
      .update({
        name: shopData.name.trim(),
        description: shopData.description.trim(),
        logo_url: shopData.logo.trim() || null,
        cover_url: shopData.cover.trim() || null,
        shop_category: shopData.shop_category.trim() || null,
        street_address: shopData.street_address.trim() || null,
        city: shopData.city.trim() || null,
        wilaya: shopData.wilaya.trim() || null,
        shop_phone: shopData.shop_phone.trim() || null,
        instagram_url: shopData.instagram.trim() || null,
        facebook_url: shopData.facebook.trim() || null,
      })
      .eq("id", shopRowId)
      .eq("seller_id", user.id)

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" })
      return
    }
    await refreshShops()
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
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) void uploadLogo(f)
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) void uploadCover(f)
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Shop</h1>
          <p className="text-muted-foreground">Details from your application—edit anytime. Changes appear on your public shop page.</p>
        </div>
        {isEditing ? (
          <Button className="rounded-xl gap-2" onClick={() => void handleSave()}>
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
              {shopData.cover ? (
                <img src={shopData.cover} alt="" className="w-full h-full object-cover" />
              ) : null}
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => coverInputRef.current?.click()}
                className="absolute right-4 top-4 p-2 bg-card/80 backdrop-blur rounded-lg hover:bg-card transition-colors disabled:opacity-40"
                title="Upload cover image"
              >
                <Camera className="w-5 h-5 text-foreground" />
              </button>
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
                  <button
                    type="button"
                    disabled={uploading !== null}
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute -right-1 -bottom-1 p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40"
                    title="Upload logo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
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
                <label className="block text-sm font-medium text-muted-foreground mb-2">Category</label>
                {isEditing ? (
                  <Select
                    value={shopData.shop_category ? shopData.shop_category : undefined}
                    onValueChange={(v) => setShopData({ ...shopData, shop_category: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground">{shopData.shop_category || "—"}</p>
                )}
              </div>

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

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Street
                  </label>
                  {isEditing ? (
                    <Input
                      value={shopData.street_address}
                      onChange={(e) => setShopData({ ...shopData, street_address: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.street_address || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">City</label>
                  {isEditing ? (
                    <Input
                      value={shopData.city}
                      onChange={(e) => setShopData({ ...shopData, city: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.city || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Wilaya</label>
                  {isEditing ? (
                    <Input
                      value={shopData.wilaya}
                      onChange={(e) => setShopData({ ...shopData, wilaya: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.wilaya || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Shop phone
                  </label>
                  {isEditing ? (
                    <Input
                      value={shopData.shop_phone}
                      onChange={(e) => setShopData({ ...shopData, shop_phone: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  ) : (
                    <p className="text-foreground">{shopData.shop_phone || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Social Links</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Instagram className="w-4 h-4 inline mr-1" />
                  Instagram URL or handle
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
                  Facebook URL or handle
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
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Logo and cover upload use Supabase Storage; save after editing text fields.
            </p>
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
