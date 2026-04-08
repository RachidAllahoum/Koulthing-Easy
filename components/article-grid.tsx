"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, Star, Sparkles, TrendingUp, Megaphone } from "lucide-react"
import { useState, useMemo } from "react"
import { filterArticles, type Article } from "@/lib/filter-utils"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"

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
  const { addItem } = useCart()
  const { isAuthenticated, user, sellerMode } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const canUseCart = isAuthenticated && user?.role === "buyer" && !sellerMode
  
  // Apply filters to articles
  const displayArticles = useMemo(() => {
    const baseArticles = articles ?? []
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

  const quickAdd = (article: Article, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canUseCart) {
      alert("Only buyers can use shopping cart")
      return
    }
    addItem({
      id: `${article.id}-default`,
      productId: article.id,
      name: article.title,
      price: article.price,
      shopName: article.shopName,
      shopId: article.shopId,
      image: article.image,
      quantity: 1,
    })
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
        {displayArticles.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">No products to show yet.</p>
        )}
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
              {canUseCart && (
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => quickAdd(article, e)}
                    className="w-full py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              )}
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
