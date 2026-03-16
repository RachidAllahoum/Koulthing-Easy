import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { VideoReels } from "@/components/video-reels"
import { ArticleFilters } from "@/components/article-filters"
import { ArticleGrid } from "@/components/article-grid"

export const metadata = {
  title: "Browse Articles | Koulthing",
  description: "Discover curated articles from top shops in Algeria. Browse fashion, electronics, home goods, and more.",
}

export default function ArticlesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {/* Video Reels Section */}
        <VideoReels />

        {/* Filters */}
        <div className="py-6 border-b border-border">
          <ArticleFilters />
        </div>

        {/* Suggested Articles */}
        <ArticleGrid title="Suggested for You" />

        {/* Advertisements Section */}
        <section className="py-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-8 md:p-12">
            <div className="relative z-10 max-w-xl">
              <span className="inline-block px-3 py-1 bg-card/20 backdrop-blur-sm rounded-full text-xs font-medium text-card mb-4">
                Featured Promotion
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-card mb-3">
                Summer Sale: Up to 50% Off
              </h2>
              <p className="text-card/80 mb-6">
                Shop the best deals on fashion, electronics, and home essentials from top sellers.
              </p>
              <button className="px-6 py-3 bg-card text-foreground font-medium rounded-full hover:bg-card/90 transition-colors">
                Shop Now
              </button>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-card/10 rounded-full blur-3xl" />
            <div className="absolute -right-10 top-0 w-40 h-40 bg-card/5 rounded-full blur-2xl" />
          </div>
        </section>

        {/* Bestselling Articles */}
        <ArticleGrid title="Best Selling" showBadges={false} />

        {/* More Articles */}
        <ArticleGrid title="Recently Added" showBadges={false} />
      </main>

      <Footer />
    </div>
  )
}
