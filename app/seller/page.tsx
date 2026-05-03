"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Landmark,
  Wallet,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddProductModal } from "@/components/add-product-modal"
import { OrderCancelDialog } from "@/components/order-cancel-dialog"
import { NoProductImage } from "@/components/no-uploaded-media"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import type { ProductFormData } from "@/components/add-product-modal"
import { saveSellerProductCatalog } from "@/lib/seller-save-product"
import {
  parseOrderLines,
  linesForShop,
  sellerSubtotal,
  customerLabelFromShipping,
} from "@/lib/seller-dashboard-data"
import {
  formatShippingAddressLines,
  orderBuyerLabel,
  sellerOrderLinesSummary,
  isValidSellerTransition,
  sellerAttributedGrandTotal,
  sellerAttributedKoulthingFee,
  formatCancellationSummary,
  normalizeOrderStatusForUi,
  orderStatusDisplayLabel,
  sellerCanCancelOrder,
  type OrderStatus,
} from "@/lib/order-display"

interface OrderRow {
  id: string
  status: string
  created_at: string
  items_json: unknown
  shipping_address: unknown
  delivery_instructions: string | null
  delivery_price: number | string | null
  koulthing_fee: number | string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

interface SellerProductRow {
  id: string
  name: string
  category: string
  price: number
  stock: number
  sold: number
  status: "active" | "low_stock" | "out_of_stock"
  image: string
  description: string
  sizes: string[]
  colors: string[]
  images: string[]
  variants: { id: string; sku: string; size: string; color: string; stock: number; variantPrice: string }[]
}

function OrderStatusBadge({ status }: { status: string }) {
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
      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
        styles[key] ?? styles.pending
      }`}
    >
      {orderStatusDisplayLabel(status)}
    </span>
  )
}

function ProductStockBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    low_stock: "bg-amber-100 text-amber-700",
    out_of_stock: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
  }

  const labels: Record<string, string> = {
    active: "Active",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    draft: "Draft",
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.draft
      }`}
    >
      {labels[status] || status}
    </span>
  )
}

function formatDzd(n: number) {
  return `${Math.round(n).toLocaleString()} DZD`
}

function mapDbProductToSellerProduct(
  p: {
    id: string
    name: string
    description: string | null
    price: number | string
    base_price?: number | string | null
    stock: number
    images_array: string[] | null
    sizes_array: string[] | null
    colors_array: string[] | null
    product_variants?: unknown[] | null
  },
  categoryLabel: string,
): SellerProductRow {
  const rawVariants = p.product_variants ?? []
  const baseNum = Number(p.base_price ?? p.price) || 0
  const variants = rawVariants.map((v) => {
    const row = v as Record<string, unknown>
    const stocks = row.stocks as { quantity_total?: unknown }[] | { quantity_total?: unknown } | null | undefined
    const st = Array.isArray(stocks) ? stocks[0] : stocks
    const total = Math.max(0, Math.floor(Number(st?.quantity_total) || 0))
    const rawPrice = row.price
    const vPrice =
      rawPrice != null && String(rawPrice).trim() !== ""
        ? typeof rawPrice === "string"
          ? parseFloat(rawPrice)
          : Number(rawPrice)
        : null
    const variantPrice =
      vPrice != null && Number.isFinite(vPrice) && Math.abs(vPrice - baseNum) > 0.005 ? String(vPrice) : ""
    return {
      id: String(row.id),
      sku: String(row.sku ?? "").trim(),
      size: String(row.size ?? "").trim(),
      color: String(row.color ?? "").trim(),
      stock: total,
      variantPrice,
    }
  })
  return {
    id: p.id,
    name: p.name,
    category: categoryLabel,
    price: baseNum,
    stock: p.stock,
    sold: 0,
    status: p.stock > 10 ? "active" : p.stock > 0 ? "low_stock" : "out_of_stock",
    image: p.images_array?.filter(Boolean)[0] || "",
    description: p.description || "",
    sizes: p.sizes_array || [],
    colors: p.colors_array || [],
    images: p.images_array || [],
    variants,
  }
}

export default function SellerDashboardPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopDisplayName, setShopDisplayName] = useState<string | null>(null)
  const [shopCategory, setShopCategory] = useState<string | null>(null)
  const [sellerProducts, setSellerProducts] = useState<SellerProductRow[]>([])
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [orderStatusBusyId, setOrderStatusBusyId] = useState<string | null>(null)
  const [sellerCancelTarget, setSellerCancelTarget] = useState<{ id: string; status: string } | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [productCount, setProductCount] = useState<number | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function resolveShop() {
      if (!user?.id) {
        if (!cancelled) {
          setShopId(null)
          setShopDisplayName(null)
          setShopCategory(null)
        }
        return
      }
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, shop_category")
        .eq("seller_id", user.id)
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setShopId(null)
        setShopDisplayName(null)
        setShopCategory(null)
        setDataError(error.message)
        return
      }
      if (!data) {
        setShopId(null)
        setShopDisplayName(null)
        setShopCategory(null)
        setDataError(null)
        return
      }
      setShopId(data.id)
      setShopDisplayName(data.name)
      setShopCategory(typeof data.shop_category === "string" ? data.shop_category : null)
      setDataError(null)
    }
    void resolveShop()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const loadDashboardData = useCallback(async () => {
    if (!shopId) {
      setOrders([])
      setProductCount(null)
      setSellerProducts([])
      return
    }
    setDataLoading(true)
    setDataError(null)
    try {
      const [ordersRes, productsRes, followersRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, status, created_at, items_json, shipping_address, delivery_instructions, delivery_price, koulthing_fee, cancelled_by, cancelled_at, cancellation_reason",
          )
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("products")
          .select(
            "id, name, description, price, base_price, stock, images_array, sizes_array, colors_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) )",
          )
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_shop_follower_count", { p_shop_id: shopId }),
      ])

      if (ordersRes.error) throw new Error(ordersRes.error.message)
      if (productsRes.error) throw new Error(productsRes.error.message)

      setOrders((ordersRes.data ?? []) as OrderRow[])

      const rows = productsRes.data ?? []
      setProductCount(rows.length)
      const cat =
        shopCategory && shopCategory.trim()
          ? shopCategory.trim()
          : (shopDisplayName ?? "Product")
      setSellerProducts(
        rows.map((r) => mapDbProductToSellerProduct(r as Parameters<typeof mapDbProductToSellerProduct>[0], cat)),
      )

      if (!followersRes.error && followersRes.data !== null && followersRes.data !== undefined) {
        setFollowerCount(Number(followersRes.data))
      } else {
        setFollowerCount(0)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load dashboard data"
      setDataError(msg)
      setOrders([])
      setProductCount(null)
      setSellerProducts([])
      setFollowerCount(0)
    } finally {
      setDataLoading(false)
    }
  }, [shopId, shopCategory, shopDisplayName])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const { totalRevenue, platformFees, sellerNet, orderCount, recentOrders, topProducts } = useMemo(() => {
    if (!shopId) {
      return {
        totalRevenue: 0,
        platformFees: 0,
        sellerNet: 0,
        orderCount: 0,
        recentOrders: [] as {
          id: string
          idShort: string
          customer: string
          product: string
          total: string
          status: string
          date: string
        }[],
        topProducts: [] as { name: string; sold: number; revenue: string }[],
      }
    }

    let totalRevenue = 0
    let platformFees = 0
    const qualifyingOrders: OrderRow[] = []
    const productQty = new Map<string, { name: string; qty: number; revenue: number }>()

    for (const order of orders) {
      const lines = linesForShop(parseOrderLines(order.items_json), shopId)
      if (lines.length === 0) continue
      qualifyingOrders.push(order)
      if (normalizeOrderStatusForUi(order.status).toLowerCase() !== "delivered") continue
      totalRevenue += sellerAttributedGrandTotal(order, shopId)
      platformFees += sellerAttributedKoulthingFee(order, shopId)
      for (const line of lines) {
        const cur = productQty.get(line.productId) ?? { name: line.name, qty: 0, revenue: 0 }
        cur.name = line.name
        cur.qty += line.quantity
        cur.revenue += line.price * line.quantity
        productQty.set(line.productId, cur)
      }
    }

    const sellerNet = Math.round(totalRevenue - platformFees)

    const top = Array.from(productQty.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4)
      .map((p) => ({ name: p.name, sold: p.qty, revenue: formatDzd(p.revenue) }))

    const recent = qualifyingOrders.slice(0, 5).map((order) => {
      const lines = linesForShop(parseOrderLines(order.items_json), shopId)
      const first = lines[0]
      const extra = lines.length > 1 ? ` +${lines.length - 1}` : ""
      return {
        id: order.id,
        idShort: String(order.id).slice(0, 8),
        customer: customerLabelFromShipping(order.shipping_address),
        product: first ? `${first.name}${extra}` : "—",
        total: formatDzd(sellerSubtotal(lines)),
        status: order.status,
        date: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
      }
    })

    return {
      totalRevenue,
      platformFees,
      sellerNet,
      orderCount: qualifyingOrders.length,
      recentOrders: recent,
      topProducts: top,
    }
  }, [orders, shopId])

  const dashboardShopOrders = useMemo(() => {
    if (!shopId) return []
    const rows: {
      id: string
      buyer: string
      productsLabel: string
      sellerTotal: number
      address: string
      instructions: string | null
      status: string
      createdAt: string
      cancelNote: string | null
    }[] = []
    for (const order of orders) {
      const lines = linesForShop(parseOrderLines(order.items_json), shopId)
      if (lines.length === 0) continue
      const { subtotal, label } = sellerOrderLinesSummary(order.items_json, shopId)
      const ship = order.shipping_address as Record<string, unknown> | undefined
      const email = typeof ship?.email === "string" ? ship.email : undefined
      rows.push({
        id: order.id,
        buyer: orderBuyerLabel(order.shipping_address, email),
        productsLabel: label,
        sellerTotal: subtotal,
        address: formatShippingAddressLines(order.shipping_address),
        instructions: order.delivery_instructions,
        status: order.status,
        createdAt: order.created_at,
        cancelNote: formatCancellationSummary(order),
      })
    }
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, shopId])

  const stats = useMemo(() => {
    const products = productCount
    return [
      {
        label: "Total Revenue (Delivered)",
        value: dataLoading && shopId ? "…" : formatDzd(totalRevenue),
        sub: "Subtotal + delivery + fees",
        icon: DollarSign,
      },
      {
        label: "Platform Fees (2.5%)",
        value: dataLoading && shopId ? "…" : formatDzd(platformFees),
        sub: "Koulthing fees on delivered orders",
        icon: Landmark,
      },
      {
        label: "Seller Net",
        value: dataLoading && shopId ? "…" : formatDzd(sellerNet),
        sub: "Total Revenue - Platform Fees",
        icon: Wallet,
      },
      {
        label: "Orders",
        value: dataLoading && shopId ? "…" : String(orderCount),
        sub: "Orders with your products",
        icon: ShoppingCart,
      },
      {
        label: "Products",
        value: products === null && shopId ? "…" : String(products ?? 0),
        sub: "In your catalog",
        icon: Package,
      },
      {
        label: "Followers",
        value: dataLoading && shopId ? "…" : String(followerCount),
        sub: "From shop profile",
        icon: Users,
      },
    ]
  }, [totalRevenue, platformFees, sellerNet, orderCount, productCount, followerCount, dataLoading, shopId])

  const handleAddProduct = (productData: ProductFormData): Promise<void> => {
    if (!shopId || !user?.id) {
      toast({ title: "No shop", description: "Create a shop before adding products.", variant: "destructive" })
      return Promise.resolve()
    }
    return (async () => {
      const result = await saveSellerProductCatalog(supabase, {
        shopId,
        profileId: user.id,
        productData,
        mode: modalMode,
        editingProductId,
      })
      if (!result.ok) {
        toast({
          title: modalMode === "edit" ? "Update failed" : "Add failed",
          description: result.message,
          variant: "destructive",
        })
        return
      }

      await loadDashboardData()
      if (modalMode === "edit") {
        toast({ title: "Product saved" })
        setEditingProductId(null)
        setModalMode("create")
      } else {
        toast({ title: "Product Added", description: `${productData.name} has been added to your store.` })
      }
    })()
  }

  const updateShopOrderStatus = async (
    orderId: string,
    currentStatus: string,
    next: OrderStatus,
    options?: { cancelReason?: string },
  ) => {
    if (!isValidSellerTransition(currentStatus, next)) {
      toast({ title: "Invalid transition", description: "That status change is not allowed.", variant: "destructive" })
      return
    }
    if (next === "cancelled") {
      const r = options?.cancelReason?.trim()
      if (!r) {
        toast({ title: "Reason required", description: "Please enter a cancellation reason.", variant: "destructive" })
        return
      }
    }
    setOrderStatusBusyId(orderId)
    try {
      const patch: Record<string, unknown> = { status: next }
      if (next === "cancelled") {
        patch.cancelled_by = "seller"
        patch.cancellation_reason = options!.cancelReason!.trim()
        patch.cancelled_at = new Date().toISOString()
      } else if (next === "confirmed") {
        patch.cancelled_by = null
        patch.cancellation_reason = null
        patch.cancelled_at = null
      }
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId)
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" })
        throw new Error(error.message)
      }
      if (next === "cancelled") {
        toast({
          title: "Order cancelled successfully",
          description: options?.cancelReason ? `Reason: ${options.cancelReason.trim()}` : undefined,
        })
      } else {
        toast({ title: "Order updated", description: `Status is now ${next}.` })
      }
      await loadDashboardData()
    } finally {
      setOrderStatusBusyId(null)
    }
  }

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id)
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" })
        return
      }
      toast({ title: "Product deleted", description: `${deleteTarget.name} has been removed.` })
      setDeleteTarget(null)
      await loadDashboardData()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {shopDisplayName
              ? `Welcome back! Managing ${shopDisplayName}.`
              : "No shop found for your account. If you were just approved, try refreshing. Otherwise contact support."}
          </p>
          {dataError ? <p className="text-sm text-destructive mt-2">{dataError}</p> : null}
        </div>
        <Button
          className="rounded-xl gap-2"
          disabled={!shopId}
          onClick={() => {
            setModalMode("create")
            setEditingProductId(null)
            setIsAddModalOpen(true)
          }}
        >
          <Package className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stat.sub}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Catalog: real rows from products for this shop */}
      <div className="mb-8 bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Your products</h2>
          <Button variant="ghost" size="sm" className="gap-1 text-accent" asChild>
            <Link href="/seller/products">
              Manage in Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <div className="p-5">
          {!shopId ? (
            <p className="text-sm text-muted-foreground">
              No shop linked to your account yet. Products will appear here once your seller shop exists.
            </p>
          ) : dataLoading ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : sellerProducts.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden />
              <p className="text-sm text-muted-foreground">No products yet. Add one with the button above.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sellerProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-background border border-border rounded-xl overflow-hidden group"
                >
                  <div className="relative aspect-square bg-secondary flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <NoProductImage />
                    )}
                    <div className="absolute top-3 right-3">
                      <ProductStockBadge status={product.status} />
                    </div>
                    <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-lg"
                        onClick={() => {
                          setModalMode("edit")
                          setEditingProductId(product.id)
                          setIsAddModalOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-lg"
                        onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                    <h3 className="font-medium text-foreground line-clamp-1 mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {product.price.toLocaleString()} DZD
                      </span>
                      <span className="text-sm text-muted-foreground">{product.stock} in stock</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders containing this shop's products */}
      <div className="mb-8 bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Orders</h2>
          <Button variant="ghost" size="sm" className="gap-1 text-accent" asChild>
            <Link href="/seller/orders">
              Update statuses
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <div className="p-0">
          {!shopId ? (
            <p className="p-5 text-sm text-muted-foreground">No shop linked.</p>
          ) : dataLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading orders…</p>
          ) : dashboardShopOrders.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No orders with your products yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">Order</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Buyer</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground min-w-[180px]">
                      Your products
                    </th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Your total</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground min-w-[200px]">
                      Delivery
                    </th>
                    <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboardShopOrders.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-5 py-4 font-mono text-xs break-all max-w-[120px]">{row.id}</td>
                      <td className="px-5 py-4 font-medium text-foreground">{row.buyer}</td>
                      <td className="px-5 py-4 text-foreground">{row.productsLabel}</td>
                      <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                        {row.sellerTotal.toLocaleString()} DZD
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <p className="line-clamp-3">{row.address}</p>
                        {row.instructions ? (
                          <p className="mt-1 text-xs text-foreground/90">
                            <span className="font-medium">Instructions: </span>
                            {row.instructions}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={row.status} />
                        {row.cancelNote ? (
                          <p className="text-xs text-destructive mt-2 max-w-[220px] leading-snug">{row.cancelNote}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {row.status === "pending" ? (
                          <div className="flex flex-col gap-2 items-end">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-lg h-8"
                              disabled={orderStatusBusyId === row.id}
                              onClick={() => void updateShopOrderStatus(row.id, row.status, "confirmed")}
                            >
                              {orderStatusBusyId === row.id ? (
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
                              disabled={orderStatusBusyId === row.id}
                              onClick={() => setSellerCancelTarget({ id: row.id, status: row.status })}
                            >
                              {orderStatusBusyId === row.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-4" />
                                  Working…
                                </span>
                              ) : (
                                "Reject order"
                              )}
                            </Button>
                          </div>
                        ) : row.status === "confirmed" ? (
                          <div className="flex flex-col gap-2 items-end">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-lg h-8"
                              disabled={orderStatusBusyId === row.id}
                              onClick={() => void updateShopOrderStatus(row.id, row.status, "delivered")}
                            >
                              {orderStatusBusyId === row.id ? (
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
                              disabled={orderStatusBusyId === row.id}
                              onClick={() => setSellerCancelTarget({ id: row.id, status: row.status })}
                            >
                              {orderStatusBusyId === row.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-4" />
                                  Working…
                                </span>
                              ) : (
                                "Cancel order"
                              )}
                            </Button>
                          </div>
                        ) : row.status === "processing" || row.status === "shipped" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg h-8"
                            disabled={orderStatusBusyId === row.id}
                            onClick={() => void updateShopOrderStatus(row.id, row.status, "delivered")}
                          >
                            {orderStatusBusyId === row.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Spinner className="size-4" />
                                Working…
                              </span>
                            ) : (
                              "Mark delivered"
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Orders</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-accent" asChild>
              <Link href="/seller/orders">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {dataLoading && shopId ? (
              <p className="p-5 text-sm text-muted-foreground">Loading orders…</p>
            ) : recentOrders.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No orders with your products yet.</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-foreground">{order.customer.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{order.customer}</p>
                      <p className="text-sm text-muted-foreground truncate">{order.product}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{order.idShort}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-medium text-foreground">{order.total}</p>
                    <div className="flex items-center justify-end gap-2 mt-1 flex-wrap">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-xs text-muted-foreground">{order.date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Top Products</h2>
            <button type="button" className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {dataLoading && shopId ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={`${product.name}-${index}`} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <p className="text-sm font-medium text-foreground shrink-0">{product.revenue}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-r from-primary to-accent rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-primary-foreground/80 text-sm mb-1">Account Balance</p>
            <p className="text-3xl font-bold text-primary-foreground">—</p>
            <p className="text-primary-foreground/80 text-sm mt-2">
              Seller payouts are not connected to live settlements yet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              disabled
            >
              Charge Account
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              disabled
            >
              Withdraw Funds
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              disabled
            >
              View History
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed from your catalog. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteProduct()
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderCancelDialog
        open={!!sellerCancelTarget}
        onOpenChange={(open) => {
          if (!open) setSellerCancelTarget(null)
        }}
        title={sellerCancelTarget?.status === "pending" ? "Reject order" : "Cancel order"}
        busy={!!sellerCancelTarget && orderStatusBusyId === sellerCancelTarget.id}
        onConfirm={async (reason) => {
          if (!sellerCancelTarget) return
          await updateShopOrderStatus(sellerCancelTarget.id, sellerCancelTarget.status, "cancelled", {
            cancelReason: reason,
          })
        }}
      />

      <AddProductModal
        key={editingProductId ?? "create"}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingProductId(null)
          setModalMode("create")
        }}
        onSubmit={handleAddProduct}
        mode={modalMode}
        uploadUserId={user?.id ?? null}
        shopId={shopId}
        editingProductId={editingProductId}
        shopCategory={shopCategory}
        initialValues={
          modalMode === "edit" && editingProductId
            ? (() => {
                const p = sellerProducts.find((x) => x.id === editingProductId)
                if (!p) return undefined
                return {
                  name: p.name,
                  description: p.description,
                  basePrice: String(p.price),
                  images: p.images,
                  variants: p.variants.map((v) => ({
                    clientKey: v.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    stock: String(v.stock),
                    variantPrice: v.variantPrice,
                  })),
                }
              })()
            : undefined
        }
      />
    </div>
  )
}
