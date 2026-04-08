"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleGrid } from "@/components/article-grid"
import { VideoReels } from "@/components/video-reels"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useMessaging } from "@/lib/messaging-context"
import { ChatModal } from "@/components/chat-modal"
import { supabase } from "@/lib/supabase-client"
import type { Article } from "@/lib/filter-utils"
import { mapProductToArticle, type ProductRow } from "@/lib/products-map"
import {
  Star,
  MapPin,
  Users,
  Bell,
  BellOff,
  Share2,
  MessageCircle,
  Store,
  ExternalLink,
  Package,
} from "lucide-react"

const COVERS = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=400&fit=crop",
]

function coverForId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COVERS[h % COVERS.length]
}

export default function ShopPage() {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const { createConversation, currentConversation } = useMessaging()
  const shopId = routeParams.id ?? ""

  const [loading, setLoading] = useState(true)
  const [shopRow, setShopRow] = useState<{
    id: string
    name: string
    description: string | null
    logo_url: string | null
    created_at: string
    seller_id: string
  } | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [reelCount, setReelCount] = useState(0)

  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState("products")
  const [chatOpen, setChatOpen] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("id, name, description, logo_url, created_at, seller_id, is_active")
        .eq("id", shopId)
        .maybeSingle()

      if (shopError || !shop) {
        console.error(shopError)
        setShopRow(null)
        setArticles([])
        setLoading(false)
        return
      }

      if (shop.is_active === false) {
        setShopRow(null)
        setArticles([])
        setLoading(false)
        return
      }

      setShopRow(shop)

      const { data: prodRows, error: prodError } = await supabase
        .from("products")
        .select("id, shop_id, name, description, price, sizes_array, colors_array, stock, images_array, created_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })

      if (prodError) {
        console.error(prodError)
        setArticles([])
      } else {
        setArticles(
          (prodRows as ProductRow[] | null)?.map((r) => mapProductToArticle({ ...r, shops: { name: shop.name } })) ?? [],
        )
      }

      const { count } = await supabase.from("reels").select("id", { count: "exact", head: true }).eq("shop_id", shopId)
      setReelCount(count ?? 0)

      setLoading(false)
    }

    load()
  }, [shopId])

  const shop = shopRow
    ? {
        id: shopRow.id,
        name: shopRow.name,
        description:
          shopRow.description ||
          "Discover products from this shop. More details will appear here as the seller fills out their profile.",
        category: "Shop",
        coverImage: coverForId(shopRow.id),
        logo: shopRow.logo_url || "",
        rating: 4.5,
        reviewCount: 0,
        followers: 0,
        following: false,
        location: "Algeria",
        joinedDate: new Date(shopRow.created_at).toLocaleString(undefined, { month: "long", year: "numeric" }),
        totalProducts: articles.length,
        responseRate: "—",
        responseTime: "—",
        socials: {
          instagram: "",
          tiktok: "",
        },
        sellerId: shopRow.seller_id,
      }
    : null

  const tabs = [
    { id: "products", label: "Products", count: articles.length },
    { id: "videos", label: "Videos", count: reelCount },
    { id: "reviews", label: "Reviews", count: 0 },
  ]

  const handleMessageSeller = () => {
    if (!shop) return
    if (!isAuthenticated || !user) {
      setShowLoginPrompt(true)
      return
    }

    if (user.role === "seller") {
      alert("You cannot message another seller")
      return
    }

    const conversation = createConversation(
      user.id,
      user.name,
      "seller_" + shop.sellerId,
      shop.name,
      undefined,
      undefined,
      shop.id,
      shop.name,
    )
    setChatOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading shop...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Shop not found</h1>
          <p className="text-muted-foreground mb-6">This shop may be inactive or does not exist.</p>
          <Button asChild className="rounded-full">
            <Link href="/shops">Back to shops</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="relative">
          <div className="h-48 md:h-64 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
            <img src={shop.coverImage} alt={`${shop.name} cover`} className="w-full h-full object-cover" />
          </div>

          <div className="container mx-auto px-4 md:px-6">
            <div className="relative -mt-16 md:-mt-20 bg-card border border-border rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 -mt-16 md:-mt-20 mx-auto md:mx-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-secondary border-4 border-card shadow-md flex items-center justify-center overflow-hidden">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl md:text-5xl font-bold text-primary">{shop.name.charAt(0)}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{shop.name}</h1>
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">{shop.category}</span>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{shop.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button size="lg" variant={isFollowing ? "outline" : "default"} className="rounded-full gap-2" onClick={() => setIsFollowing(!isFollowing)}>
                        {isFollowing ? (
                          <>
                            <BellOff className="w-4 h-4" />
                            Following
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button size="lg" variant="outline" className="rounded-full" onClick={handleMessageSeller} title="Message this seller">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button size="lg" variant="outline" className="rounded-full">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-6 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-foreground">{shop.rating}</span>
                      <span className="text-sm text-muted-foreground">({shop.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-5 h-5" />
                      <span className="font-semibold text-foreground">{shop.followers.toLocaleString()}</span>
                      <span className="text-sm">followers</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="w-5 h-5" />
                      <span className="font-semibold text-foreground">{shop.totalProducts}</span>
                      <span className="text-sm">products</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-3">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{shop.description}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-3">Shop Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Joined</span>
                    <span className="text-foreground">{shop.joinedDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Rate</span>
                    <span className="text-foreground">{shop.responseRate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="text-foreground">{shop.responseTime}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-3">Follow Us</h3>
                <div className="space-y-2">
                  {shop.socials.instagram && (
                    <a
                      href={`https://instagram.com/${shop.socials.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">Instagram</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {shop.socials.tiktok && (
                    <a
                      href={`https://tiktok.com/@${shop.socials.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">TikTok</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {!shop.socials.instagram && !shop.socials.tiktok && (
                    <p className="text-sm text-muted-foreground">Social links not provided yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs ${activeTab === tab.id ? "opacity-80" : "opacity-60"}`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {activeTab === "products" && <ArticleGrid title="All Products" showBadges={false} articles={articles} />}

              {activeTab === "videos" && <VideoReels title="Shop Reels" shopId={shopId} />}

              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Customer Reviews</h2>
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <Star className="w-12 h-12 text-amber-500 fill-amber-500 mx-auto mb-3" />
                    <p className="text-4xl font-bold text-foreground mb-1">{shop.rating}</p>
                    <p className="text-muted-foreground">Reviews are not connected yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
