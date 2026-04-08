export interface Article {
  id: string
  title: string
  price: number
  originalPrice?: number
  shopName: string
  shopId: string
  rating: number
  reviewCount: number
  image: string
  category?: string
  badge?: "suggested" | "bestselling" | "ad"
  /** ISO timestamp from DB when available (used for sorting) */
  createdAt?: string
}

export interface Shop {
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

// Article filtering
export function filterArticles(
  articles: Article[],
  category: string,
  priceRange: string,
  sortBy: string
): Article[] {
  let filtered = [...articles]

  // Filter by category
  if (category && category !== "All") {
    filtered = filtered.filter((article) => {
      const articleCategory = article.category || article.shopName
      return articleCategory.toLowerCase().includes(category.toLowerCase())
    })
  }

  // Filter by price range
  if (priceRange && priceRange !== "all") {
    filtered = filtered.filter((article) => {
      switch (priceRange) {
        case "0-1000":
          return article.price < 1000
        case "1000-5000":
          return article.price >= 1000 && article.price <= 5000
        case "5000-10000":
          return article.price >= 5000 && article.price <= 10000
        case "10000+":
          return article.price > 10000
        default:
          return true
      }
    })
  }

  // Sort
  switch (sortBy) {
    case "newest":
      filtered.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : NaN
        const tb = b.createdAt ? Date.parse(b.createdAt) : NaN
        if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta
        return b.id.localeCompare(a.id)
      })
      break
    case "price-asc":
      filtered.sort((a, b) => a.price - b.price)
      break
    case "price-desc":
      filtered.sort((a, b) => b.price - a.price)
      break
    case "bestselling":
      filtered.sort((a, b) => b.reviewCount - a.reviewCount)
      break
    case "recommended":
    default:
      break
  }

  return filtered
}

// Shop filtering
export function filterShops(
  shops: Shop[],
  category: string,
  location: string,
  rating: string,
  sortBy: string
): Shop[] {
  let filtered = [...shops]

  // Filter by category
  if (category && category !== "All") {
    filtered = filtered.filter((shop) => shop.category === category)
  }

  // Filter by location
  if (location && location !== "all") {
    const locationMap: { [key: string]: string } = {
      algiers: "Algiers",
      oran: "Oran",
      constantine: "Constantine",
      annaba: "Annaba",
      blida: "Blida",
    }
    const locationName = locationMap[location]
    filtered = filtered.filter((shop) => shop.location === locationName)
  }

  // Filter by rating
  if (rating && rating !== "all") {
    const minRating = parseFloat(rating)
    filtered = filtered.filter((shop) => shop.rating >= minRating)
  }

  // Sort
  switch (sortBy) {
    case "popular":
      filtered.sort((a, b) => b.followers - a.followers)
      break
    case "rating":
      filtered.sort((a, b) => b.rating - a.rating)
      break
    case "followers":
      filtered.sort((a, b) => b.followers - a.followers)
      break
    case "newest":
      filtered.reverse()
      break
    case "recommended":
    default:
      break
  }

  return filtered
}
