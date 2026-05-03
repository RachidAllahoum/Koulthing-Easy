import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoon } from "@/components/coming-soon"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ComingSoon
          title="Password Reset"
          description="Password reset will be available soon. Please contact support if you need immediate help."
          backHref="/login"
          backLabel="Back to login"
        />
      </main>
      <Footer />
    </div>
  )
}
