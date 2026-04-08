import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticlesBrowse } from "@/components/articles-browse"

export const metadata = {
  title: "Browse Articles | Koulthing",
  description: "Discover curated articles from top shops in Algeria. Browse fashion, electronics, home goods, and more.",
}

export default function ArticlesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <ArticlesBrowse />
      </main>

      <Footer />
    </div>
  )
}
