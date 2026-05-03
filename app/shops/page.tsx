"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ShopFilters } from "@/components/shop-filters"
import { ShopsContainer } from "@/components/shops-container"
import { supabase } from "@/lib/supabase-client"
import { filterShops, type Shop } from "@/lib/filter-utils"

type ShopListRow = {
  id: string
  seller_id: string
  name: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  shop_category: string | null
  city: string | null
  wilaya: string | null
  created_at: string
}

function toCount(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number" && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: "All",
    location: "all",
    rating: "all",
    sort: "recommended",
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("shops")
        .select("id, seller_id, name, description, logo_url, cover_url, shop_category, city, wilaya, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        setShops([])
        setLoading(false)
        return
      }

      const rows = (data ?? []) as ShopListRow[]
      const countResults = await Promise.all(
        rows.map(async (s) => {
          const { data: c, error: cErr } = await supabase.rpc("get_shop_follower_count", { p_shop_id: s.id })
          return { id: s.id, n: cErr ? 0 : toCount(c) }
        }),
      )
      const countById = new Map(countResults.map((r) => [r.id, r.n]))

      const mapped: Shop[] = rows.map((s) => {
        const city = s.city?.trim() ?? ""
        const wilaya = s.wilaya?.trim() ?? ""
        const loc = [city, wilaya].filter(Boolean).join(", ") || "—"
        return {
          id: s.id,
          sellerId: s.seller_id,
          name: s.name,
          description: s.description || "",
          category: s.shop_category?.trim() || "Shop",
          image: s.logo_url?.trim() || "",
          coverImage: s.cover_url?.trim() || "",
          rating: 4.5,
          reviewCount: 0,
          followers: countById.get(s.id) ?? 0,
          location: loc,
        }
      })

      setShops(mapped)
      setLoading(false)
    }

    void load()
  }, [])

  const filteredShops = useMemo(
    () => filterShops(shops, filters.category, filters.location, filters.rating, filters.sort),
    [shops, filters.category, filters.location, filters.rating, filters.sort],
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Discover Amazing Shops</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore curated shops from verified sellers across Algeria. Find unique products and support local businesses.
          </p>
        </section>

        <div className="mb-8">
          <ShopFilters onFiltersChange={setFilters} />
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{loading ? "—" : filteredShops.length}</span>
            {loading ? "" : shops.length !== filteredShops.length ? ` of ${shops.length}` : ""} shops
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading shops...</p>
        ) : (
          <ShopsContainer
            shops={shops}
            category={filters.category}
            location={filters.location}
            rating={filters.rating}
            sort={filters.sort}
          />
        )}

        <div className="mt-12 flex justify-center">
          <button className="px-8 py-3 bg-secondary text-foreground font-medium rounded-full hover:bg-secondary/80 transition-colors">
            Load More Shops
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
