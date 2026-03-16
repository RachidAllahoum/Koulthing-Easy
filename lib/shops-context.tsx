"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

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
  status: "pending" | "approved" | "rejected"
  createdAt: string
  approvedAt?: string
  approvedBy?: string
}

interface ShopsContextType {
  shops: Shop[]
  createShop: (
    name: string,
    description: string,
    category: string,
    sellerId: string,
    sellerName: string,
    sellerEmail: string,
    location: string
  ) => Shop
  approveShop: (shopId: string, adminId: string) => void
  rejectShop: (shopId: string) => void
  getShopById: (shopId: string) => Shop | undefined
  getApprovedShops: () => Shop[]
  getSellerShops: (sellerId: string) => Shop[]
  getPendingShops: () => Shop[]
}

const ShopsContext = createContext<ShopsContextType | undefined>(undefined)

// Default shops
const DEFAULT_SHOPS: Shop[] = [
  {
    id: "shop-1",
    name: "Fashion House",
    description: "Premium fashion and accessories for the modern lifestyle.",
    category: "Fashion",
    sellerId: "seller_1",
    sellerName: "Sarah Fashion",
    sellerEmail: "sarah@fashionhouse.com",
    location: "Algiers",
    rating: 4.8,
    reviewCount: 324,
    followers: 12500,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
    status: "approved",
    createdAt: "2024-01-15T10:00:00Z",
    approvedAt: "2024-01-15T11:00:00Z",
    approvedBy: "admin@koulthing.com",
  },
  {
    id: "shop-2",
    name: "Tech Gadgets",
    description: "Latest electronics and gadgets.",
    category: "Electronics",
    sellerId: "seller_2",
    sellerName: "Ahmed Tech",
    sellerEmail: "ahmed@techgadgets.com",
    location: "Oran",
    rating: 4.6,
    reviewCount: 189,
    followers: 8900,
    image: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop",
    status: "approved",
    createdAt: "2024-02-01T10:00:00Z",
    approvedAt: "2024-02-01T12:00:00Z",
    approvedBy: "admin@koulthing.com",
  },
  {
    id: "shop-3",
    name: "Artisan Home",
    description: "Handcrafted home decor and furniture.",
    category: "Handmade",
    sellerId: "seller_3",
    sellerName: "Fatima Artisan",
    sellerEmail: "fatima@artisanhome.com",
    location: "Constantine",
    rating: 4.9,
    reviewCount: 156,
    followers: 5600,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=400&fit=crop",
    status: "pending",
    createdAt: "2024-03-10T10:00:00Z",
  },
]

export function ShopsProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS)

  // Load shops from localStorage on mount
  useEffect(() => {
    const savedShops = localStorage.getItem("shops_data")
    if (savedShops) {
      try {
        setShops(JSON.parse(savedShops))
      } catch (error) {
        console.error("Failed to load shops:", error)
      }
    }
  }, [])

  // Save shops to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("shops_data", JSON.stringify(shops))
  }, [shops])

  const createShop = (
    name: string,
    description: string,
    category: string,
    sellerId: string,
    sellerName: string,
    sellerEmail: string,
    location: string
  ) => {
    const newShop: Shop = {
      id: `shop_${Date.now()}`,
      name,
      description,
      category,
      sellerId,
      sellerName,
      sellerEmail,
      location,
      rating: 0,
      reviewCount: 0,
      followers: 0,
      image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
      coverImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    setShops((prev) => [...prev, newShop])
    return newShop
  }

  const approveShop = (shopId: string, adminId: string) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === shopId
          ? {
              ...shop,
              status: "approved",
              approvedAt: new Date().toISOString(),
              approvedBy: adminId,
            }
          : shop
      )
    )
  }

  const rejectShop = (shopId: string) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === shopId ? { ...shop, status: "rejected" } : shop
      )
    )
  }

  const getShopById = (shopId: string) => {
    return shops.find((shop) => shop.id === shopId)
  }

  const getApprovedShops = () => {
    return shops.filter((shop) => shop.status === "approved")
  }

  const getSellerShops = (sellerId: string) => {
    return shops.filter((shop) => shop.sellerId === sellerId)
  }

  const getPendingShops = () => {
    return shops.filter((shop) => shop.status === "pending")
  }

  return (
    <ShopsContext.Provider
      value={{
        shops,
        createShop,
        approveShop,
        rejectShop,
        getShopById,
        getApprovedShops,
        getSellerShops,
        getPendingShops,
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
