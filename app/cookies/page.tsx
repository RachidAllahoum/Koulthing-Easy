import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Cookie Policy"
          description="Our cookie usage policy page is coming soon."
          backHref="/"
          backLabel="Back to home"
        />
      </main>
      <Footer />
    </div>
  )
}
