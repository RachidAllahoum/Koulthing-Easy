"use client"

import { useState, useMemo } from "react"
import { ShopCard } from "@/components/shop-card"
import { filterShops } from "@/lib/filter-utils"

interface Shop {
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

interface ShopsContainerProps {
  shops: Shop[]
  category?: string
  location?: string
  rating?: string
  sort?: string
  onFollow?: (shopId: string) => void
}

export function ShopsContainer({
  shops,
  category = "All",
  location = "all",
  rating = "all",
  sort = "recommended",
  onFollow,
}: ShopsContainerProps) {
  // Apply filters to shops
  const filteredShops = useMemo(() => {
    return filterShops(shops, category, location, rating, sort)
  }, [shops, category, location, rating, sort])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredShops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} onFollow={onFollow} />
      ))}
    </div>
  )
}
