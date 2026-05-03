"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { VideoReels } from "@/components/video-reels"
import { FEATURE_REELS } from "@/lib/feature-flags"
import { ArticleFilters, type ProductFiltersState } from "@/components/article-filters"
import { ArticleGrid } from "@/components/article-grid"
import { supabase } from "@/lib/supabase-client"
import type { Article } from "@/lib/filter-utils"
import { mapProductToArticle, type ProductRow } from "@/lib/products-map"

const DEFAULT_FILTERS: ProductFiltersState = {
  search: "",
  category: "all",
  minPrice: "",
  maxPrice: "",
  size: "all",
  color: "all",
  sort: "newest",
}

type FilterOptions = {
  categories: string[]
  sizes: string[]
  colors: string[]
}

function toNum(input: string): number | null {
  if (!input.trim()) return null
  const n = Number(input)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function ArticlesBrowse() {
  const [products, setProducts] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ProductFiltersState>(DEFAULT_FILTERS)

  const handleFiltersChange = useCallback((next: ProductFiltersState) => {
    setFilters(next)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)

      let query = supabase
        .from("products")
        .select(
          "id, shop_id, name, description, price, base_price, sizes_array, colors_array, stock, images_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) ), shops!inner(name, is_active, seller_id, shop_category)",
        )
        .eq("shops.is_active", true)

      const search = filters.search.trim()
      if (search) query = query.ilike("name", `%${search}%`)

      if (filters.category !== "all") {
        query = query.eq("shops.shop_category", filters.category)
      }

      const minPrice = toNum(filters.minPrice)
      const maxPrice = toNum(filters.maxPrice)
      if (minPrice !== null) query = query.gte("price", minPrice)
      if (maxPrice !== null) query = query.lte("price", maxPrice)

      if (filters.size !== "all") {
        query = query.contains("sizes_array", [filters.size])
      }
      if (filters.color !== "all") {
        query = query.contains("colors_array", [filters.color])
      }

      if (filters.sort === "price-asc") {
        query = query.order("price", { ascending: true })
      } else if (filters.sort === "price-desc") {
        query = query.order("price", { ascending: false })
      } else {
        query = query.order("created_at", { ascending: false })
      }

      const { data, error } = await query.limit(240)

      if (cancelled) return
      if (error) {
        console.error("Failed to load products", error)
        setProducts([])
        setLoading(false)
        return
      }

      let mapped = (data as ProductRow[] | null)?.map((r) => mapProductToArticle(r)) ?? []

      if (filters.sort === "bestselling" && mapped.length > 0) {
        const productIds = mapped.map((p) => p.id)
        const { data: salesRows, error: salesErr } = await supabase.rpc("get_products_sales_counts", {
          p_product_ids: productIds,
        })
        if (!salesErr && !cancelled) {
          const soldByProduct = new Map<string, number>(
            ((salesRows ?? []) as { product_id: string; sold_count: number }[]).map((row) => [
              row.product_id,
              Number(row.sold_count) || 0,
            ]),
          )
          mapped = mapped
            .map((article) => ({ ...article, soldCount: soldByProduct.get(article.id) ?? 0 }))
            .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
        } else {
          mapped = mapped.sort((a, b) => {
            const ta = a.createdAt ? Date.parse(a.createdAt) : NaN
            const tb = b.createdAt ? Date.parse(b.createdAt) : NaN
            if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta
            return b.id.localeCompare(a.id)
          })
        }
      }

      setProducts(mapped)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filters])

  const options: FilterOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        products
          .map((p) => p.category?.trim())
          .filter((value): value is string => Boolean(value && value.length > 0)),
      ),
    ).sort((a, b) => a.localeCompare(b))

    const sizes = Array.from(
      new Set(products.flatMap((p) => (p.sizes ?? []).map((s) => s.trim()).filter(Boolean))),
    ).sort((a, b) => a.localeCompare(b))

    const colors = Array.from(
      new Set(products.flatMap((p) => (p.colors ?? []).map((c) => c.trim()).filter(Boolean))),
    ).sort((a, b) => a.localeCompare(b))

    return { categories, sizes, colors }
  }, [products])

  useEffect(() => {
    if (filters.category !== "all" && !options.categories.includes(filters.category)) {
      setFilters((prev) => ({ ...prev, category: "all" }))
      return
    }
    if (filters.size !== "all" && !options.sizes.includes(filters.size)) {
      setFilters((prev) => ({ ...prev, size: "all" }))
      return
    }
    if (filters.color !== "all" && !options.colors.includes(filters.color)) {
      setFilters((prev) => ({ ...prev, color: "all" }))
    }
  }, [filters.category, filters.size, filters.color, options])

  return (
    <>
      {FEATURE_REELS ? <VideoReels /> : null}

      <div className="py-6 border-b border-border">
        <ArticleFilters
          filters={filters}
          options={options}
          foundCount={products.length}
          onFiltersChange={handleFiltersChange}
          onClear={clearFilters}
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading products...</p>
      ) : (
        <ArticleGrid title="Products" showBadges={false} articles={products} />
      )}

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
