"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useWishlist } from "@/lib/wishlist-context"
import { supabase } from "@/lib/supabase-client"
import { Heart, ArrowRight, Trash2 } from "lucide-react"
import { NoProductImage } from "@/components/no-uploaded-media"

interface WishlistRow {
  wishlistId: string
  productId: string
  name: string
  price: number
  image: string
  shopName: string
  shopId: string
}

export default function WishlistPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { refresh: refreshWishlistIds } = useWishlist()
  const [rows, setRows] = useState<WishlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isBuyer = Boolean(user && user.profileRole === "buyer" && !user.isAdmin)

  const loadRows = useCallback(async () => {
    if (!user?.id || !isBuyer) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: wl, error: wErr } = await supabase
        .from("wishlists")
        .select("id, product_id, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })

      if (wErr || !wl?.length) {
        if (wErr) console.warn("[wishlist page]", wErr.message)
        setRows([])
        return
      }

      const productIds = wl.map((r) => r.product_id as string)
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, price, images_array, shop_id")
        .in("id", productIds)

      if (pErr || !products?.length) {
        setRows([])
        return
      }

      const shopIds = [...new Set(products.map((p) => p.shop_id as string))]
      const { data: shops } = await supabase.from("shops").select("id, name").in("id", shopIds)
      const shopNameById = new Map((shops ?? []).map((s) => [s.id as string, (s.name as string) ?? "Shop"]))

      const productById = new Map(products.map((p) => [p.id as string, p]))
      const next: WishlistRow[] = []
      for (const w of wl) {
        const pid = w.product_id as string
        const p = productById.get(pid)
        if (!p) continue
        const imgs = (p.images_array as string[] | null) ?? []
        next.push({
          wishlistId: w.id as string,
          productId: pid,
          name: (p.name as string) ?? "Product",
          price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price) || 0,
          image: imgs.filter(Boolean)[0] ?? "",
          shopName: shopNameById.get(p.shop_id as string) ?? "Shop",
          shopId: p.shop_id as string,
        })
      }
      setRows(next)
    } finally {
      setLoading(false)
    }
  }, [user?.id, isBuyer])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent("/wishlist")}`)
      return
    }
    if (!isBuyer) {
      router.replace(user.isAdmin ? "/admin" : "/seller")
      return
    }
    void loadRows()
  }, [authLoading, user, isBuyer, router, loadRows])

  const handleRemove = async (productId: string) => {
    if (!user) return
    setRemovingId(productId)
    try {
      const { error } = await supabase.from("wishlists").delete().eq("buyer_id", user.id).eq("product_id", productId)
      if (!error) {
        setRows((prev) => prev.filter((r) => r.productId !== productId))
        await refreshWishlistIds()
      }
    } finally {
      setRemovingId(null)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user || !isBuyer) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">{!user ? "Redirecting to sign in…" : "Redirecting…"}</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Wishlist</h1>
        <p className="text-muted-foreground text-sm mb-8">Products you&apos;ve saved for later</p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 border border-dashed border-border rounded-2xl px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground text-sm mb-6">Save items you love from product pages or listings — they&apos;ll show up here.</p>
            <Button asChild className="rounded-full gap-2">
              <Link href="/articles">
                Browse products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((row) => (
              <div key={row.wishlistId} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                <Link href={`/product/${row.productId}`} className="block aspect-square bg-secondary relative group">
                  {row.image ? (
                    <img src={row.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <NoProductImage />
                  )}
                </Link>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <Link href={`/shop/${row.shopId}`} className="text-xs text-muted-foreground hover:text-accent transition-colors">
                    {row.shopName}
                  </Link>
                  <Link href={`/product/${row.productId}`} className="font-medium text-foreground line-clamp-2 hover:text-accent transition-colors">
                    {row.name}
                  </Link>
                  <p className="text-base font-semibold text-foreground mt-auto">{row.price.toLocaleString()} DZD</p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="rounded-lg flex-1" asChild>
                      <Link href={`/product/${row.productId}`}>View</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg shrink-0 text-destructive hover:text-destructive"
                      disabled={removingId === row.productId}
                      onClick={() => void handleRemove(row.productId)}
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
