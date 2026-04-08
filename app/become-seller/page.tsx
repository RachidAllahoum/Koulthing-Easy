"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"

export default function BecomeSellerPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [hasPendingApplication, setHasPendingApplication] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [formData, setFormData] = useState({ shopName: "", businessRegistration: "", description: "" })
  const submitLockRef = useRef(false)

  const getCurrentAuthUserId = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user?.id) {
      throw new Error(error?.message || "You must be signed in to apply.")
    }
    return data.user.id
  }

  useEffect(() => {
    void (async () => {
      const uid = await getCurrentAuthUserId().catch(() => null)
      if (!uid) return
      const { data: pending } = await supabase.from("seller_applications").select("id").eq("user_id", uid).eq("status", "pending").limit(1)
      setHasPendingApplication((pending?.length ?? 0) > 0)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLockRef.current || isLoading || hasPendingApplication) return
    submitLockRef.current = true
    setIsLoading(true)
    setSubmitError("")
    setSubmitMessage("")
    try {
      const authUserId = await getCurrentAuthUserId()
      const { error } = await supabase.from("seller_applications").insert({
        user_id: authUserId,
        shop_name: formData.shopName,
        business_registration: formData.businessRegistration,
        description: formData.description,
        status: "pending",
      })
      if (error) throw error
      setSubmitMessage("Application submitted for review")
      setHasPendingApplication(true)
      setFormData({ shopName: "", businessRegistration: "", description: "" })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit application.")
    } finally {
      setIsLoading(false)
      submitLockRef.current = false
    }
  }

  const redirectPath = !authLoading ? (!user ? "/login" : user.isSeller ? "/seller" : user.isAdmin ? "/admin" : null) : null
  useEffect(() => { if (redirectPath) router.push(redirectPath) }, [redirectPath, router])
  if (authLoading || redirectPath || !user) return null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Become a Seller</h1>
          {submitMessage ? <p className="mb-4 text-green-700 text-sm">{submitMessage}</p> : null}
          {submitError ? <p className="mb-4 text-destructive text-sm">{submitError}</p> : null}
          {hasPendingApplication ? <p className="mb-4 text-amber-700 text-sm">You already have a pending application.</p> : null}
          <form onSubmit={handleSubmit} className="space-y-5 bg-card border rounded-2xl p-8">
            <div><label className="block text-sm mb-2">Shop name</label><Input value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} required disabled={hasPendingApplication} /></div>
            <div><label className="block text-sm mb-2">Business registration number</label><Input value={formData.businessRegistration} onChange={(e) => setFormData({ ...formData, businessRegistration: e.target.value })} required disabled={hasPendingApplication} /></div>
            <div><label className="block text-sm mb-2">Shop description</label><textarea className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-background border border-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required disabled={hasPendingApplication} /></div>
            <Button type="submit" className="w-full" disabled={isLoading || hasPendingApplication}>{isLoading ? "Submitting..." : "Submit application"}</Button>
          </form>
          <p className="text-center text-muted-foreground mt-6">Already a seller? <Link href="/login" className="text-accent font-medium hover:text-accent/80 transition-colors">Go to your dashboard</Link></p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
