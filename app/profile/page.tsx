"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { ShoppingBag, Heart, LogOut, ArrowRight, Store, Shield, Clock } from "lucide-react"

const placeholderOrders: {
  id: string
  shop: string
  products: { name: string; price: number; qty: number }[]
  total: number
  status: string
  date: string
}[] = []

export default function ProfilePage() {
  const { user, profile, logout, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  })

  useEffect(() => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
    }))
  }, [user?.id, user?.name, user?.email])

  const [followedShops, setFollowedShops] = useState<{ id: string; name: string; logoUrl: string | null }[]>([])
  const [followedShopsLoading, setFollowedShopsLoading] = useState(false)

  useEffect(() => {
    if (!user || !profile) return
    const buyerOnly = profile.role === "buyer" && !user.isAdmin
    if (!buyerOnly) {
      setFollowedShops([])
      setFollowedShopsLoading(false)
      return
    }
    let cancelled = false
    setFollowedShopsLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("created_at, shops(id, name, logo_url)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
      if (cancelled) return
      if (error) {
        console.error(error)
        setFollowedShops([])
        setFollowedShopsLoading(false)
        return
      }
      type ShopJoin = { id: string; name: string; logo_url: string | null }
      type Row = { shops: ShopJoin | ShopJoin[] | null }
      const rows = (data ?? []) as unknown as Row[]
      const pickShop = (r: Row): ShopJoin | null => {
        const s = r.shops
        if (!s) return null
        return Array.isArray(s) ? (s[0] ?? null) : s
      }
      const mapped = rows
        .map(pickShop)
        .filter((s): s is ShopJoin => Boolean(s?.id))
        .map((s) => ({ id: s.id, name: s.name, logoUrl: s.logo_url }))
      setFollowedShops(mapped)
      setFollowedShopsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.isAdmin, profile?.role])

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-foreground mb-4">
              {!user
                ? "Please log in to view your profile."
                : "Your profile row could not be loaded. Try refreshing or contact support."}
            </p>
            <Button asChild>
              <Link href={user ? "/" : "/login"}>{user ? "Home" : "Go to Login"}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
  }

  const showBuyerExperience = profile.role === "buyer" && !user.isAdmin
  const sellerAwaitingApproval = profile.role === "seller" && !user.isSeller

  const accountBadge = user.isAdmin
    ? "Administrator"
    : user.isSeller
      ? "Approved seller"
      : profile.role === "seller"
        ? profile.is_approved === false
          ? "Seller · Pending approval"
          : "Seller"
        : "Buyer"

  const approvalDetail =
    profile.role === "seller" && !user.isSeller
      ? "Your seller account is under review. You will be notified once approved. Thank you for your patience."
      : null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <Button variant="outline" className="gap-2" onClick={() => void handleLogout()}>
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-20">
                <div className="text-center mb-6">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <span className="inline-block mt-3 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {accountBadge}
                  </span>
                </div>

                <dl className="text-left text-sm space-y-2 border-t border-border pt-4 mb-4">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Account type</dt>
                    <dd className="font-medium text-foreground capitalize">{profile.role}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Approved (seller)</dt>
                    <dd className="font-medium text-foreground">
                      {profile.role === "seller" ? (profile.is_approved === true ? "Yes" : "No") : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">App role</dt>
                    <dd className="font-medium text-foreground capitalize">{user.role}</dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? "Cancel" : "Edit profile"}
                  </Button>
                  <Link href="/profile/settings" className="block">
                    <Button variant="outline" className="w-full rounded-xl">
                      Settings
                    </Button>
                  </Link>
                  {user.isSeller && (
                    <Link href="/seller" className="block">
                      <Button className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90">
                        <Store className="w-4 h-4" />
                        Seller dashboard
                      </Button>
                    </Link>
                  )}
                  {sellerAwaitingApproval && (
                    <Link href="/seller/pending-approval" className="block">
                      <Button variant="outline" className="w-full gap-2 rounded-xl">
                        <Clock className="w-4 h-4" />
                        Application status
                      </Button>
                    </Link>
                  )}
                </div>

                {showBuyerExperience && (
                  <div className="space-y-3 border-t border-border pt-6 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total orders</span>
                      <span className="font-semibold text-foreground">{placeholderOrders.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              {approvalDetail && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Seller application
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{approvalDetail}</p>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/seller/pending-approval">View status page</Link>
                  </Button>
                </div>
              )}

              {isEditing && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Edit profile</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Full name</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                      <Input
                        placeholder="+213…"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">City</label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Postal code</label>
                        <Input
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Address and phone are stored locally in this form until your schema supports them.
                    </p>
                    <Button
                      type="button"
                      className="w-full rounded-lg gap-2 mt-2"
                      onClick={async () => {
                        try {
                          await updateProfile({ name: formData.name, email: formData.email })
                          setIsEditing(false)
                          toast({
                            title: "Profile saved",
                            description: "Your name and email were updated.",
                          })
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : "Could not save profile."
                          toast({ title: "Save failed", description: msg, variant: "destructive" })
                        }
                      }}
                    >
                      Save name &amp; email
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {showBuyerExperience && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-foreground gap-2 flex items-center">
                      <ShoppingBag className="w-5 h-5" />
                      My orders
                    </h3>
                    <Link href="/profile/orders">
                      <Button variant="outline" size="sm" className="rounded-lg">
                        View all
                      </Button>
                    </Link>
                  </div>
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    View your purchases and delivery status on the order history page.
                  </p>
                </div>
              )}

              {showBuyerExperience && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground gap-2 flex items-center mb-6">
                    <Heart className="w-5 h-5 fill-accent text-accent" />
                    Shops you follow
                  </h3>
                  {followedShopsLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading shops…</p>
                  ) : followedShops.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                      You are not following any shops yet. Use Follow on a shop or product page to save it here.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {followedShops.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/shop/${s.id}`}
                            className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-secondary/40 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                              {s.logoUrl ? (
                                <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium text-foreground flex-1 min-w-0 truncate">{s.name}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {showBuyerExperience && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground gap-2 flex items-center mb-6">
                    <Heart className="w-5 h-5" />
                    Wishlist
                  </h3>
                  <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                    Wishlist is empty.
                  </p>
                </div>
              )}

              {(user.isAdmin || user.isSeller) && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {user.isAdmin ? "Administration" : "Seller tools"}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Buyer shopping uses your buyer account only. Seller tools stay on the seller dashboard.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.isSeller && (
                      <Link href="/seller">
                        <Button className="rounded-xl gap-2">
                          <Store className="w-4 h-4" />
                          Seller dashboard
                        </Button>
                      </Link>
                    )}
                    {user.isAdmin && (
                      <Link href="/admin">
                        <Button variant="outline" className="rounded-xl">
                          Admin panel
                        </Button>
                      </Link>
                    )}
                  </div>
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
