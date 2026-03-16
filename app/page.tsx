import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { NavigationCards } from "@/components/navigation-cards"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        <NavigationCards />
        
        

        {/* CTA Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4 text-balance">
              Ready to start your journey?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 text-pretty">
              Join thousands of creators and shoppers who have found their community on Koulthing-Easy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/become-seller"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Start Selling Today
              </a>
              <a
                href="/shops"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-accent/30"
              >
                Explore Shops
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
