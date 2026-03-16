"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleGrid } from "@/components/article-grid"
import { VideoReels } from "@/components/video-reels"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useMessaging } from "@/lib/messaging-context"
import { ChatModal } from "@/components/chat-modal"
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
  ChevronRight,
  Package,
  Calendar,
} from "lucide-react"

// Placeholder shop data
const shop = {
  id: "shop-1",
  name: "Fashion House",
  description:
    "Premium fashion and accessories for the modern lifestyle. We curate the best quality clothing for every occasion, focusing on sustainability and timeless design. Join thousands of satisfied customers who trust us for their fashion needs.",
  category: "Fashion",
  coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
  logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
  rating: 4.8,
  reviewCount: 324,
  followers: 12500,
  following: false,
  location: "Algiers, Algeria",
  joinedDate: "March 2022",
  totalProducts: 156,
  responseRate: "98%",
  responseTime: "< 1 hour",
  socials: {
    instagram: "fashionhouse_dz",
    tiktok: "fashionhouse_dz",
  },
}

const tabs = [
  { id: "products", label: "Products", count: 156 },
  { id: "videos", label: "Videos", count: 24 },
  { id: "reviews", label: "Reviews", count: 324 },
]

export default function ShopPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { createConversation, currentConversation } = useMessaging()
  const [isFollowing, setIsFollowing] = useState(shop.following)
  const [activeTab, setActiveTab] = useState("products")
  const [chatOpen, setChatOpen] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleMessageSeller = () => {
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
      "seller_" + shop.id,
      shop.name,
      undefined,
      undefined,
      shop.id,
      shop.name
    )
    setChatOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Cover & Profile Section */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 md:h-64 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
            <img
              src={shop.coverImage}
              alt={`${shop.name} cover`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Profile Card */}
          <div className="container mx-auto px-4 md:px-6">
            <div className="relative -mt-16 md:-mt-20 bg-card border border-border rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Logo */}
                <div className="flex-shrink-0 -mt-16 md:-mt-20 mx-auto md:mx-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-secondary border-4 border-card shadow-md flex items-center justify-center">
                    <span className="text-4xl md:text-5xl font-bold text-primary">
                      {shop.name.charAt(0)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                          {shop.name}
                        </h1>
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">
                          {shop.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{shop.location}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        size="lg"
                        variant={isFollowing ? "outline" : "default"}
                        className="rounded-full gap-2"
                        onClick={() => setIsFollowing(!isFollowing)}
                      >
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
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="rounded-full"
                        onClick={handleMessageSeller}
                        title="Message this seller"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button size="lg" variant="outline" className="rounded-full">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-center md:justify-start gap-6 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-foreground">{shop.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({shop.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-5 h-5" />
                      <span className="font-semibold text-foreground">
                        {shop.followers.toLocaleString()}
                      </span>
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

        {/* Shop Details */}
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* About */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-3">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {shop.description}
                </p>
              </div>

              {/* Shop Info */}
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

              {/* Social Links */}
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
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`text-xs ${
                        activeTab === tab.id ? "opacity-80" : "opacity-60"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "products" && (
                <ArticleGrid title="All Products" showBadges={false} />
              )}

              {activeTab === "videos" && <VideoReels />}

              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Customer Reviews</h2>
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <Star className="w-12 h-12 text-amber-500 fill-amber-500 mx-auto mb-3" />
                    <p className="text-4xl font-bold text-foreground mb-1">{shop.rating}</p>
                    <p className="text-muted-foreground">
                      Based on {shop.reviewCount} reviews
                    </p>
                  </div>
                  <p className="text-center text-muted-foreground py-8">
                    Reviews will be displayed here when connected to backend.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
