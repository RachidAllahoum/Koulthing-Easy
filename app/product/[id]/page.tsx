"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

// Placeholder product data
const product = {
  id: "1",
  title: "Elegant Summer Dress with Floral Pattern",
  description:
    "This beautiful summer dress features a stunning floral pattern that's perfect for any occasion. Made from high-quality breathable fabric, it offers both comfort and style. The A-line silhouette flatters all body types, while the adjustable waist tie allows for a customized fit.",
  price: 4500,
  originalPrice: 6000,
  shopId: "shop-1",
  shopName: "Fashion House",
  shopRating: 4.8,
  rating: 4.8,
  reviewCount: 124,
  soldCount: 350,
  stock: 15,
  colors: [
    { name: "Rose", value: "#E8B4B8" },
    { name: "Navy", value: "#1E3A5F" },
    { name: "Cream", value: "#F5F0E6" },
    { name: "Sage", value: "#9CAF88" },
  ],
  sizes: ["XS", "S", "M", "L", "XL"],
  images: [],
  features: [
    "100% Cotton fabric",
    "Machine washable",
    "Adjustable waist tie",
    "Side pockets",
    "Midi length",
  ],
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { addItem } = useCart()
  const { createConversation, currentConversation } = useMessaging()
  
  const [selectedColor, setSelectedColor] = useState(product.colors[0])
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0

  // Check if user can purchase (only buyers can purchase)
  const canPurchase = !user || user.role === "buyer"

  const handleAddToCart = () => {
    if (!canPurchase) {
      alert("Admin and seller accounts cannot make purchases. Please use a buyer account.")
      return
    }

    if (!selectedSize) {
      alert("Please select a size")
      return
    }

    addItem({
      productId: product.id,
      id: `${product.id}-${selectedColor.name}-${selectedSize}`,
      name: product.title,
      price: product.price,
      quantity,
      color: selectedColor.name,
      size: selectedSize,
      shopName: product.shopName,
      shopId: product.shopId,
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    if (!canPurchase) {
      alert("Admin and seller accounts cannot make purchases. Please use a buyer account.")
      return
    }

    if (!selectedSize) {
      alert("Please select a size")
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
    if (!isAuthenticated || !user) {
      setShowLoginPrompt(true)
      return
    }

    // Prevent seller from messaging themselves
    if (user.role === "seller") {
      alert("You cannot message yourself")
      return
    }

    const conversation = createConversation(
      user.id,
      user.name,
      "seller_1", // Placeholder seller ID
      product.shopName,
      product.id,
      product.title,
      product.shopId,
      product.shopName
    )
    setChatOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/articles" className="hover:text-foreground transition-colors">
            Articles
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Fashion</span>
        </nav>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Gallery */}
          <ProductGallery images={product.images} productName={product.title} />

          {/* Product Info */}
          <div className="space-y-6">
            {/* Shop Info */}
            <Link
              href={`/shop/${product.shopId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <span>{product.shopName}</span>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{product.shopRating}</span>
              </div>
            </Link>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {product.title}
            </h1>

            {/* Rating & Sales */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">{product.rating}</span>
                <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>
              <span className="text-sm text-muted-foreground">{product.soldCount} sold</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">
                {product.price.toLocaleString()} DZD
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {product.originalPrice.toLocaleString()} DZD
                  </span>
                  <span className="px-2 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Color</span>
                <span className="text-sm text-muted-foreground">{selectedColor.name}</span>
              </div>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor.name === color.name
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Size</span>
                <button className="text-sm text-accent hover:text-accent/80 transition-colors">
                  Size Guide
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-10 px-4 rounded-lg border text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <span className="text-sm font-medium text-foreground mb-3 block">Quantity</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">{product.stock} available</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[120px] relative">
                <Button 
                  size="lg" 
                  className="w-full rounded-full flex items-center justify-center gap-2"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{addedToCart ? "Added to Cart!" : "Add to Cart"}</span>
                </Button>
                {addedToCart && (
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                )}
              </div>
              <Button 
                size="lg" 
                variant="outline" 
                className="flex-1 min-w-[100px] rounded-full"
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? "fill-accent text-accent" : ""}`} />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Message Seller Button */}
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={handleMessageSeller}
            >
              <MessageCircle className="w-5 h-5" />
              Message Seller
            </Button>

            {/* Trust Badges */}
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

        {/* Product Details */}
        <section className="py-8 border-t border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Product Details</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews */}
        <ProductReviews
          productId={product.id}
          averageRating={product.rating}
          totalReviews={product.reviewCount}
        />

        {/* Suggested Products */}
        <ArticleGrid title="You May Also Like" showBadges={false} />
      </main>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-foreground mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to message the seller. Please log in or create an account to continue.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setShowLoginPrompt(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 rounded-xl"
                onClick={() => router.push("/login")}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {currentConversation && (
        <ChatModal
          conversation={currentConversation}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      <Footer />
    </div>
  )
}
