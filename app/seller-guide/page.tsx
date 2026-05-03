import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function SellerGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Seller Guide"
          description="Our seller onboarding and best-practices guide is coming soon."
          backHref="/seller"
          backLabel="Go to seller dashboard"
        />
      </main>
      <Footer />
    </div>
  )
}
