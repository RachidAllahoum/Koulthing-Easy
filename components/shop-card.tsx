"use client"

import Link from "next/link"
import { MapPin, Star, Users, Store as StoreIcon } from "lucide-react"
import type { Shop } from "@/lib/filter-utils"
import { useShopFollow } from "@/lib/use-shop-follow"
import { ShopFollowCardButton, ShopFollowHeartButton } from "@/components/shop-follow-controls"

interface ShopCardProps {
  shop: Shop
}

export function ShopCard({ shop }: ShopCardProps) {
  const follow = useShopFollow(shop.id, shop.sellerId)

  return (
    <Link href={`/shop/${shop.id}`} className="block group">
      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-32 bg-gradient-to-br from-primary/15 to-accent/15 overflow-hidden">
          {shop.coverImage ? (
            <img
              src={shop.coverImage}
              alt={shop.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : null}

          <div className="absolute top-3 left-3">
            <ShopFollowHeartButton vm={follow} />
          </div>

          <div className="absolute top-3 right-3 px-2 py-1 bg-card/80 backdrop-blur-sm rounded-full text-xs font-medium text-foreground">
            {shop.category}
          </div>
        </div>

        <div className="relative px-4">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-xl bg-card border-4 border-card shadow-md overflow-hidden flex items-center justify-center">
            {shop.image ? (
              <img src={shop.image} alt={`${shop.name} logo`} className="w-full h-full object-cover" />
            ) : (
              <StoreIcon className="w-8 h-8 text-muted-foreground" aria-hidden />
            )}
          </div>
        </div>

        <div className="pt-10 px-4 pb-4">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">{shop.name}</h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-3">{shop.description}</p>

          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-medium text-foreground">{shop.rating}</span>
              <span className="text-muted-foreground">({shop.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{follow.followerCount.toLocaleString()} followers</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{shop.location}</span>
          </div>

          <ShopFollowCardButton vm={follow} />
        </div>
      </div>
    </Link>
  )
}
