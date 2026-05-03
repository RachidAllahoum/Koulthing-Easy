"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"

interface WishlistContextType {
  /** Product ids in the signed-in shopper's wishlist (empty for guests / admin). */
  savedProductIds: ReadonlySet<string>
  isSaved: (productId: string) => boolean
  isLoading: boolean
  refresh: () => Promise<void>
  /** Shoppers: toggle server row. Guests / admin: redirect to login (when `redirectAfterLogin` passed). */
  toggleWishlist: (productId: string, redirectAfterLogin?: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const isBuyer = Boolean(user && !user.isAdmin)

  const refresh = useCallback(async () => {
    if (!user?.id || !isBuyer) {
      setSavedProductIds(new Set())
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("wishlists").select("product_id").eq("buyer_id", user.id)
      if (error) {
        console.warn("[wishlist] fetch failed", error.message)
        setSavedProductIds(new Set())
        return
      }
      setSavedProductIds(new Set((data ?? []).map((r) => r.product_id as string)))
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, isBuyer])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh])

  const isSaved = useCallback(
    (productId: string) => {
      return savedProductIds.has(productId)
    },
    [savedProductIds],
  )

  const toggleWishlist = useCallback(
    async (productId: string, redirectAfterLogin = "/articles") => {
      if (!user) {
        const safe =
          redirectAfterLogin.startsWith("/") && !redirectAfterLogin.startsWith("//")
            ? redirectAfterLogin
            : "/articles"
        router.push(`/login?redirect=${encodeURIComponent(safe)}`)
        return
      }
      if (!isBuyer) return

      if (savedProductIds.has(productId)) {
        const { error } = await supabase.from("wishlists").delete().eq("buyer_id", user.id).eq("product_id", productId)
        if (error) {
          console.warn("[wishlist] delete failed", error.message)
          return
        }
        setSavedProductIds((prev) => {
          const nextSet = new Set(prev)
          nextSet.delete(productId)
          return nextSet
        })
        return
      }

      const { error } = await supabase.from("wishlists").insert({
        buyer_id: user.id,
        product_id: productId,
      })
      if (error) {
        if (error.code === "23505") {
          setSavedProductIds((prev) => new Set(prev).add(productId))
          return
        }
        console.warn("[wishlist] insert failed", error.message)
        return
      }
      setSavedProductIds((prev) => new Set(prev).add(productId))
    },
    [user, isBuyer, savedProductIds, router],
  )

  const value = useMemo(
    () => ({
      savedProductIds,
      isSaved,
      isLoading: authLoading || isLoading,
      refresh,
      toggleWishlist,
    }),
    [savedProductIds, isSaved, authLoading, isLoading, refresh, toggleWishlist],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider")
  return ctx
}
