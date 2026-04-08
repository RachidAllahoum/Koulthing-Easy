"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ShopFilters } from "@/components/shop-filters"
import { ShopCard } from "@/components/shop-card"
import { supabase } from "@/lib/supabase-client"

interface ShopCardModel {
  id: string
  name: string
  description: string
  category: string
  image: string
  coverImage: string
  rating: number
  reviewCount: number
  followers: number
  location: string
  isFollowing?: boolean
}

const COVERS = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop",
]

function coverForId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopCardModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, description, logo_url, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        setShops([])
        setLoading(false)
        return
      }

      const mapped =
        data?.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || "",
          category: "Shop",
          image: s.logo_url || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
          coverImage: coverForId(s.id),
          rating: 4.5,
          reviewCount: 0,
          followers: 0,
          location: "Algeria",
          isFollowing: false,
        })) ?? []

      setShops(mapped)
      setLoading(false)
    }

    load()
  }, [])

  const handleFollow = (shopId: string) => {
    setShops((prev) => prev.map((shop) => (shop.id === shopId ? { ...shop, isFollowing: !shop.isFollowing } : shop)))
  }

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
          <ShopFilters />
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{shops.length}</span> shops
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading shops...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onFollow={handleFollow} />
            ))}
          </div>
        )}

        {/* Load More */}
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
