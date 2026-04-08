"use client"

import React, { createContext, useContext, useRef, useState } from "react"
import { supabase } from "@/lib/supabase-client"

export interface VideoReel {
  id: string
  thumbnail: string
  title: string
  shopName: string
  shopId: string
  likes: number
  comments: number
  views: number
  videoUrl?: string
  productId?: string
  createdAt: string
}

interface ReelsContextType {
  reels: VideoReel[]
  addReel: (reel: Omit<VideoReel, "id" | "likes" | "comments" | "views" | "createdAt">) => Promise<void>
  removeReel: (id: string) => Promise<void>
  incrementViews: (id: string) => Promise<void>
  incrementLikes: (id: string) => Promise<void>
  /** When shopId is passed, only that shop's reels are loaded */
  refreshReels: (shopId?: string) => Promise<void>
}

const ReelsContext = createContext<ReelsContextType | undefined>(undefined)

export function ReelsProvider({ children }: { children: React.ReactNode }) {
  const [reels, setReels] = useState<VideoReel[]>([])
  /** Avoid duplicate view-count bumps from hover replay on the same reel in one session */
  const viewedIds = useRef(new Set<string>())
  const lastShopFilter = useRef<string | undefined>(undefined)

  const refreshReels = async (shopId?: string) => {
    lastShopFilter.current = shopId
    if (shopId) {
      viewedIds.current.clear()
    }

    let attemptJoin = supabase
      .from("reels")
      .select("id, shop_id, video_url, likes_count, views_count, created_at, shops(name)")
      .order("created_at", { ascending: false })
      .limit(40)

    if (shopId) {
      attemptJoin = attemptJoin.eq("shop_id", shopId)
    }

    const attemptJoinResult = await attemptJoin

    let rows: any[] | null = attemptJoinResult.data
    let loadError = attemptJoinResult.error

    if (loadError) {
      let fallback = supabase
        .from("reels")
        .select("id, shop_id, video_url, likes_count, views_count, created_at")
        .order("created_at", { ascending: false })
        .limit(40)

      if (shopId) {
        fallback = fallback.eq("shop_id", shopId)
      }

      const fallbackResult = await fallback
      rows = fallbackResult.data
      loadError = fallbackResult.error
    }

    if (loadError) {
      console.error("Failed to load reels", loadError)
      return
    }

    const shopIds = Array.from(new Set((rows ?? []).map((r) => r.shop_id).filter(Boolean)))
    let shopNames: Record<string, string> = {}
    if (shopIds.length > 0) {
      const { data: shopsData } = await supabase.from("shops").select("id, name").in("id", shopIds)
      shopNames = (shopsData ?? []).reduce(
        (acc, s) => {
          acc[s.id] = s.name
          return acc
        },
        {} as Record<string, string>,
      )
    }

    setReels(
      (rows ?? []).map((r) => {
        const joinedName = r.shops?.name as string | undefined
        const shopName = joinedName || shopNames[r.shop_id] || "Shop"
        return {
          id: r.id,
          thumbnail: r.video_url,
          title: "Shop Reel",
          shopName,
          shopId: r.shop_id,
          likes: r.likes_count ?? 0,
          comments: 0,
          views: r.views_count ?? 0,
          videoUrl: r.video_url,
          createdAt: r.created_at,
        }
      }),
    )
  }

  const addReel = async (reel: Omit<VideoReel, "id" | "likes" | "comments" | "views" | "createdAt">) => {
    const { error } = await supabase.from("reels").insert({
      shop_id: reel.shopId,
      video_url: reel.videoUrl || reel.thumbnail,
      likes_count: 0,
      views_count: 0,
    })
    if (error) throw error
    await refreshReels(lastShopFilter.current)
  }

  const removeReel = async (id: string) => {
    const { error } = await supabase.from("reels").delete().eq("id", id)
    if (error) throw error
    await refreshReels(lastShopFilter.current)
  }

  const incrementViews = async (id: string) => {
    if (viewedIds.current.has(id)) return
    viewedIds.current.add(id)

    const { data: currentRow, error: fetchError } = await supabase
      .from("reels")
      .select("views_count")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !currentRow) {
      console.error("Failed to read reel views", fetchError)
      return
    }

    const nextViews = (currentRow.views_count ?? 0) + 1
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, views: nextViews } : r)))

    const { error: updateError } = await supabase.from("reels").update({ views_count: nextViews }).eq("id", id)
    if (updateError) {
      console.error("Failed to increment views", updateError)
    }
  }

  const incrementLikes = async (id: string) => {
    const { data: currentRow, error: fetchError } = await supabase
      .from("reels")
      .select("likes_count")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !currentRow) {
      console.error("Failed to read reel likes", fetchError)
      return
    }

    const nextLikes = (currentRow.likes_count ?? 0) + 1
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, likes: nextLikes } : r)))

    const { error: updateError } = await supabase.from("reels").update({ likes_count: nextLikes }).eq("id", id)
    if (updateError) {
      console.error("Failed to increment likes", updateError)
    }
  }

  return (
    <ReelsContext.Provider value={{ reels, addReel, removeReel, incrementViews, incrementLikes, refreshReels }}>
      {children}
    </ReelsContext.Provider>
  )
}

export function useReels() {
  const context = useContext(ReelsContext)
  if (context === undefined) {
    throw new Error("useReels must be used within a ReelsProvider")
  }
  return context
}
