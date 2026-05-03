"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Store } from "lucide-react"
import { NoProductImage } from "@/components/no-uploaded-media"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { supabase } from "@/lib/supabase-client"

type HomeProductRow = {
  id: string
  name: string
  price: number | string
  images_array: string[] | null
  shops:
    | {
        id: string
        name: string
      }
    | {
        id: string
        name: string
      }[]
    | null
}

type HomeShopRow = {
  id: string
  name: string
  shop_category: string | null
  logo_url: string | null
}

export default function HomePage() {
  const [products, setProducts] = useState<HomeProductRow[]>([])
  const [shops, setShops] = useState<HomeShopRow[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingShops, setLoadingShops] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true)
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, images_array, shops!inner(id, name, is_active)")
        .eq("shops.is_active", true)
        .order("created_at", { ascending: false })
        .limit(12)

      if (error) {
        console.error("Failed to load homepage products", error)
        setProducts([])
      } else {
        setProducts((data ?? []) as HomeProductRow[])
      }
      setLoadingProducts(false)
    }

    const loadShops = async () => {
      setLoadingShops(true)
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, shop_category, logo_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6)

      if (error) {
        console.error("Failed to load suggested shops", error)
        setShops([])
      } else {
        setShops((data ?? []) as HomeShopRow[])
      }
      setLoadingShops(false)
    }

    void Promise.all([loadProducts(), loadShops()])
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Products</h1>
            <Link href="/articles" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          </div>

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No products available right now.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => {
                const shop = Array.isArray(product.shops) ? product.shops[0] : product.shops
                const image = product.images_array?.filter(Boolean)[0] ?? ""
                const price = Number(product.price) || 0
                return (
                  <Link key={product.id} href={`/product/${product.id}`} className="group">
                    <article className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                        {image ? (
                          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <NoProductImage />
                        )}
                      </div>
                      <div className="p-3 md:p-4">
                        <h2 className="font-medium text-foreground line-clamp-1">{product.name}</h2>
                        <p className="text-sm font-semibold text-foreground mt-1">{price.toLocaleString()} DZD</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{shop?.name || "Shop"}</p>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">Suggested Shops</h2>
            <Link href="/shops" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse shops
            </Link>
          </div>

          {loadingShops ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading shops...</p>
          ) : shops.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No shops to suggest yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {shops.map((shop) => (
                <Link key={shop.id} href={`/shop/${shop.id}`} className="shrink-0 w-[220px] group">
                  <article className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-lg bg-secondary border border-border overflow-hidden flex items-center justify-center mb-3">
                      {shop.logo_url ? (
                        <img src={shop.logo_url} alt={`${shop.name} logo`} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">{shop.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{shop.shop_category?.trim() || "Shop"}</p>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
