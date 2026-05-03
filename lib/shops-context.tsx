"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase-client"

export interface Shop {
  id: string
  name: string
  description: string
  category: string
  sellerId: string
  sellerName: string
  sellerEmail: string
  location: string
  rating: number
  reviewCount: number
  followers: number
  image: string
  coverImage: string
  shopPhone: string
  instagramUrl: string
  facebookUrl: string
  streetAddress: string
  city: string
  wilaya: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

interface ShopsContextType {
  shops: Shop[]
  allShops: Shop[]
  isLoading: boolean
  fetchError: string | null
  hasCatalogSnapshot: boolean
  activeShopsCount: number
  refresh: () => Promise<void>
  getShopById: (shopId: string) => Shop | undefined
  getApprovedShops: () => Shop[]
  getSellerShops: (sellerId: string) => Shop[]
  toggleShopActive: (shopId: string, isActive: boolean) => Promise<void>
}

const ShopsContext = createContext<ShopsContextType | undefined>(undefined)

interface ShopRow {
  id: string
  seller_id: string
  name: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  shop_category: string | null
  street_address: string | null
  city: string | null
  wilaya: string | null
  shop_phone: string | null
  instagram_url: string | null
  facebook_url: string | null
  created_at: string
  is_active: boolean
}

export function ShopsProvider({ children }: { children: React.ReactNode }) {
  const [dbShops, setDbShops] = useState<ShopRow[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string | null; email: string }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [hasCatalogSnapshot, setHasCatalogSnapshot] = useState(false)

  const refresh = useCallback(async () => {
    console.log("[ShopsProvider] refresh shops START")
    setIsLoading(true)
    setFetchError(null)
    try {
      const { data: shopsRows, error: shopsError } = await supabase
        .from("shops")
        .select(
          "id, seller_id, name, description, logo_url, cover_url, shop_category, street_address, city, wilaya, shop_phone, instagram_url, facebook_url, created_at, is_active",
        )
        .order("created_at", { ascending: false })

      if (shopsError) throw shopsError

      const userIds = Array.from(new Set((shopsRows ?? []).map((row) => row.seller_id)))
      let profileMap: Record<string, { full_name: string | null; email: string }> = {}

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)

        if (!profilesError) {
          profileMap = (profiles ?? []).reduce(
            (acc, row) => ({
              ...acc,
              [row.id]: { full_name: row.full_name, email: row.email },
            }),
            {},
          )
        } else {
          console.warn("[ShopsProvider] profiles lookup failed", profilesError.message)
        }
      }

      setDbShops((shopsRows ?? []) as ShopRow[])
      setProfilesById(profileMap)
      setHasCatalogSnapshot(true)
      console.log("[ShopsProvider] refresh shops DONE", { rows: shopsRows?.length ?? 0 })
    } catch (error: unknown) {
      const msg =
        error !== null && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to load shops"
      setFetchError(msg)
      console.error("[ShopsProvider] refresh shops FAILED", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const mapDbShopToShop = useCallback(
    (row: ShopRow): Shop => {
      const city = row.city?.trim() ?? ""
      const wilaya = row.wilaya?.trim() ?? ""
      const loc = [city, wilaya].filter(Boolean).join(", ")
      return {
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        category: row.shop_category?.trim() || "Shop",
        sellerId: row.seller_id,
        sellerName: profilesById[row.seller_id]?.full_name || "Seller",
        sellerEmail: profilesById[row.seller_id]?.email || "",
        location: loc || "—",
        rating: 0,
        reviewCount: 0,
        followers: 0,
        image: row.logo_url?.trim() || "",
        coverImage: row.cover_url?.trim() || "",
        shopPhone: row.shop_phone?.trim() || "",
        instagramUrl: row.instagram_url?.trim() || "",
        facebookUrl: row.facebook_url?.trim() || "",
        streetAddress: row.street_address?.trim() || "",
        city,
        wilaya,
        status: row.is_active ? "approved" : "rejected",
        createdAt: row.created_at,
      }
    },
    [profilesById],
  )

  const shops = useMemo(() => dbShops.map(mapDbShopToShop), [dbShops, mapDbShopToShop])
  const allShops = shops
  const activeShopsCount = useMemo(() => dbShops.filter((row) => row.is_active).length, [dbShops])

  const getShopById = (shopId: string) => shops.find((shop) => shop.id === shopId)
  const getApprovedShops = () => shops.filter((shop) => shop.status === "approved")
  const getSellerShops = (sellerId: string) => dbShops.filter((row) => row.seller_id === sellerId).map(mapDbShopToShop)

  const toggleShopActive = async (shopId: string, isActive: boolean) => {
    const { error } = await supabase.from("shops").update({ is_active: isActive }).eq("id", shopId)
    if (error) throw error
    await refresh()
  }

  return (
    <ShopsContext.Provider
      value={{
        shops,
        allShops,
        isLoading,
        fetchError,
        hasCatalogSnapshot,
        activeShopsCount,
        refresh,
        getShopById,
        getApprovedShops,
        getSellerShops,
        toggleShopActive,
      }}
    >
      {children}
    </ShopsContext.Provider>
  )
}

export function useShops() {
  const context = useContext(ShopsContext)
  if (context === undefined) {
    throw new Error("useShops must be used within a ShopsProvider")
  }
  return context
}
