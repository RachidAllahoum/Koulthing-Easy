"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  color?: string
  size?: string
  shopName: string
  shopId: string
  image?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load cart from localStorage on mount
  useEffect(() => {
    const migrateIfNeeded = (parsed: CartItem[]) => {
      return parsed.map((item) => {
        if (item.id) return item
        const color = item.color ?? "default"
        const size = item.size ?? "na"
        return {
          ...item,
          id: `${item.productId}-${color}-${size}`,
        }
      })
    }

    const savedCart = localStorage.getItem("cart_items")
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[]
        setItems(migrateIfNeeded(parsed))
      } catch (error) {
        console.error("Failed to load cart from localStorage", error)
      }
    }
    setIsLoading(false)
  }, [])

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("cart_items", JSON.stringify(items))
    }
  }, [items, isLoading])

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)

      if (existingItem) {
        return prevItems.map((i) =>
          i === existingItem ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i,
        )
      }

      return [...prevItems, { ...item, quantity: item.quantity || 1 }]
    })
  }

  const removeItem = (lineId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== lineId))
  }

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(lineId)
      return
    }

    setItems((prevItems) => prevItems.map((item) => (item.id === lineId ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
