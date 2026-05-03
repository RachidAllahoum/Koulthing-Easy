"use client"

import { useEffect, useMemo, useState } from "react"
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
  Share2,
  MessageCircle,
  ExternalLink,
  Package,
  Phone,
} from "lucide-react"
import { socialHref } from "@/lib/social-url"
import { useShopFollow } from "@/lib/use-shop-follow"
import { ShopFollowHeartButton, ShopFollowHeroButtons } from "@/components/shop-follow-controls"
import { FEATURE_MESSAGING, FEATURE_REELS } from "@/lib/feature-flags"

export default function ShopPage() {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const { isAuthenticated, user } = useAuth()
  const { openThread, closeThread } = useMessaging()
  const shopId = routeParams.id ?? ""

  const [loading, setLoading] = useState(true)
  const [shopRow, setShopRow] = useState<{
    id: string
    name: string
    description: string | null
    logo_url: string | null
    cover_url: string | null
    shop_category: string | null
    street_address: string | null
    city: string | null
    wilaya: string | null
    shop_phone: string | null
    instagram_url: string | null
    facebook_url: string | null
    created_at: string
    seller_id: string
  } | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [reelCount, setReelCount] = useState(0)

  const [activeTab, setActiveTab] = useState("products")
  const [chatOpen, setChatOpen] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select(
          "id, name, description, logo_url, cover_url, shop_category, street_address, city, wilaya, shop_phone, instagram_url, facebook_url, created_at, seller_id, is_active",
        )
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
        .select(
          "id, shop_id, name, description, price, base_price, sizes_array, colors_array, stock, images_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) )",
        )
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })

      if (prodError) {
        console.error(prodError)
        setArticles([])
      } else {
        setArticles(
          (prodRows as ProductRow[] | null)?.map((r) =>
            mapProductToArticle({ ...r, shops: { name: shop.name, seller_id: shop.seller_id } }),
          ) ?? [],
        )
      }

      if (FEATURE_REELS) {
        const { count } = await supabase.from("reels").select("id", { count: "exact", head: true }).eq("shop_id", shopId)
        setReelCount(count ?? 0)
      } else {
        setReelCount(0)
      }

      setLoading(false)
    }

    load()
  }, [shopId])

  const follow = useShopFollow(shopId, shopRow?.seller_id ?? null)

  const shop = shopRow
    ? (() => {
        const street = shopRow.street_address?.trim() ?? ""
        const city = shopRow.city?.trim() ?? ""
        const wilaya = shopRow.wilaya?.trim() ?? ""
        const line1 = [street, city].filter(Boolean).join(", ")
        const locationLabel = [line1, wilaya].filter(Boolean).join(" · ") || "—"
        const ig = socialHref(shopRow.instagram_url)
        const fb = socialHref(shopRow.facebook_url)
        return {
          id: shopRow.id,
          name: shopRow.name,
          description: shopRow.description?.trim() || "This shop has not added a description yet.",
          category: shopRow.shop_category?.trim() || "Shop",
          coverImage: shopRow.cover_url?.trim() || "",
          logo: shopRow.logo_url?.trim() || "",
          shopPhone: shopRow.shop_phone?.trim() || "",
          rating: 4.5,
          reviewCount: 0,
          followers: 0,
          following: false,
          location: locationLabel,
          joinedDate: new Date(shopRow.created_at).toLocaleString(undefined, { month: "long", year: "numeric" }),
          totalProducts: articles.length,
          responseRate: "—",
          responseTime: "—",
          socials: {
            instagram: ig,
            facebook: fb,
          },
          sellerId: shopRow.seller_id,
        }
      })()
    : null

  const tabs = useMemo(
    () => [
      { id: "products", label: "Products", count: articles.length },
      ...(FEATURE_REELS ? [{ id: "videos", label: "Videos", count: reelCount }] : []),
      { id: "reviews", label: "Reviews", count: 0 },
    ],
    [articles.length, reelCount],
  )

  useEffect(() => {
    if (!FEATURE_REELS && activeTab === "videos") setActiveTab("products")
  }, [activeTab])

  const handleMessageSeller = () => {
    if (!shop) return
    if (!isAuthenticated || !user) {
      setShowLoginPrompt(true)
      return
    }

    if (user.profileRole === "seller" || user.isSeller) {
      alert("You cannot message another seller")
      return
    }

    void openThread({
      shopId: shop.id,
      sellerId: shop.sellerId,
      buyerId: user.id,
      shopName: shop.name,
      sellerName: shop.name,
      buyerName: user.name,
    }).then(() => setChatOpen(true))
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
          <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
            {shop.coverImage ? (
              <img src={shop.coverImage} alt={`${shop.name} cover`} className="w-full h-full object-cover" />
            ) : null}
            <div className="absolute top-4 left-4 md:top-5 md:left-6">
              <ShopFollowHeartButton vm={follow} />
            </div>
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
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{shop.location}</span>
                      </div>
                      {shop.shopPhone ? (
                        <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground mb-2">
                          <Phone className="w-4 h-4 shrink-0" />
                          <a href={`tel:${shop.shopPhone.replace(/\s/g, "")}`} className="hover:text-foreground">
                            {shop.shopPhone}
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <ShopFollowHeroButtons vm={follow} />
                      {FEATURE_MESSAGING ? (
                        <Button
                          size="lg"
                          variant="outline"
                          className="rounded-full gap-2"
                          onClick={handleMessageSeller}
                          title="Message this seller"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Message</span>
                        </Button>
                      ) : null}
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
                      <span className="font-semibold text-foreground">{follow.followerCount.toLocaleString()}</span>
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
                  {shop.socials.instagram ? (
                    <a
                      href={shop.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">Instagram</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {shop.socials.facebook ? (
                    <a
                      href={shop.socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">Facebook</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {!shop.socials.instagram && !shop.socials.facebook && (
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

              {FEATURE_REELS && activeTab === "videos" ? (
                <VideoReels title="Shop Reels" shopId={shopId} />
              ) : null}

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
