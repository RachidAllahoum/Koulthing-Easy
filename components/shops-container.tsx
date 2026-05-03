"use client"

import { useMemo } from "react"
import { ShopCard } from "@/components/shop-card"
import { filterShops, type Shop } from "@/lib/filter-utils"

interface ShopsContainerProps {
  shops: Shop[]
  category?: string
  location?: string
  rating?: string
  sort?: string
}

export function ShopsContainer({
  shops,
  category = "All",
  location = "all",
  rating = "all",
  sort = "recommended",
}: ShopsContainerProps) {
  const filteredShops = useMemo(() => {
    return filterShops(shops, category, location, rating, sort)
  }, [shops, category, location, rating, sort])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredShops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  )
}
