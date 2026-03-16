"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ShopFilters } from "@/components/shop-filters"
import { ShopCard } from "@/components/shop-card"

const placeholderShops = [
  {
    id: "shop-1",
    name: "Fashion House",
    description: "Premium fashion and accessories for the modern lifestyle. Quality clothing for every occasion.",
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 324,
    followers: 12500,
    location: "Algiers",
    isFollowing: false,
  },
  {
    id: "shop-2",
    name: "Tech Gadgets",
    description: "Latest electronics and gadgets. Smartphones, accessories, and smart home devices.",
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 189,
    followers: 8900,
    location: "Oran",
    isFollowing: true,
  },
  {
    id: "shop-3",
    name: "Artisan Home",
    description: "Handcrafted home decor and furniture. Unique pieces made by local artisans.",
    category: "Handmade",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 156,
    followers: 5600,
    location: "Constantine",
    isFollowing: false,
  },
  {
    id: "shop-4",
    name: "Urban Style",
    description: "Streetwear and urban fashion. Bold designs for the young and trendy.",
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 278,
    followers: 15200,
    location: "Algiers",
    isFollowing: false,
  },
  {
    id: "shop-5",
    name: "Beauty Essentials",
    description: "Skincare, makeup, and beauty products. Natural and organic options available.",
    category: "Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 203,
    followers: 7800,
    location: "Blida",
    isFollowing: true,
  },
  {
    id: "shop-6",
    name: "Sports Zone",
    description: "Sports equipment and athletic wear. Gear for all your fitness needs.",
    category: "Sports",
    image: "https://images.unsplash.com/photo-1461896836934- voices-of-black-music-00001?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 145,
    followers: 4300,
    location: "Annaba",
    isFollowing: false,
  },
  {
    id: "shop-7",
    name: "Green Garden",
    description: "Plants, gardening tools, and outdoor decor. Create your perfect garden oasis.",
    category: "Home & Garden",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 98,
    followers: 3200,
    location: "Algiers",
    isFollowing: false,
  },
  {
    id: "shop-8",
    name: "Gourmet Delights",
    description: "Artisan foods, spices, and local delicacies. Taste the best of Algeria.",
    category: "Food",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 267,
    followers: 9100,
    location: "Constantine",
    isFollowing: false,
  },
]

export default function ShopsPage() {
  const [shops, setShops] = useState(placeholderShops)

  const handleFollow = (shopId: string) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === shopId ? { ...shop, isFollowing: !shop.isFollowing } : shop
      )
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Discover Amazing Shops
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore curated shops from verified sellers across Algeria. Find unique products and support local businesses.
          </p>
        </section>

        {/* Filters */}
        <div className="mb-8">
          <ShopFilters />
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{shops.length}</span> shops
          </p>
        </div>

        {/* Shop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} onFollow={handleFollow} />
          ))}
        </div>

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
