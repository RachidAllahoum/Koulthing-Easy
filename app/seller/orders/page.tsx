"use client"

import { useState, useMemo, useEffect, useCallback, Fragment } from "react"
import {
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { OrderCancelDialog } from "@/components/order-cancel-dialog"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import type { OrderItemLine } from "@/lib/seller-dashboard-data"
import {
  formatShippingAddressLines,
  orderBuyerLabel,
  sellerOrderLinesSummary,
  orderIsSingleVendorForShop,
  isTerminalOrderStatus,
  isValidSellerTransition,
  orderMatchesSellerTab,
  sellerFulfillmentAdvanceTarget,
  formatCancellationSummary,
  normalizeOrderStatusForUi,
  orderStatusDisplayLabel,
  SELLER_ORDER_TABS,
  type OrderStatus,
  type SellerOrderTab,
} from "@/lib/order-display"

type SortField = "id" | "status" | "total" | "date"
type SortOrder = "asc" | "desc"

interface DbOrder {
  id: string
  status: string
  created_at: string
  items_json: unknown
  shipping_address: unknown
  delivery_instructions: string | null
  delivery_price?: unknown
  koulthing_fee?: unknown
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
}

function StatusBadge({ status }: { status: string }) {
  const key = normalizeOrderStatusForUi(status).toLowerCase()
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-cyan-100 text-cyan-800",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        styles[key] ?? "bg-secondary text-secondary-foreground"
      }`}
    >
      {orderStatusDisplayLabel(status)}
    </span>
  )
}

function buyerContactLines(shipping: unknown): { phone?: string; email?: string } {
  if (!shipping || typeof shipping !== "object") return {}
  const a = shipping as Record<string, unknown>
  const phone = typeof a.phone === "string" ? a.phone.trim() : undefined
  const email = typeof a.email === "string" ? a.email.trim() : undefined
  return { phone, email }
}

export default function SellerOrdersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [shopId, setShopId] = useState<string | null>(null)
  const [orders, setOrders] = useState<DbOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<SellerOrderTab>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [sellerCancelTarget, setSellerCancelTarget] = useState<DbOrder | null>(null)

  useEffect(() => {
    let cancelled = false
    async function resolveShop() {
      if (!user?.id) {
        if (!cancelled) setShopId(null)
        return
      }
      const { data } = await supabase
        .from("shops")
        .select("id")
        .eq("seller_id", user.id)
        .limit(1)
        .maybeSingle()
      if (!cancelled) setShopId(data?.id ?? null)
    }
    void resolveShop()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const loadOrders = useCallback(async () => {
    if (!shopId) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, created_at, items_json, shipping_address, delivery_instructions, delivery_price, koulthing_fee, cancelled_by, cancelled_at, cancellation_reason",
      )
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      toast({ title: "Could not load orders", description: error.message, variant: "destructive" })
      setOrders([])
    } else {
      setOrders((data ?? []) as DbOrder[])
    }
    setLoading(false)
  }, [shopId, toast])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    setSelectedIds([])
  }, [selectedTab])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const patchOrderLocal = (
    orderId: string,
    newStatus: OrderStatus,
    extra?: Partial<Pick<DbOrder, "cancelled_by" | "cancelled_at" | "cancellation_reason">>,
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, status: newStatus, ...extra }
      }),
    )
  }

  const setOrderStatus = async (
    orderId: string,
    currentStatus: string,
    newStatus: OrderStatus,
    options?: { cancelReason?: string },
  ) => {
    if (!isValidSellerTransition(currentStatus, newStatus)) {
      toast({ title: "Invalid status", description: "That transition is not allowed.", variant: "destructive" })
      return
    }
    if (newStatus === "cancelled") {
      const r = options?.cancelReason?.trim()
      if (!r) {
        toast({ title: "Reason required", description: "Enter a cancellation reason.", variant: "destructive" })
        return
      }
    }
    setUpdatingId(orderId)
    try {
      const patch: Record<string, unknown> = { status: newStatus }
      if (newStatus === "cancelled") {
        patch.cancelled_by = "seller"
        patch.cancellation_reason = options!.cancelReason!.trim()
        patch.cancelled_at = new Date().toISOString()
      } else if (newStatus === "confirmed") {
        patch.cancelled_by = null
        patch.cancellation_reason = null
        patch.cancelled_at = null
      }
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId)
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" })
        throw new Error(error.message)
      }
      if (newStatus === "cancelled") {
        patchOrderLocal(orderId, newStatus, {
          cancelled_by: "seller",
          cancellation_reason: String(patch.cancellation_reason),
          cancelled_at: String(patch.cancelled_at),
        })
      } else if (newStatus === "confirmed") {
        patchOrderLocal(orderId, newStatus, {
          cancelled_by: null,
          cancellation_reason: null,
          cancelled_at: null,
        })
      } else {
        patchOrderLocal(orderId, newStatus)
      }
      setSelectedIds((prev) => prev.filter((id) => id !== orderId))
      if (newStatus === "cancelled") {
        toast({
          title: "Order cancelled successfully",
          description: options?.cancelReason ? `Reason: ${options.cancelReason.trim()}` : undefined,
        })
      } else {
        toast({ title: "Order updated", description: `Status is now ${newStatus}.` })
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const runBulkStatusUpdates = async (
    items: { orderId: string; fromStatus: string; toStatus: OrderStatus }[],
    options?: { successMessage?: string; failureMessage?: string },
  ) => {
    if (items.length === 0) return
    setBulkUpdating(true)
    let ok = 0
    let failed = 0
    try {
      for (const { orderId, fromStatus, toStatus } of items) {
        if (!isValidSellerTransition(fromStatus, toStatus)) {
          failed += 1
          continue
        }
        const patch: Record<string, unknown> = { status: toStatus }
        if (toStatus === "cancelled") patch.cancelled_by = "seller"
        if (toStatus === "confirmed") {
          patch.cancelled_by = null
          patch.cancellation_reason = null
          patch.cancelled_at = null
        }
        const { error } = await supabase.from("orders").update(patch).eq("id", orderId)
        if (error) {
          failed += 1
        } else {
          ok += 1
          if (toStatus === "confirmed") {
            patchOrderLocal(orderId, toStatus, {
              cancelled_by: null,
              cancellation_reason: null,
              cancelled_at: null,
            })
          } else {
            patchOrderLocal(orderId, toStatus)
          }
        }
      }
      setSelectedIds([])
      if (ok > 0) {
        toast({
          title:
            options?.successMessage ??
            (ok === 1 ? "1 order updated" : `${ok} orders updated`),
          description:
            failed > 0
              ? `${failed} could not be updated (invalid state or permission).`
              : undefined,
        })
      } else if (failed > 0) {
        toast({
          title: options?.failureMessage ?? "Bulk update failed",
          description: options?.failureMessage ? undefined : "No orders were updated.",
          variant: "destructive",
        })
      }
    } finally {
      setBulkUpdating(false)
    }
  }

  const rowData = useMemo(() => {
    if (!shopId) return []
    return orders
      .map((order) => {
        const { lines, subtotal, label } = sellerOrderLinesSummary(order.items_json, shopId)
        if (lines.length === 0) return null
        const ship = order.shipping_address as Record<string, unknown> | undefined
        const email = typeof ship?.email === "string" ? ship.email : undefined
        return {
          order,
          buyer: orderBuyerLabel(order.shipping_address, email),
          productsLabel: label,
          sellerTotal: subtotal,
          address: formatShippingAddressLines(order.shipping_address),
          contact: buyerContactLines(order.shipping_address),
          instructions: order.delivery_instructions,
          singleVendor: orderIsSingleVendorForShop(order.items_json, shopId),
          lines,
        }
      })
      .filter(Boolean) as {
      order: DbOrder
      buyer: string
      productsLabel: string
      sellerTotal: number
      address: string
      contact: { phone?: string; email?: string }
      instructions: string | null
      singleVendor: boolean
      lines: OrderItemLine[]
    }[]
  }, [orders, shopId])

  const tabCounts = useMemo(() => {
    const counts: Record<SellerOrderTab, number> = {
      All: rowData.length,
      Pending: 0,
      Confirmed: 0,
      Delivered: 0,
      Cancelled: 0,
    }
    for (const row of rowData) {
      for (const tab of SELLER_ORDER_TABS) {
        if (tab === "All") continue
        if (orderMatchesSellerTab(row.order.status, tab)) counts[tab] += 1
      }
    }
    return counts
  }, [rowData])

  const filteredOrders = useMemo(() => {
    let result = rowData.filter((row) => {
      const matchesTab = orderMatchesSellerTab(row.order.status, selectedTab)
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        row.order.id.toLowerCase().includes(q) ||
        row.buyer.toLowerCase().includes(q) ||
        row.productsLabel.toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })

    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "id":
          comparison = a.order.id.localeCompare(b.order.id)
          break
        case "status":
          comparison = a.order.status.localeCompare(b.order.status)
          break
        case "total":
          comparison = a.sellerTotal - b.sellerTotal
          break
        case "date":
          comparison =
            new Date(a.order.created_at).getTime() - new Date(b.order.created_at).getTime()
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [rowData, selectedTab, searchQuery, sortField, sortOrder])

  const visibleIds = useMemo(() => filteredOrders.map((r) => r.order.id), [filteredOrders])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id))

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of visibleIds) next.add(id)
        return [...next]
      })
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectedRows = useMemo(
    () => filteredOrders.filter((r) => selectedIds.includes(r.order.id)),
    [filteredOrders, selectedIds],
  )

  const bulkConfirmPending = () => {
    const items = selectedRows
      .filter((r) => r.order.status === "pending")
      .map((r) => ({ orderId: r.order.id, fromStatus: r.order.status, toStatus: "confirmed" as const }))
    void runBulkStatusUpdates(items, {
      successMessage: `${items.length} orders confirmed successfully`,
      failureMessage: "Batch confirm failed",
    })
  }

  const bulkAdvanceFulfillment = () => {
    const items = selectedRows
      .map((r) => {
        const next = sellerFulfillmentAdvanceTarget(r.order.status)
        if (!next) return null
        return { orderId: r.order.id, fromStatus: r.order.status, toStatus: next }
      })
      .filter((x): x is NonNullable<typeof x> => x != null && isValidSellerTransition(x.fromStatus, x.toStatus))
    void runBulkStatusUpdates(items, {
      successMessage: `${items.length} orders delivered successfully`,
      failureMessage: "Batch deliver failed",
    })
  }

  const pendingBulkCount = selectedRows.filter((r) => r.order.status === "pending").length
  const advanceBulkCount = selectedRows.filter((r) => {
    const next = sellerFulfillmentAdvanceTarget(r.order.status)
    return next != null && isValidSellerTransition(r.order.status, next)
  }).length

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left text-sm font-medium text-muted-foreground px-5 py-4 cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field &&
          (sortOrder === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          ))}
      </div>
    </th>
  )

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Sign in as a seller to manage orders.</p>
      </div>
    )
  }

  if (!shopId && !loading) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Orders</h1>
        <p className="text-muted-foreground">No shop found for your account.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Orders that include products from your shop</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search orders…"
            className="pl-10 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {SELLER_ORDER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              <span className="ml-1.5 opacity-80 tabular-nums">({tabCounts[tab]})</span>
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-border bg-secondary/40">
          <span className="text-sm font-medium text-foreground mr-2">
            {selectedIds.length} selected
          </span>
          {selectedTab === "Pending" && pendingBulkCount > 0 ? (
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              disabled={bulkUpdating}
              onClick={() => bulkConfirmPending()}
            >
              {bulkUpdating ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Confirming…
                </span>
              ) : (
                `Confirm all selected (${pendingBulkCount})`
              )}
            </Button>
          ) : null}
          {selectedTab === "Confirmed" && advanceBulkCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-lg"
              disabled={bulkUpdating}
              onClick={() => bulkAdvanceFulfillment()}
            >
              {bulkUpdating ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Delivering…
                </span>
              ) : (
                `Advance all selected (${advanceBulkCount})`
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-lg text-muted-foreground"
            disabled={bulkUpdating}
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden />
            <p className="text-muted-foreground text-sm">No orders match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="w-12 px-3 py-4">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleSelectAllVisible()}
                      disabled={bulkUpdating || visibleIds.length === 0}
                      aria-label="Select all visible orders"
                    />
                  </th>
                  <th className="w-10 px-0 py-4" aria-hidden />
                  <SortHeader field="id" label="Order" />
                  <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">Buyer</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4 min-w-[200px]">
                    Products
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">Your total</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4 min-w-[220px]">
                    Delivery
                  </th>
                  <SortHeader field="status" label="Status" />
                  <SortHeader field="date" label="Date" />
                  <th className="text-right text-sm font-medium text-muted-foreground px-5 py-4">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((row) => {
                  const o = row.order
                  const st = o.status.toLowerCase()
                  const terminal = isTerminalOrderStatus(o.status)
                  const isOpen = expandedIds.includes(o.id)
                  const busy = updatingId === o.id || bulkUpdating
                  const cancelSummary = formatCancellationSummary(o)

                  return (
                    <Fragment key={o.id}>
                      <tr className="hover:bg-secondary/30 transition-colors align-top">
                          <td className="px-3 py-4">
                            <Checkbox
                              checked={selectedIds.includes(o.id)}
                              onCheckedChange={() => toggleSelected(o.id)}
                              disabled={busy}
                              aria-label={`Select order ${o.id.slice(0, 8)}`}
                            />
                          </td>
                          <td className="py-4 pr-0">
                              <button
                                type="button"
                                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                                aria-expanded={isOpen}
                                aria-label={isOpen ? "Hide order details" : "Show order details"}
                                onClick={() => toggleExpanded(o.id)}
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                />
                              </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-foreground break-all">{o.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground">{row.buyer}</p>
                            {row.contact.phone ? (
                              <p className="text-xs text-muted-foreground mt-0.5">{row.contact.phone}</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{row.productsLabel}</td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-foreground tabular-nums">
                              {row.sellerTotal.toLocaleString()} DZD
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            <p>{row.address}</p>
                            {row.instructions ? (
                              <p className="mt-2 text-xs">
                                <span className="font-medium text-foreground">Note: </span>
                                {row.instructions}
                              </p>
                            ) : null}
                            {!row.singleVendor ? (
                              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                This cart includes other shops — status is shared; confirm changes with
                                co-sellers if needed.
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={o.status} />
                            {cancelSummary ? (
                              <p className="text-xs text-destructive mt-2 max-w-[200px] leading-snug">{cancelSummary}</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(o.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {st === "pending" ? (
                              <div className="flex flex-col gap-2 items-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-lg h-8"
                                  disabled={busy}
                                  onClick={() => void setOrderStatus(o.id, o.status, "confirmed")}
                                >
                                  {busy ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="size-4" />
                                      Working…
                                    </span>
                                  ) : (
                                    "Approve order"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-lg h-8"
                                  disabled={busy}
                                  onClick={() => setSellerCancelTarget(o)}
                                >
                                  {busy ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="size-4" />
                                      Working…
                                    </span>
                                  ) : (
                                    "Reject order"
                                  )}
                                </Button>
                              </div>
                            ) : st === "confirmed" ? (
                              <div className="flex flex-col gap-2 items-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-lg h-8"
                                  disabled={busy}
                                  onClick={() => void setOrderStatus(o.id, o.status, "delivered")}
                                >
                                  {busy ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="size-4" />
                                      Working…
                                    </span>
                                  ) : (
                                    "Mark delivered"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-lg h-8"
                                  disabled={busy}
                                  onClick={() => setSellerCancelTarget(o)}
                                >
                                  {busy ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="size-4" />
                                      Working…
                                    </span>
                                  ) : (
                                    "Cancel order"
                                  )}
                                </Button>
                              </div>
                            ) : st === "processing" || st === "shipped" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-lg h-8"
                                disabled={busy}
                                onClick={() => void setOrderStatus(o.id, o.status, "delivered")}
                              >
                                {busy ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Spinner className="size-4" />
                                    Working…
                                  </span>
                                ) : (
                                  "Mark delivered"
                                )}
                              </Button>
                            ) : terminal ? (
                              <span className="text-xs text-muted-foreground">No changes</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr key={`${o.id}-detail`} className="bg-secondary/20">
                            <td colSpan={10} className="px-5 py-4">
                              <div className="max-w-3xl space-y-4 text-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Order detail (suggested layout)
                                </p>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                  <div>
                                    <dt className="text-muted-foreground">Order ID</dt>
                                    <dd className="font-mono text-xs break-all">{o.id}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">Placed</dt>
                                    <dd>{new Date(o.created_at).toLocaleString()}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">Buyer</dt>
                                    <dd className="font-medium">{row.buyer}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">Contact</dt>
                                    <dd className="text-muted-foreground">
                                      {[row.contact.phone, row.contact.email].filter(Boolean).join(" · ") || "—"}
                                    </dd>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <dt className="text-muted-foreground">Shipping</dt>
                                    <dd className="text-muted-foreground">{row.address}</dd>
                                  </div>
                                  {row.instructions ? (
                                    <div className="sm:col-span-2">
                                      <dt className="text-muted-foreground">Delivery note</dt>
                                      <dd>{row.instructions}</dd>
                                    </div>
                                  ) : null}
                                </dl>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Your line items</p>
                                  <ul className="border border-border rounded-lg divide-y divide-border bg-background">
                                    {row.lines.map((line) => (
                                      <li
                                        key={`${line.productId}-${line.name}`}
                                        className="px-3 py-2 flex flex-wrap justify-between gap-2"
                                      >
                                        <span>
                                          {line.name}{" "}
                                          <span className="text-muted-foreground">×{line.quantity}</span>
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                          {line.price.toLocaleString()} DZD each ·{" "}
                                          <span className="text-foreground font-medium">
                                            {(line.price * line.quantity).toLocaleString()} DZD
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-1.5 tabular-nums">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Your subtotal</span>
                                    <span className="font-medium">{row.sellerTotal.toLocaleString()} DZD</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} with your
            products
          </p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void loadOrders()}>
            Refresh
          </Button>
        </div>
      </div>

      <OrderCancelDialog
        open={!!sellerCancelTarget}
        onOpenChange={(open) => {
          if (!open) setSellerCancelTarget(null)
        }}
        title={sellerCancelTarget?.status === "pending" ? "Reject order" : "Cancel order"}
        busy={!!sellerCancelTarget && updatingId === sellerCancelTarget.id}
        onConfirm={async (reason) => {
          if (!sellerCancelTarget) return
          await setOrderStatus(sellerCancelTarget.id, sellerCancelTarget.status, "cancelled", {
            cancelReason: reason,
          })
        }}
      />
    </div>
  )
}
