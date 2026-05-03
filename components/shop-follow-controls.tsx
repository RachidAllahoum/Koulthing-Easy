"use client"

import { Heart, UserMinus, UserPlus, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { useShopFollow } from "@/lib/use-shop-follow"

type FollowVm = ReturnType<typeof useShopFollow>

/** Large Follow / Unfollow (shop detail hero). */
export function ShopFollowHeroButtons({ vm }: { vm: FollowVm }) {
  const { isFollowing, isOwnShop, isBuyer, isLoggedIn, followBusy, toggleFollow } = vm
  if (isOwnShop) {
    return (
      <Button type="button" size="lg" variant="secondary" className="rounded-full gap-2" disabled>
        <Store className="w-4 h-4" />
        Your shop
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="lg"
      variant={isFollowing ? "outline" : "default"}
      className="rounded-full gap-2 min-w-[8.5rem]"
      disabled={followBusy || (isLoggedIn && !isBuyer)}
      title={isLoggedIn && !isBuyer ? "Only buyer accounts can follow shops" : undefined}
      onClick={() => void toggleFollow()}
    >
      {isFollowing ? (
        <>
          <UserMinus className="w-4 h-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </Button>
  )
}

/** Heart on cover / compact areas; guests see outline and go to login on click. */
export function ShopFollowHeartButton({
  vm,
  className = "",
}: {
  vm: FollowVm
  className?: string
}) {
  const { isFollowing, isOwnShop, followBusy, toggleFollow } = vm
  if (isOwnShop) return null
  return (
    <button
      type="button"
      title={isFollowing ? "Unfollow shop" : "Save shop"}
      disabled={followBusy}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggleFollow()
      }}
      className={cn(
        "z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm border border-border/60 bg-card/90 text-foreground hover:bg-card",
        className,
      )}
    >
      <Heart className={`w-4 h-4 ${isFollowing ? "fill-accent text-accent" : ""}`} />
    </button>
  )
}

/** Full-width Follow / Unfollow on shop cards. */
export function ShopFollowCardButton({ vm }: { vm: FollowVm }) {
  const { isFollowing, isOwnShop, isBuyer, isLoggedIn, followBusy, toggleFollow } = vm
  if (isOwnShop) {
    return (
      <Button type="button" variant="secondary" size="sm" className="w-full rounded-full" disabled>
        Your shop
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className="w-full rounded-full"
      disabled={followBusy || (isLoggedIn && !isBuyer)}
      title={isLoggedIn && !isBuyer ? "Only buyers can follow; sign in as a buyer" : undefined}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggleFollow()
      }}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  )
}
