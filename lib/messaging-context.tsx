"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/lib/auth-context"

export interface ThreadMeta {
  shopId: string
  sellerId: string
  buyerId: string
  shopName: string
  sellerName: string
  buyerName: string
  productId?: string
  productName?: string
}

export interface ThreadMessage {
  id: string
  senderId: string
  receiverId: string
  shopId: string
  text: string
  isRead: boolean
  createdAt: string
}

function inThreadRow(
  row: { shop_id: string; sender_id: string; receiver_id: string },
  t: ThreadMeta,
): boolean {
  if (row.shop_id !== t.shopId) return false
  const ids = new Set([row.sender_id, row.receiver_id])
  return ids.has(t.buyerId) && ids.has(t.sellerId)
}

interface MessagingContextType {
  activeThread: ThreadMeta | null
  threadMessages: ThreadMessage[]
  threadLoading: boolean
  sendError: string | null
  sellerUnreadCount: number
  openThread: (meta: Omit<ThreadMeta, "sellerName" | "buyerName"> & { sellerName?: string; buyerName?: string }) => Promise<void>
  closeThread: () => void
  sendThreadMessage: (text: string) => Promise<void>
  refreshSellerUnreadCount: () => Promise<void>
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

function mapRowToThreadMessage(row: {
  id: string
  sender_id: string
  receiver_id: string
  shop_id: string
  content: string
  is_read: boolean
  created_at: string
}): ThreadMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    shopId: row.shop_id,
    text: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [activeThread, setActiveThread] = useState<ThreadMeta | null>(null)
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sellerUnreadCount, setSellerUnreadCount] = useState(0)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const activeThreadRef = useRef<ThreadMeta | null>(null)
  activeThreadRef.current = activeThread

  const clearChannel = useCallback(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  const fetchThreadMessages = useCallback(async (meta: ThreadMeta) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, shop_id, content, is_read, created_at")
      .eq("shop_id", meta.shopId)
      .or(`sender_id.eq.${meta.buyerId},receiver_id.eq.${meta.buyerId}`)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[messaging] fetch messages", error)
      setThreadMessages([])
      return
    }

    const rows = (data ?? []).filter((r) => inThreadRow(r, meta))
    setThreadMessages(rows.map(mapRowToThreadMessage))
  }, [])

  const refreshSellerUnreadCount = useCallback(async () => {
    if (!user?.id || !user.isSeller) {
      setSellerUnreadCount(0)
      return
    }
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false)
    if (!error) setSellerUnreadCount(count ?? 0)
  }, [user?.id, user?.isSeller])

  useEffect(() => {
    void refreshSellerUnreadCount()
  }, [refreshSellerUnreadCount])

  useEffect(() => {
    if (!user?.id || !user.isSeller) return
    const channel = supabase
      .channel(`seller-inbox:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          void refreshSellerUnreadCount()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, user?.isSeller, refreshSellerUnreadCount])

  const markThreadRead = useCallback(
    async (meta: ThreadMeta) => {
      if (!user?.id) return
      const partnerId = user.id === meta.buyerId ? meta.sellerId : meta.buyerId
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("shop_id", meta.shopId)
        .eq("receiver_id", user.id)
        .eq("sender_id", partnerId)
        .eq("is_read", false)
      await fetchThreadMessages(meta)
      await refreshSellerUnreadCount()
    },
    [user?.id, fetchThreadMessages, refreshSellerUnreadCount],
  )

  const subscribeShop = useCallback(
    (meta: ThreadMeta) => {
      clearChannel()
      const channel = supabase
        .channel(`messages:shop:${meta.shopId}:${meta.buyerId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `shop_id=eq.${meta.shopId}` },
          (payload) => {
            const row = payload.new as {
              shop_id: string
              sender_id: string
              receiver_id: string
              id: string
              content: string
              is_read: boolean
              created_at: string
            }
            const t = activeThreadRef.current
            if (!t || !inThreadRow(row, t)) return
            setThreadMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev
              return [...prev, mapRowToThreadMessage(row)]
            })
            if (user?.id && row.receiver_id === user.id) {
              if (t && inThreadRow(row, t)) {
                void markThreadRead(t)
              } else {
                void refreshSellerUnreadCount()
              }
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `shop_id=eq.${meta.shopId}` },
          (payload) => {
            const row = payload.new as {
              shop_id: string
              sender_id: string
              receiver_id: string
              id: string
              content: string
              is_read: boolean
              created_at: string
            }
            const t = activeThreadRef.current
            if (!t || !inThreadRow(row, t)) return
            setThreadMessages((prev) =>
              prev.map((m) => (m.id === row.id ? mapRowToThreadMessage(row) : m)),
            )
          },
        )
        .subscribe()
      channelRef.current = channel
    },
    [clearChannel, user?.id, markThreadRead, refreshSellerUnreadCount],
  )

  const openThread = useCallback(
    async (meta: Omit<ThreadMeta, "sellerName" | "buyerName"> & { sellerName?: string; buyerName?: string }) => {
      setSendError(null)
      setThreadLoading(true)
      try {
        const [{ data: sellerP }, { data: buyerP }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", meta.sellerId).maybeSingle(),
          supabase.from("profiles").select("full_name").eq("id", meta.buyerId).maybeSingle(),
        ])
        const full: ThreadMeta = {
          ...meta,
          sellerName: sellerP?.full_name?.trim() || meta.sellerName?.trim() || meta.shopName || "Seller",
          buyerName: buyerP?.full_name?.trim() || meta.buyerName?.trim() || "Buyer",
        }
        setActiveThread(full)
        await fetchThreadMessages(full)
        subscribeShop(full)
        await markThreadRead(full)
      } finally {
        setThreadLoading(false)
      }
    },
    [fetchThreadMessages, subscribeShop, markThreadRead],
  )

  const closeThread = useCallback(() => {
    clearChannel()
    setActiveThread(null)
    setThreadMessages([])
    setSendError(null)
  }, [clearChannel])

  const sendThreadMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !user?.id || !activeThread) return
      setSendError(null)
      const receiverId =
        user.id === activeThread.buyerId ? activeThread.sellerId : activeThread.buyerId
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: receiverId,
        shop_id: activeThread.shopId,
        content: trimmed,
      })
      if (error) {
        console.error("[messaging] send", error)
        setSendError(error.message || "Could not send message")
        return
      }
      await fetchThreadMessages(activeThread)
      await refreshSellerUnreadCount()
    },
    [user?.id, activeThread, fetchThreadMessages, refreshSellerUnreadCount],
  )

  useEffect(() => () => clearChannel(), [clearChannel])

  return (
    <MessagingContext.Provider
      value={{
        activeThread,
        threadMessages,
        threadLoading,
        sendError,
        sellerUnreadCount,
        openThread,
        closeThread,
        sendThreadMessage,
        refreshSellerUnreadCount,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider")
  }
  return context
}
