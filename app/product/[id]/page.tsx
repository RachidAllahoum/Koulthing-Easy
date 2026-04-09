"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGallery } from "@/components/product-gallery"
import { ProductReviews } from "@/components/product-reviews"
import { ArticleGrid } from "@/components/article-grid"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useMessaging } from "@/lib/messaging-context"
import { ChatModal } from "@/components/chat-modal"
import { supabase } from "@/lib/supabase-client"
import type { Article } from "@/lib/filter-utils"
import { mapColorNameToSwatch, mapProductToArticle, type ProductRow } from "@/lib/products-map"
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
} from "lucide-react"

export default function ProductPage() {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const { addItem } = useCart()
  const { createConversation, currentConversation } = useMessaging()

  const productId = decodeURIComponent(routeParams.id ?? "").trim()

  const [loading, setLoading] = useState(true)
  const [productRow, setProductRow] = useState<ProductRow | null>(null)
  const [sellerId, setSellerId] = useState<string | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])

  const [selectedColor, setSelectedColor] = useState<{ name: string; value: string } | null>(null)
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const attempt = await supabase
        .from("products")
        .select("id, shop_id, name, description, price, sizes_array, colors_array, stock, images_array, created_at")
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

      setProductRow(normalized)
      setSellerId(shopSeller ?? null)

      const colors = (normalized.colors_array ?? []).map(mapColorNameToSwatch)
      setSelectedColor(colors[0] ?? null)

      const sizes = normalized.sizes_array ?? []
      setSelectedSize(sizes[0] ?? "")

      const { data: related } = await supabase
        .from("products")
        .select("id, shop_id, name, description, price, sizes_array, colors_array, stock, images_array, created_at")
        .eq("shop_id", normalized.shop_id)
        .neq("id", normalized.id)
        .limit(8)

      setRelatedArticles(
        (related as ProductRow[] | null)?.map((r) => mapProductToArticle({ ...r, shops: { name: shopName || "Shop" } })) ?? [],
      )

      setLoading(false)
    }

    load()
  }, [productId])

  const product = useMemo(() => {
    if (!productRow) return null
    const shopName = mapProductToArticle(productRow).shopName
    const price = typeof productRow.price === "string" ? parseFloat(productRow.price) : productRow.price

    const colors = (productRow.colors_array ?? []).map(mapColorNameToSwatch)
    const sizes = productRow.sizes_array ?? []
    const images = productRow.images_array ?? []

    return {
      id: productRow.id,
      title: productRow.name,
      description: productRow.description || "",
      price: Number.isFinite(price) ? price : 0,
      originalPrice: undefined as number | undefined,
      shopId: productRow.shop_id,
      shopName,
      shopRating: 4.5,
      rating: 4.5,
      reviewCount: 0,
      soldCount: 0,
      stock: productRow.stock,
      colors,
      sizes,
      images,
      features: [] as string[],
    }
  }, [productRow])

  const discount = product?.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

  const canUseCart = !!user && user.profileRole === "buyer" && !user.isAdmin

  const handleAddToCart = () => {
    if (!product) return
    if (!canUseCart) {
      alert("Only buyers can use shopping cart")
      return
    }

    if (product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size")
      return
    }

    if (product.colors.length > 0 && !selectedColor) {
      alert("Please select a color")
      return
    }

    const colorName = selectedColor?.name
    const lineId = `${product.id}-${colorName || "default"}-${selectedSize || "na"}`

    addItem({
      productId: product.id,
      id: lineId,
      name: product.title,
      price: product.price,
      quantity,
      color: colorName,
      size: selectedSize || undefined,
      shopName: product.shopName,
      shopId: product.shopId,
      image: product.images[0],
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    if (!canUseCart) {
      alert("Only buyers can use shopping cart")
      return
    }

    if (product && product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size")
      return
    }

    if (product && product.colors.length > 0 && !selectedColor) {
      alert("Please select a color")
      return
    }

    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    handleAddToCart()
    router.push("/checkout")
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

    const conversation = createConversation(user.id, user.name, "seller_" + sellerId, product.shopName, product.id, product.title, product.shopId, product.shopName)
    setChatOpen(true)
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

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          <ProductGallery images={product.images} productName={product.title} />

          <div className="space-y-6">
            <Link href={`/shop/${product.shopId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <span>{product.shopName}</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{product.shopRating}</span>
              </div>
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.title}</h1>

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
              <span className="text-3xl font-bold text-foreground">{product.price.toLocaleString()} DZD</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{product.originalPrice.toLocaleString()} DZD</span>
                  <span className="px-2 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">-{discount}%</span>
                </>
              )}
            </div>

            {product.colors.length > 0 && selectedColor && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Color</span>
                  <span className="text-sm text-muted-foreground">{selectedColor.name}</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor.name === color.name ? "border-primary scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Size</span>
                  <button type="button" className="text-sm text-accent hover:text-accent/80 transition-colors">
                    Size Guide
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[48px] h-10 px-4 rounded-lg border text-sm font-medium transition-all ${
                        selectedSize === size ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-foreground mb-3 block">Quantity</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(Math.max(product.stock, 1), q + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">{product.stock} available</span>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {canUseCart ? (
                <>
                  <div className="flex-1 min-w-[120px] relative">
                    <Button size="lg" className="w-full rounded-full flex items-center justify-center gap-2" onClick={handleAddToCart}>
                      <ShoppingCart className="w-5 h-5" />
                      <span>{addedToCart ? "Added to Cart!" : "Add to Cart"}</span>
                    </Button>
                    {addedToCart && <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />}
                  </div>
                  <Button size="lg" variant="outline" className="flex-1 min-w-[100px] rounded-full" onClick={handleBuyNow}>
                    Buy Now
                  </Button>
                </>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 w-full">Only buyers can use shopping cart</p>
              )}
              <Button size="lg" variant="outline" className="rounded-full" onClick={() => setIsFavorite(!isFavorite)}>
                <Heart className={`w-5 h-5 ${isFavorite ? "fill-accent text-accent" : ""}`} />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            <Button size="lg" variant="outline" className="w-full rounded-full gap-2" onClick={handleMessageSeller}>
              <MessageCircle className="w-5 h-5" />
              Message Seller
            </Button>

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

      {showLoginPrompt && (
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
      )}

      {currentConversation && <ChatModal conversation={currentConversation} isOpen={chatOpen} onClose={() => setChatOpen(false)} />}

      <Footer />
    </div>
  )
}
