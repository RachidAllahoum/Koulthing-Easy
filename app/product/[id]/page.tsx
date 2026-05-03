"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGallery } from "@/components/product-gallery"
import { ProductReviews } from "@/components/product-reviews"
import { ArticleGrid } from "@/components/article-grid"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { useMessaging } from "@/lib/messaging-context"
import { ChatModal } from "@/components/chat-modal"
import { supabase } from "@/lib/supabase-client"
import type { Article } from "@/lib/filter-utils"
import {
  mapColorNameToSwatch,
  mapProductToArticle,
  normalizeStringArray,
  variantAvailable,
  variantStockTotals,
  type ProductRow,
  type ProductVariantRow,
} from "@/lib/products-map"
import { useShopFollow } from "@/lib/use-shop-follow"
import { ShopFollowHeartButton } from "@/components/shop-follow-controls"
import { FEATURE_MESSAGING } from "@/lib/feature-flags"
import {
  Star,
  Heart,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  Store,
  ChevronRight,
  ShoppingCart,
  MessageCircle,
  X,
} from "lucide-react"

type NormalizedVariant = {
  id: string
  size: string
  color: string
  sku: string
  available: number
  total: number
  variantPrice: number | null
}

function parseBasePriceRow(row: ProductRow): number {
  const raw = row.base_price ?? row.price
  return typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0
}

function normalizeProductVariantRow(v: ProductVariantRow): NormalizedVariant {
  const { total } = variantStockTotals(v.stocks)
  const available = variantAvailable(v)
  const rawP = v.price
  const vp =
    rawP != null && String(rawP).trim() !== ""
      ? typeof rawP === "string"
        ? parseFloat(rawP)
        : Number(rawP)
      : null
  return {
    id: String(v.id),
    size: String(v.size ?? "").trim(),
    color: String(v.color ?? "").trim(),
    sku: String(v.sku ?? "").trim(),
    available,
    total,
    variantPrice: vp != null && Number.isFinite(vp) ? vp : null,
  }
}

async function applyRpcStockToVariants(variants: ProductVariantRow[]): Promise<ProductVariantRow[]> {
  if (variants.length === 0) return variants
  const updated = await Promise.all(
    variants.map(async (v) => {
      const vid = String(v.id ?? "").trim()
      if (!vid) return v
      const { data, error } = await supabase.rpc("get_available_stock", { p_variant_id: vid })
      if (error) {
        console.warn("[product] get_available_stock failed", { variantId: vid, message: error.message })
        return v
      }
      const available = Math.max(0, Math.floor(Number(data) || 0))
      console.log("[product] variant stock from RPC", { variantId: vid, available })
      return { ...v, stocks: { quantity_total: available } }
    }),
  )
  return updated
}

export default function ProductPage() {
  const router = useRouter()
  const pathname = usePathname()
  const routeParams = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const { isSaved, toggleWishlist } = useWishlist()
  const { addItem, items } = useCart()
  const { openThread, closeThread } = useMessaging()

  const productId = decodeURIComponent(routeParams.id ?? "").trim()

  const [loading, setLoading] = useState(true)
  const [productRow, setProductRow] = useState<ProductRow | null>(null)
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])

  const [selectedColor, setSelectedColor] = useState<{ name: string; value: string } | null>(null)
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const attempt = await supabase
        .from("products")
        .select(
          "id, shop_id, name, description, price, base_price, sizes_array, colors_array, stock, images_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) )",
        )
        .eq("id", productId)
        .maybeSingle()

      const row: ProductRow | null = (attempt.data as ProductRow | null) ?? null
      const err = attempt.error

      if (err || !row) {
        console.error(err)
        setProductRow(null)
        setSellerId(null)
        setRelatedArticles([])
        setLoading(false)
        return
      }

      const shopLookup = await supabase
        .from("shops")
        .select("id, name, seller_id, is_active")
        .eq("id", row.shop_id)
        .maybeSingle()

      const shopName = shopLookup.data?.name ?? "Shop"
      const shopSeller = shopLookup.data?.seller_id ?? null
      const shopActive = shopLookup.data?.is_active ?? true

      if (shopActive === false) {
        setProductRow(null)
        setSellerId(null)
        setRelatedArticles([])
        setLoading(false)
        return
      }

      const normalized: ProductRow = {
        ...row,
        shops: { name: shopName },
      }
      const rowVariants = (normalized.product_variants ?? []) as ProductVariantRow[]
      if (rowVariants.length > 0) {
        normalized.product_variants = await applyRpcStockToVariants(rowVariants)
      }

      setProductRow(normalized)
      setSellerId(shopSeller ?? null)

      setSelectedColor(null)
      setSelectedSize("")

      const { data: related } = await supabase
        .from("products")
        .select(
          "id, shop_id, name, description, price, base_price, sizes_array, colors_array, stock, images_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) )",
        )
        .eq("shop_id", normalized.shop_id)
        .neq("id", normalized.id)
        .limit(8)

      const relatedRows = await Promise.all(
        (((related as ProductRow[] | null) ?? []).map(async (r) => {
          const withShop: ProductRow = {
            ...r,
            shops: { name: shopName || "Shop", seller_id: shopSeller ?? undefined },
          }
          const v = (withShop.product_variants ?? []) as ProductVariantRow[]
          if (v.length > 0) withShop.product_variants = await applyRpcStockToVariants(v)
          return withShop
        })),
      )
      setRelatedArticles(relatedRows.map((r) => mapProductToArticle(r)))

      setLoading(false)
    }

    load()
  }, [productId])

  const product = useMemo(() => {
    if (!productRow) return null
    const shopName = mapProductToArticle(productRow).shopName
    const basePrice = parseBasePriceRow(productRow)

    const images = productRow.images_array ?? []
    const variantListAll = (productRow.product_variants ?? []).map((v) => normalizeProductVariantRow(v as ProductVariantRow))
    const usesVariants = variantListAll.length > 0
    const variantList = variantListAll.filter((v) => v.available > 0)

    const stockRaw = productRow.stock
    const rowStock =
      typeof stockRaw === "number" && Number.isFinite(stockRaw)
        ? Math.max(0, Math.floor(stockRaw))
        : Math.max(0, Math.floor(Number(stockRaw) || 0))

    let sizes: string[]
    let colors: { name: string; value: string }[]
    let totalStock: number

    if (usesVariants) {
      sizes = [...new Set(variantList.map((v) => v.size).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      const colorNames = [...new Set(variantList.map((v) => v.color).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      colors = colorNames.map(mapColorNameToSwatch)
      totalStock = variantList.reduce((s, v) => s + v.available, 0)
    } else {
      sizes = normalizeStringArray(productRow.sizes_array)
      colors = normalizeStringArray(productRow.colors_array).map(mapColorNameToSwatch)
      totalStock = rowStock
    }

    return {
      id: productRow.id,
      title: productRow.name,
      description: productRow.description || "",
      price: basePrice,
      basePrice,
      originalPrice: undefined as number | undefined,
      shopId: productRow.shop_id,
      shopName,
      shopRating: 4.5,
      rating: 4.5,
      reviewCount: 0,
      soldCount: 0,
      stock: totalStock,
      colors,
      sizes,
      images,
      features: [] as string[],
      variants: variantList,
      usesVariants,
    }
  }, [productRow])

  const selectedVariant = useMemo(() => {
    if (!product?.usesVariants || product.variants.length === 0) return null
    if (product.sizes.length === 0 && product.colors.length === 0) {
      return product.variants[0] ?? null
    }
    const sz = selectedSize.trim()
    const col = selectedColor?.name.trim() ?? ""
    return (
      product.variants.find(
        (v) =>
          v.available > 0 &&
          (product.sizes.length === 0 || v.size === sz) &&
          (product.colors.length === 0 || v.color === col),
      ) ?? null
    )
  }, [product, selectedSize, selectedColor])

  const displayUnitPrice = useMemo(() => {
    if (!product) return 0
    if (!product.usesVariants) return product.basePrice
    if (product.sizes.length === 0 && product.colors.length === 0) {
      const v = product.variants[0]
      return v?.variantPrice != null && Number.isFinite(v.variantPrice) ? v.variantPrice : product.basePrice
    }
    if (!selectedVariant) return product.basePrice
    return selectedVariant.variantPrice != null && Number.isFinite(selectedVariant.variantPrice)
      ? selectedVariant.variantPrice
      : product.basePrice
  }, [product, selectedVariant])

  /** Max quantity for current selection (or full product stock when options not chosen yet). */
  const qtyCap = useMemo(() => {
    if (!product || product.stock <= 0) return 0
    if (!product.usesVariants) return product.stock
    if (product.sizes.length === 0 && product.colors.length === 0) return product.variants[0]?.available ?? 0
    if (!selectedVariant) return 0
    return selectedVariant.available
  }, [product, selectedVariant])

  const shopFollowVm = useShopFollow(product?.shopId ?? "", sellerId)

  const discount = product?.originalPrice ? Math.round((1 - displayUnitPrice / product.originalPrice) * 100) : 0

  const canAddToCart = !user || !user.isAdmin
  const outOfStock = product ? product.stock <= 0 : false

  const variantRequired =
    !!product &&
    product.usesVariants &&
    (product.sizes.length > 0 || product.colors.length > 0) &&
    !selectedVariant

  const addToCartBlocked = !canAddToCart || outOfStock || variantRequired

  const isSizeSelectable = (size: string) => {
    if (!product?.usesVariants) return true
    if (!selectedColor) return product.variants.some((v) => v.size === size && v.available > 0)
    return product.variants.some((v) => v.size === size && v.color === selectedColor.name && v.available > 0)
  }

  const isColorSelectable = (colorName: string) => {
    if (!product?.usesVariants) return true
    if (!selectedSize) return product.variants.some((v) => v.color === colorName && v.available > 0)
    return product.variants.some((v) => v.color === colorName && v.size === selectedSize && v.available > 0)
  }

  useEffect(() => {
    if (!product || product.stock <= 0) return
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, qtyCap)))
  }, [product?.id, product?.stock, qtyCap])

  const handleAddToCart = async (): Promise<boolean> => {
    if (!product) return false
    if (!canAddToCart) {
      alert("Admin accounts cannot use shopping cart")
      return false
    }

    if (product.stock <= 0) {
      return false
    }

    if (product.usesVariants) {
      if ((product.sizes.length > 0 || product.colors.length > 0) && !selectedVariant) {
        alert("Please select all options for this product")
        return false
      }
      const avail = qtyCap
      if (avail <= 0) {
        return false
      }
      if (quantity > avail) {
        alert(`Only ${avail} items available`)
        return false
      }
    } else {
      if (quantity > product.stock) {
        alert(`Only ${product.stock} items available`)
        return false
      }
    }

    if (product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size")
      return false
    }

    if (product.colors.length > 0 && !selectedColor) {
      alert("Please select a color")
      return false
    }

    const colorName = selectedColor?.name
    const variantForLine = product.usesVariants ? selectedVariant ?? product.variants[0] : null
    const lineId = variantForLine ? `${product.id}-v-${variantForLine.id}` : `${product.id}-${colorName || "default"}-${selectedSize || "na"}`
    const existingQty = items.find((x) => x.id === lineId)?.quantity ?? 0
    const available = product.usesVariants ? qtyCap : product.stock
    if (available >= 0 && existingQty + quantity > available) {
      alert(`Only ${available} items available`)
      return false
    }

    addItem({
      productId: product.id,
      id: lineId,
      name: product.title,
      price: displayUnitPrice,
      quantity,
      variantId: variantForLine?.id,
      sku: variantForLine?.sku,
      color: colorName,
      size: selectedSize || undefined,
      shopName: product.shopName,
      shopId: product.shopId,
      image: product.images[0],
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
    return true
  }

  const handleBuyNow = () => {
    if (user && user.isAdmin) {
      alert("Admin accounts cannot use shopping cart")
      return
    }

    void handleAddToCart().then((ok) => {
      if (!ok) return

      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent("/checkout")}`)
        return
      }
      router.push("/checkout")
    })
  }

  const handleMessageSeller = () => {
    if (!product) return
    if (!isAuthenticated || !user) {
      setShowLoginPrompt(true)
      return
    }

    if (user.profileRole === "seller" || user.isSeller) {
      alert("You cannot message yourself")
      return
    }

    if (!sellerId) {
      alert("Seller is unavailable for messaging right now.")
      return
    }

    void openThread({
      shopId: product.shopId,
      sellerId: sellerId,
      buyerId: user.id,
      shopName: product.shopName,
      sellerName: product.shopName,
      buyerName: user.name,
      productId: product.id,
      productName: product.title,
    }).then(() => setChatOpen(true))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading product...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Product not found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or is unavailable.</p>
          <Button asChild className="rounded-full">
            <Link href="/articles">Browse products</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/articles" className="hover:text-foreground transition-colors">
            Articles
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>

        <div
          className={`grid gap-8 lg:gap-12 mb-12 ${
            product.images.filter(Boolean).length > 0 ? "lg:grid-cols-2" : "lg:grid-cols-1"
          }`}
        >
          <ProductGallery images={product.images} productName={product.title} />

          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/shop/${product.shopId}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span className="truncate">{product.shopName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{product.shopRating}</span>
                </div>
              </Link>
              <ShopFollowHeartButton vm={shopFollowVm} className="shrink-0" />
            </div>

            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight flex-1 min-w-0">
                {product.title}
              </h1>
              {outOfStock ? (
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  Out of stock
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">{product.rating}</span>
                <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>
              <span className="text-sm text-muted-foreground">{product.soldCount} sold</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">{displayUnitPrice.toLocaleString()} DZD</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{product.originalPrice.toLocaleString()} DZD</span>
                  <span className="px-2 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">-{discount}%</span>
                </>
              )}
            </div>

            {product.colors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-sm font-medium text-foreground">Color</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-muted-foreground truncate">
                      {selectedColor?.name ?? "Select a color"}
                    </span>
                    {selectedColor ? (
                      <button
                        type="button"
                        onClick={() => setSelectedColor(null)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 shrink-0"
                        aria-label="Clear color"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {product.colors.map((color) => {
                    const enabled = isColorSelectable(color.name)
                    const active = selectedColor?.name === color.name
                    return (
                      <button
                        key={color.name}
                        type="button"
                        disabled={!enabled}
                        onClick={() => {
                          if (!enabled) return
                          setSelectedColor(active ? null : color)
                        }}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          active ? "border-primary scale-110" : "border-transparent hover:scale-105"
                        } ${!enabled ? "opacity-40 cursor-not-allowed hover:scale-100" : ""}`}
                        style={{ backgroundColor: color.value }}
                        title={enabled ? color.name : `${color.name} (out of stock)`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-sm font-medium text-foreground">Size</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {selectedSize ? (
                      <button
                        type="button"
                        onClick={() => setSelectedSize("")}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                        aria-label="Clear size"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    ) : null}
                    <button type="button" className="text-sm text-accent hover:text-accent/80 transition-colors">
                      Size Guide
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => {
                    const enabled = isSizeSelectable(size)
                    const active = selectedSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!enabled}
                        onClick={() => {
                          if (!enabled) return
                          setSelectedSize(active ? "" : size)
                        }}
                        className={`min-w-[48px] h-10 px-4 rounded-lg border text-sm font-medium transition-all ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-foreground"
                        } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {!outOfStock ? (
              <div>
                <span className="text-sm font-medium text-foreground mb-3 block">Quantity</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(qtyCap, q + 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.usesVariants && (product.sizes.length > 0 || product.colors.length > 0) && selectedVariant
                      ? `${selectedVariant.available} available for this option`
                      : `${qtyCap} available`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">This item is currently out of stock.</p>
            )}

            {variantRequired ? (
              <p className="text-sm text-muted-foreground">Choose size and color (if shown) before adding to cart.</p>
            ) : null}

            <div className="flex gap-3 flex-wrap">
              {canAddToCart ? (
                <>
                  <div className="flex-1 min-w-[120px] relative">
                    <Button
                      size="lg"
                      className="w-full rounded-full flex items-center justify-center gap-2"
                      disabled={addToCartBlocked}
                      onClick={() => {
                        void handleAddToCart().then(() => {})
                      }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>
                        {outOfStock
                          ? "Out of stock"
                          : variantRequired
                            ? "Select options"
                            : addedToCart
                              ? "Added to Cart!"
                              : "Add to Cart"}
                      </span>
                    </Button>
                    {addedToCart && !addToCartBlocked && (
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                    )}
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 min-w-[100px] rounded-full"
                    disabled={addToCartBlocked}
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </Button>
                </>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 w-full">Admin accounts cannot use shopping cart</p>
              )}
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="rounded-full"
                title={product && isSaved(product.id) ? "Remove from wishlist" : "Save to wishlist"}
                onClick={() => void toggleWishlist(product?.id ?? "", pathname || `/product/${productId}`)}
                disabled={!product}
              >
                <Heart
                  className={`w-5 h-5 ${product && isSaved(product.id) ? "fill-accent text-accent" : ""}`}
                />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {FEATURE_MESSAGING ? (
              <Button size="lg" variant="outline" className="w-full rounded-full gap-2" onClick={handleMessageSeller}>
                <MessageCircle className="w-5 h-5" />
                Message Seller
              </Button>
            ) : null}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        <section className="py-8 border-t border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Product Details</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>
          {product.features.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProductReviews productId={product.id} averageRating={product.rating} totalReviews={product.reviewCount} />

        <ArticleGrid title="You May Also Like" showBadges={false} articles={relatedArticles} />
      </main>

      {FEATURE_MESSAGING && showLoginPrompt ? (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to message the seller. Please log in or create an account to continue.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowLoginPrompt(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl" onClick={() => router.push("/login")}>
                Login
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {FEATURE_MESSAGING ? (
        <ChatModal
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false)
            closeThread()
          }}
        />
      ) : null}

      <Footer />
    </div>
  )
}
