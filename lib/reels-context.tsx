"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

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
  addReel: (reel: Omit<VideoReel, "id" | "likes" | "comments" | "views" | "createdAt">) => void
  removeReel: (id: string) => void
}

const ReelsContext = createContext<ReelsContextType | undefined>(undefined)

const defaultReels: VideoReel[] = [
  {
    id: "1",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=533&fit=crop",
    title: "Summer Collection Preview",
    shopName: "Fashion House",
    shopId: "shop-1",
    likes: 1234,
    comments: 89,
    views: 12500,
    createdAt: "2024-03-10",
  },
  {
    id: "2",
    thumbnail: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=533&fit=crop",
    title: "Handmade Jewelry Tutorial",
    shopName: "Artisan Gems",
    shopId: "shop-2",
    likes: 856,
    comments: 45,
    views: 8900,
    createdAt: "2024-03-08",
  },
  {
    id: "3",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=533&fit=crop",
    title: "Behind the Scenes",
    shopName: "Urban Style",
    shopId: "shop-3",
    likes: 2103,
    comments: 156,
    views: 15600,
    createdAt: "2024-03-05",
  },
  {
    id: "4",
    thumbnail: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=533&fit=crop",
    title: "New Arrivals Unboxing",
    shopName: "Tech Gadgets",
    shopId: "shop-4",
    likes: 945,
    comments: 67,
    views: 6700,
    createdAt: "2024-03-03",
  },
  {
    id: "5",
    thumbnail: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=300&h=533&fit=crop",
    title: "Styling Tips",
    shopName: "Chic Boutique",
    shopId: "shop-5",
    likes: 1567,
    comments: 98,
    views: 9800,
    createdAt: "2024-03-01",
  },
]

export function ReelsProvider({ children }: { children: React.ReactNode }) {
  const [reels, setReels] = useState<VideoReel[]>(defaultReels)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load reels from localStorage on mount
  useEffect(() => {
    const savedReels = localStorage.getItem("platform_reels")
    if (savedReels) {
      try {
        const parsed = JSON.parse(savedReels)
        setReels([...parsed, ...defaultReels])
      } catch (error) {
        console.error("Failed to load reels from localStorage", error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save custom reels to localStorage
  useEffect(() => {
    if (isLoaded) {
      const customReels = reels.filter(
        (r) => !defaultReels.find((dr) => dr.id === r.id)
      )
      localStorage.setItem("platform_reels", JSON.stringify(customReels))
    }
  }, [reels, isLoaded])

  const addReel = (reel: Omit<VideoReel, "id" | "likes" | "comments" | "views" | "createdAt">) => {
    const newReel: VideoReel = {
      ...reel,
      id: `reel_${Date.now()}`,
      likes: 0,
      comments: 0,
      views: 0,
      createdAt: new Date().toISOString().split("T")[0],
    }
    setReels((prev) => [newReel, ...prev])
  }

  const removeReel = (id: string) => {
    setReels((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <ReelsContext.Provider value={{ reels, addReel, removeReel }}>
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
