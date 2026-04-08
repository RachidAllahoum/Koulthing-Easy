"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Store, Users, TrendingUp, Clock, ArrowRight, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useShops } from "@/lib/shops-context"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { allShops, activeShopsCount, toggleShopActive } = useShops()
  const { toast } = useToast()
  const [pendingCount, setPendingCount] = useState(0)
  const [updatingShopId, setUpdatingShopId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("seller_applications").select("id").eq("status", "pending")
      setPendingCount(data?.length ?? 0)
    })()
  }, [])

  if (!user || !user.isAdmin) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Only admin users can access this page.</p>
          <Button onClick={() => router.push("/")}>Go Back Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-2xl p-6"><Clock className="mb-2" /><p className="text-3xl font-bold">{pendingCount}</p><p>Pending Approvals</p></div>
        <div className="bg-card border rounded-2xl p-6"><Store className="mb-2" /><p className="text-3xl font-bold">{activeShopsCount}</p><p>Active Shops</p></div>
        <div className="bg-card border rounded-2xl p-6"><Users className="mb-2" /><p className="text-3xl font-bold">-</p><p>Total Users</p></div>
        <div className="bg-card border rounded-2xl p-6"><TrendingUp className="mb-2" /><p className="text-3xl font-bold">-</p><p>Platform Revenue</p></div>
      </div>
      <div className="mb-6">
        <Link href="/admin/shop-approvals"><Button variant="outline">Open Shop Approvals <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
      </div>
      <div className="space-y-3">
        {allShops.map((shop) => {
          const isActive = shop.status === "approved"
          return (
            <div key={shop.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
              <div><p className="font-medium">{shop.name}</p><p className="text-xs">{shop.sellerEmail || "No email"}</p></div>
              <Button variant="outline" size="sm" disabled={updatingShopId === shop.id} onClick={async () => {
                try {
                  setUpdatingShopId(shop.id)
                  await toggleShopActive(shop.id, !isActive)
                  toast({ title: "Updated", description: shop.name + " status changed." })
                } catch (error) {
                  toast({ title: "Update failed", description: error instanceof Error ? error.message : "Could not update", variant: "destructive" })
                } finally {
                  setUpdatingShopId(null)
                }
              }}>
                {isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
