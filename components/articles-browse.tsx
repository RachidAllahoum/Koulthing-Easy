"use client"

import { useCallback, useEffect, useState } from "react"
import { VideoReels } from "@/components/video-reels"
import { ArticleFilters } from "@/components/article-filters"
import { ArticleGrid } from "@/components/article-grid"
import { supabase } from "@/lib/supabase-client"
import type { Article } from "@/lib/filter-utils"
import { mapProductToArticle, type ProductRow } from "@/lib/products-map"

export function ArticlesBrowse() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: "All", price: "all", sort: "recommended" })

  const handleFiltersChange = useCallback((next: { category: string; price: string; sort: string }) => {
    setFilters((prev) => {
      if (
        prev.category === next.category &&
        prev.price === next.price &&
        prev.sort === next.sort
      ) {
        return prev
      }
      return { category: next.category, price: next.price, sort: next.sort }
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const attempt = await supabase
        .from("products")
        .select("id, shop_id, name, description, price, sizes_array, colors_array, stock, images_array, created_at, shops!inner(name, is_active)")
        .eq("shops.is_active", true)
        .order("created_at", { ascending: false })
        .limit(120)

      let rows: ProductRow[] | null = attempt.data as ProductRow[] | null
      let err = attempt.error

      if (err) {
        const fallback = await supabase
          .from("products")
          .select("id, shop_id, name, description, price, sizes_array, colors_array, stock, images_array, created_at, shops(name)")
          .order("created_at", { ascending: false })
          .limit(120)
        rows = fallback.data as ProductRow[] | null
        err = fallback.error
      }

      if (err) {
        console.error("Failed to load products", err)
        setArticles([])
        setLoading(false)
        return
      }

      const mapped = rows?.map((r) => mapProductToArticle(r)) ?? []

      // Light embellishment: mark a few items with badges for sections that show badges
      const withBadges = mapped.map((a, i) => ({
        ...a,
        badge: i % 7 === 0 ? ("suggested" as const) : i % 11 === 0 ? ("bestselling" as const) : i % 13 === 0 ? ("ad" as const) : undefined,
      }))

      setArticles(withBadges)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <>
      <VideoReels />

      <div className="py-6 border-b border-border">
        <ArticleFilters onFiltersChange={handleFiltersChange} />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading products...</p>
      ) : (
        <>
          <ArticleGrid title="Suggested for You" category={filters.category} priceRange={filters.price} sortBy="recommended" articles={articles} />
          <ArticleGrid title="Best Selling" showBadges={false} category={filters.category} priceRange={filters.price} sortBy="bestselling" articles={articles} />
          <ArticleGrid title="Recently Added" showBadges={false} category={filters.category} priceRange={filters.price} sortBy="newest" articles={articles} />
        </>
      )}

      {/* Advertisements Section */}
      <section className="py-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-8 md:p-12">
          <div className="relative z-10 max-w-xl">
            <span className="inline-block px-3 py-1 bg-card/20 backdrop-blur-sm rounded-full text-xs font-medium text-card mb-4">
              Featured Promotion
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-card mb-3">Summer Sale: Up to 50% Off</h2>
            <p className="text-card/80 mb-6">
              Shop the best deals on fashion, electronics, and home essentials from top sellers.
            </p>
            <button className="px-6 py-3 bg-card text-foreground font-medium rounded-full hover:bg-card/90 transition-colors">Shop Now</button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-card/10 rounded-full blur-3xl" />
          <div className="absolute -right-10 top-0 w-40 h-40 bg-card/5 rounded-full blur-2xl" />
        </div>
      </section>
    </>
  )
}
