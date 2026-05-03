import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Terms of Service"
          description="We are preparing our Terms of Service page. It will be available soon."
          backHref="/"
          backLabel="Back to home"
        />
      </main>
      <Footer />
    </div>
  )
}
