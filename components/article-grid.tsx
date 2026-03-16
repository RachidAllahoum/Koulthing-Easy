"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, ShoppingCart, Star, Sparkles, TrendingUp, Megaphone } from "lucide-react"
import { useState, useMemo } from "react"
import { filterArticles } from "@/lib/filter-utils"

interface Article {
  id: string
  title: string
  price: number
  originalPrice?: number
  shopName: string
  shopId: string
  rating: number
  reviewCount: number
  image: string
  badge?: "suggested" | "bestselling" | "ad"
}

const placeholderArticles: Article[] = [
  {
    id: "1",
    title: "Elegant Summer Dress with Floral Pattern",
    price: 4500,
    originalPrice: 6000,
    shopName: "Fashion House",
    shopId: "shop-1",
    rating: 4.8,
    reviewCount: 124,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
    badge: "suggested",
  },
  {
    id: "2",
    title: "Wireless Bluetooth Earbuds Pro",
    price: 8900,
    shopName: "Tech Gadgets",
    shopId: "shop-2",
    rating: 4.6,
    reviewCount: 89,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
    badge: "bestselling",
  },
  {
    id: "3",
    title: "Handmade Ceramic Vase Set",
    price: 3200,
    shopName: "Artisan Home",
    shopId: "shop-3",
    rating: 4.9,
    reviewCount: 56,
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    title: "Premium Leather Wallet",
    price: 2800,
    originalPrice: 3500,
    shopName: "Urban Style",
    shopId: "shop-4",
    rating: 4.7,
    reviewCount: 203,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop",
    badge: "ad",
  },
  {
    id: "5",
    title: "Natural Skincare Gift Set",
    price: 5500,
    shopName: "Beauty Essentials",
    shopId: "shop-5",
    rating: 4.5,
    reviewCount: 78,
    image: "https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=400&h=400&fit=crop",
    badge: "suggested",
  },
  {
    id: "6",
    title: "Vintage Analog Watch",
    price: 12000,
    shopName: "Time Classics",
    shopId: "shop-6",
    rating: 4.8,
    reviewCount: 167,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop",
    badge: "bestselling",
  },
  {
    id: "7",
    title: "Organic Cotton T-Shirt",
    price: 1800,
    shopName: "Eco Wear",
    shopId: "shop-7",
    rating: 4.4,
    reviewCount: 92,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
  },
  {
    id: "8",
    title: "Smart Home Speaker",
    price: 7500,
    originalPrice: 9000,
    shopName: "Tech Gadgets",
    shopId: "shop-2",
    rating: 4.6,
    reviewCount: 145,
    image: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=400&fit=crop",
  },
]

function BadgeIcon({ badge }: { badge: Article["badge"] }) {
  switch (badge) {
    case "suggested":
      return <Sparkles className="w-3 h-3" />
    case "bestselling":
      return <TrendingUp className="w-3 h-3" />
    case "ad":
      return <Megaphone className="w-3 h-3" />
    default:
      return null
  }
}

function BadgeLabel({ badge }: { badge: Article["badge"] }) {
  switch (badge) {
    case "suggested":
      return "Suggested"
    case "bestselling":
      return "Best Seller"
    case "ad":
      return "Sponsored"
    default:
      return null
  }
}

interface ArticleGridProps {
  title: string
  showBadges?: boolean
  articles?: Article[]
  category?: string
  priceRange?: string
  sortBy?: string
}

export function ArticleGrid({ title, showBadges = true, articles, category = "All", priceRange = "all", sortBy = "recommended" }: ArticleGridProps) {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  
  // Apply filters to articles
  const displayArticles = useMemo(() => {
    const baseArticles = articles || placeholderArticles
    return filterArticles(baseArticles, category, priceRange, sortBy)
  }, [articles, category, priceRange, sortBy])

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const navigateToShop = (shopId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/shop/${shopId}`)
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {displayArticles.map((article) => (
          <Link key={article.id} href={`/product/${article.id}`} className="group">
            <div className="relative rounded-xl overflow-hidden bg-secondary">
              {/* Article Image */}
              <div className="aspect-square overflow-hidden bg-secondary">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Badge */}
              {showBadges && article.badge && (
                <div
                  className={`absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    article.badge === "ad"
                      ? "bg-muted text-muted-foreground"
                      : article.badge === "bestselling"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <BadgeIcon badge={article.badge} />
                  <BadgeLabel badge={article.badge} />
                </div>
              )}

              {/* Discount Badge */}
              {article.originalPrice && (
                <div className="absolute top-3 right-12 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
                  -{Math.round((1 - article.price / article.originalPrice) * 100)}%
                </div>
              )}

              {/* Favorite Button */}
              <button
                onClick={(e) => toggleFavorite(article.id, e)}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  favorites.has(article.id)
                    ? "bg-accent text-accent-foreground"
                    : "bg-card/80 text-foreground hover:bg-card"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${favorites.has(article.id) ? "fill-current" : ""}`}
                />
              </button>

              {/* Quick Add */}
              <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-1">
              <button
                onClick={(e) => navigateToShop(article.shopId, e)}
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                {article.shopName}
              </button>
              <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {article.title}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-medium text-foreground">{article.rating}</span>
                <span className="text-xs text-muted-foreground">({article.reviewCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  {article.price.toLocaleString()} DZD
                </span>
                {article.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {article.originalPrice.toLocaleString()} DZD
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
