"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  /** When set, stock and order confirmation use this variant row */
  variantId?: string
  sku?: string
  color?: string
  size?: string
  shopName: string
  shopId: string
  image?: string
}

const CART_VERSION = "v1"
const guestStorageKey = () => `koulthing_cart_${CART_VERSION}_guest`
const userStorageKey = (userId: string) => `koulthing_cart_${CART_VERSION}_user_${userId}`
const LEGACY_KEY = "cart_items"

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

function migrateLineIds(parsed: CartItem[]): CartItem[] {
  return parsed.map((item) => {
    if (item.id) return item
    if (item.variantId) {
      return { ...item, id: `${item.productId}-v-${item.variantId}` }
    }
    const color = item.color ?? "default"
    const size = item.size ?? "na"
    return {
      ...item,
      id: `${item.productId}-${color}-${size}`,
    }
  })
}

function loadCartFromLocalStorage(storageKey: string): CartItem[] {
  if (typeof window === "undefined") return []

  const tryParse = (raw: string | null): CartItem[] => {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as CartItem[]
      if (!Array.isArray(parsed)) return []
      return migrateLineIds(parsed)
    } catch {
      return []
    }
  }

  let items = tryParse(localStorage.getItem(storageKey))
  if (items.length === 0 && storageKey === guestStorageKey()) {
    const legacy = tryParse(localStorage.getItem(LEGACY_KEY))
    if (legacy.length > 0) {
      items = legacy
      try {
        localStorage.setItem(storageKey, JSON.stringify(items))
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        /* ignore */
      }
    }
  }
  return items
}

function saveCartToLocalStorage(storageKey: string, items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey, JSON.stringify(items))
  } catch (e) {
    console.error("Failed to persist cart", e)
  }
}

/** Same line id = same product + variant; quantities add. */
function mergeCartByLineId(into: CartItem[], from: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const line of into) {
    map.set(line.id, { ...line })
  }
  for (const line of from) {
    const existing = map.get(line.id)
    if (existing) {
      map.set(line.id, { ...existing, quantity: existing.quantity + line.quantity })
    } else {
      map.set(line.id, { ...line })
    }
  }
  return Array.from(map.values())
}

function isBuyerCartUser(user: { isAdmin: boolean; profileRole: string } | null | undefined): boolean {
  return Boolean(user && !user.isAdmin && user.profileRole === "buyer")
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [items, setItems] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)

  const itemsRef = useRef<CartItem[]>([])
  const storageKeyRef = useRef<string | null>(null)
  const skipNextPersistRef = useRef(false)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Switch storage namespace when auth user changes; persist previous cart under its key.
  useEffect(() => {
    const nextKey = userId ? userStorageKey(userId) : guestStorageKey()

    if (storageKeyRef.current === null) {
      storageKeyRef.current = nextKey
      setItems(loadCartFromLocalStorage(nextKey))
      setIsReady(true)
      return
    }

    if (storageKeyRef.current !== nextKey) {
      saveCartToLocalStorage(storageKeyRef.current, itemsRef.current)
      const prevKey = storageKeyRef.current
      const wasGuestKey = prevKey === guestStorageKey()
      skipNextPersistRef.current = true
      storageKeyRef.current = nextKey

      if (wasGuestKey && userId && isBuyerCartUser(user)) {
        const guestLines = loadCartFromLocalStorage(guestStorageKey())
        const userLines = loadCartFromLocalStorage(userStorageKey(userId))
        const merged = mergeCartByLineId(userLines, guestLines)
        setItems(merged)
        saveCartToLocalStorage(guestStorageKey(), [])
      } else {
        setItems(loadCartFromLocalStorage(nextKey))
      }
    }
  }, [userId, user])

  // Persist current cart when items change (active namespace only).
  useEffect(() => {
    if (!isReady || storageKeyRef.current === null) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    saveCartToLocalStorage(storageKeyRef.current, items)
  }, [items, isReady])

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
