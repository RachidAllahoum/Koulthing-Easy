import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Pricing"
          description="Our pricing details and fee breakdown page is coming soon."
          backHref="/"
          backLabel="Back to home"
        />
      </main>
      <Footer />
    </div>
  )
}
