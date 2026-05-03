"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useShops } from "@/lib/shops-context"
import { useMessaging } from "@/lib/messaging-context"
import { supabase } from "@/lib/supabase-client"
import { ChatModal } from "@/components/chat-modal"

type MsgRow = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

type ThreadRow = {
  buyerId: string
  buyerName: string
  lastContent: string
  lastAt: string
  unread: number
}

export default function SellerMessagesPage() {
  const { user } = useAuth()
  const { getSellerShops } = useShops()
  const { openThread, closeThread, refreshSellerUnreadCount } = useMessaging()
  const shop = user ? getSellerShops(user.id)[0] : undefined

  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)

  const load = useCallback(async () => {
    if (!shop?.id || !user?.id) {
      setThreads([])
      setLoading(false)
      return
    }
    setLoading(true)
    const sellerId = user.id
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, is_read, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setThreads([])
      setLoading(false)
      return
    }

    const list = (data ?? []) as MsgRow[]
    const partnerIds = new Set<string>()
    for (const r of list) {
      const p = r.sender_id === sellerId ? r.receiver_id : r.sender_id
      if (p !== sellerId) partnerIds.add(p)
    }

    const ids = [...partnerIds]
    const nameById: Record<string, string> = {}
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids)
      for (const p of profs ?? []) {
        const row = p as { id: string; full_name: string | null }
        nameById[row.id] = row.full_name?.trim() || "Buyer"
      }
    }

    const lastBy = new Map<string, MsgRow>()
    const unreadBy = new Map<string, number>()
    for (const r of list) {
      const partner = r.sender_id === sellerId ? r.receiver_id : r.sender_id
      if (partner === sellerId) continue
      if (!lastBy.has(partner)) lastBy.set(partner, r)
      if (r.receiver_id === sellerId && r.sender_id === partner && !r.is_read) {
        unreadBy.set(partner, (unreadBy.get(partner) ?? 0) + 1)
      }
    }

    const tt: ThreadRow[] = [...partnerIds].map((buyerId) => ({
      buyerId,
      buyerName: nameById[buyerId] ?? "Buyer",
      lastContent: lastBy.get(buyerId)?.content ?? "",
      lastAt: lastBy.get(buyerId)?.created_at ?? "",
      unread: unreadBy.get(buyerId) ?? 0,
    }))
    tt.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
    setThreads(tt)
    setLoading(false)
  }, [shop?.id, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!shop?.id) return
    const ch = supabase
      .channel(`seller-messages-list:${shop.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `shop_id=eq.${shop.id}` },
        () => {
          void load()
          void refreshSellerUnreadCount()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [shop?.id, load, refreshSellerUnreadCount])

  const openBuyer = (t: ThreadRow) => {
    if (!shop || !user) return
    void openThread({
      shopId: shop.id,
      sellerId: user.id,
      buyerId: t.buyerId,
      shopName: shop.name,
      sellerName: shop.name,
      buyerName: t.buyerName,
    }).then(() => setChatOpen(true))
  }

  if (!shop) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground text-sm">No shop found. You need an approved shop to receive messages.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <MessageSquare className="w-7 h-7" />
        Messages
      </h1>
      <p className="text-sm text-muted-foreground mb-6">Conversations with buyers for {shop.name}.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : threads.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No messages yet. Buyers can message you from your shop page.
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.buyerId}>
              <button
                type="button"
                onClick={() => openBuyer(t)}
                className="w-full text-left border border-border rounded-xl p-4 hover:bg-secondary/60 transition-colors flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.buyerName}</p>
                  <p className="text-sm text-muted-foreground truncate">{t.lastContent || "—"}</p>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  {t.unread > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                      {t.unread > 99 ? "99+" : t.unread}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t.lastAt ? new Date(t.lastAt).toLocaleString() : ""}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ChatModal
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false)
          closeThread()
          void load()
        }}
      />
    </div>
  )
}
