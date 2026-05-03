"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"

function toCount(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number" && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Follower count (RPC) + current shopper’s follow row for a shop.
 * Use on shop detail, cards, product page, etc.
 */
export function useShopFollow(shopId: string | null | undefined, sellerId?: string | null) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const isBuyer = Boolean(user && !user.isAdmin)
  const isOwnShop = Boolean(user && sellerId && user.id === sellerId)

  const refresh = useCallback(async () => {
    if (!shopId) {
      setFollowerCount(0)
      setIsFollowing(false)
      return
    }
    const { data: countRaw, error: countErr } = await supabase.rpc("get_shop_follower_count", {
      p_shop_id: shopId,
    })
    if (!countErr) {
      setFollowerCount(toCount(countRaw))
    } else {
      setFollowerCount(0)
    }

    if (user?.id && isBuyer) {
      const { data: row, error: rowErr } = await supabase
        .from("followers")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("shop_id", shopId)
        .maybeSingle()
      if (!rowErr) {
        setIsFollowing(Boolean(row))
      } else {
        setIsFollowing(false)
      }
    } else {
      setIsFollowing(false)
    }
  }, [shopId, user?.id, isBuyer])

  useEffect(() => {
    if (authLoading || !shopId) return
    void refresh()
  }, [authLoading, shopId, refresh])

  const toggleFollow = useCallback(async () => {
    if (!shopId) return
    if (!user) {
      const ret = pathname?.startsWith("/") ? pathname : `/shop/${shopId}`
      router.push(`/login?redirect=${encodeURIComponent(ret)}`)
      return
    }
    if (isOwnShop || !isBuyer || followBusy) return
    setFollowBusy(true)
    try {
      if (isFollowing) {
        const { error } = await supabase.from("followers").delete().eq("buyer_id", user.id).eq("shop_id", shopId)
        if (!error) {
          setIsFollowing(false)
          setFollowerCount((c) => Math.max(0, c - 1))
        }
      } else {
        const { error } = await supabase.from("followers").insert({ buyer_id: user.id, shop_id: shopId })
        if (!error) {
          setIsFollowing(true)
          setFollowerCount((c) => c + 1)
        } else if ((error as { code?: string }).code === "23505") {
          setIsFollowing(true)
          await refresh()
        }
      }
    } finally {
      setFollowBusy(false)
    }
  }, [shopId, user, isOwnShop, isBuyer, isFollowing, followBusy, router, pathname, refresh])

  return {
    followerCount,
    isFollowing,
    isOwnShop,
    isBuyer,
    isLoggedIn: Boolean(user),
    followBusy,
    toggleFollow,
    refresh,
  }
}
