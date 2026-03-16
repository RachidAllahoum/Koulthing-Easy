"use client"

import Link from "next/link"
import { MapPin, Star, Users, Store } from "lucide-react"
import { Button } from "@/components/ui/button"

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

interface ShopCardProps {
  shop: Shop
  onFollow?: (shopId: string) => void
}

export function ShopCard({ shop, onFollow }: ShopCardProps) {
  return (
    <Link href={`/shop/${shop.id}`} className="block group">
      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
        {/* Cover Image */}
        <div className="relative h-32 bg-secondary overflow-hidden">
          <img
            src={shop.coverImage || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop"}
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Category Badge */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-card/80 backdrop-blur-sm rounded-full text-xs font-medium text-foreground">
            {shop.category}
          </div>
        </div>

        {/* Shop Logo */}
        <div className="relative px-4">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-xl bg-card border-4 border-card shadow-md overflow-hidden">
            <img
              src={shop.image || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop"}
              alt={`${shop.name} logo`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="pt-10 px-4 pb-4">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
            {shop.name}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-3">
            {shop.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-medium text-foreground">{shop.rating}</span>
              <span className="text-muted-foreground">({shop.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{shop.followers.toLocaleString()} followers</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            <span>{shop.location}</span>
          </div>

          {/* Follow Button */}
          <Button
            variant={shop.isFollowing ? "secondary" : "default"}
            size="sm"
            className="w-full rounded-full"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFollow?.(shop.id)
            }}
          >
            {shop.isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      </div>
    </Link>
  )
}
