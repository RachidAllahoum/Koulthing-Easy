import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Privacy Policy"
          description="We are preparing our Privacy Policy page. It will be available soon."
          backHref="/"
          backLabel="Back to home"
        />
      </main>
      <Footer />
    </div>
  )
}
