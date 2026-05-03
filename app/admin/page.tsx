"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Store, Users, TrendingUp, Clock, ArrowRight, AlertCircle, ShoppingCart, Landmark } from "lucide-react"
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
  const [platformStats, setPlatformStats] = useState({
    buyers: 0,
    sellers: 0,
    approvedShops: 0,
    orderCount: 0,
    totalPlatformFees: 0,
  })
  const [monthlyFees, setMonthlyFees] = useState<{ month: string; fee: number }[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("seller_applications").select("id").eq("status", "pending")
      setPendingCount(data?.length ?? 0)
    })()
  }, [])

  useEffect(() => {
    if (!user?.isAdmin) return
    let cancelled = false
    void (async () => {
      setStatsLoading(true)
      const [profilesRes, shopsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, role"),
        supabase.from("shops").select("id, is_active"),
        supabase.from("orders").select("id, created_at, koulthing_fee"),
      ])

      if (cancelled) return

      const profiles = profilesRes.data ?? []
      const buyers = profiles.filter((p) => p.role === "buyer").length
      const sellers = profiles.filter((p) => p.role === "seller").length
      const shops = shopsRes.data ?? []
      const approvedShops = shops.filter((s) => s.is_active !== false).length
      const orders = ordersRes.data ?? []
      const orderCount = orders.length
      const totalPlatformFees = orders.reduce((sum, o) => {
        const n = typeof o.koulthing_fee === "number" ? o.koulthing_fee : Number(o.koulthing_fee ?? 0)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0)

      const byMonth = new Map<string, number>()
      for (const o of orders) {
        const d = new Date(o.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const n = typeof o.koulthing_fee === "number" ? o.koulthing_fee : Number(o.koulthing_fee ?? 0)
        byMonth.set(key, (byMonth.get(key) ?? 0) + (Number.isFinite(n) ? n : 0))
      }
      const monthly = [...byMonth.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, fee]) => ({ month, fee }))

      setPlatformStats({
        buyers,
        sellers,
        approvedShops,
        orderCount,
        totalPlatformFees: Math.round(totalPlatformFees),
      })
      setMonthlyFees(monthly)
      setStatsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.isAdmin])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-card border rounded-2xl p-5"><Users className="mb-2" /><p className="text-2xl font-bold">{statsLoading ? "…" : platformStats.buyers}</p><p className="text-sm text-muted-foreground">Buyers</p></div>
        <div className="bg-card border rounded-2xl p-5"><Store className="mb-2" /><p className="text-2xl font-bold">{statsLoading ? "…" : platformStats.sellers}</p><p className="text-sm text-muted-foreground">Sellers</p></div>
        <div className="bg-card border rounded-2xl p-5"><Store className="mb-2" /><p className="text-2xl font-bold">{statsLoading ? "…" : platformStats.approvedShops}</p><p className="text-sm text-muted-foreground">Approved shops</p></div>
        <div className="bg-card border rounded-2xl p-5"><ShoppingCart className="mb-2" /><p className="text-2xl font-bold">{statsLoading ? "…" : platformStats.orderCount}</p><p className="text-sm text-muted-foreground">Orders</p></div>
        <div className="bg-card border rounded-2xl p-5"><Landmark className="mb-2" /><p className="text-2xl font-bold">{statsLoading ? "…" : `${platformStats.totalPlatformFees.toLocaleString()} DZD`}</p><p className="text-sm text-muted-foreground">Total platform fees</p></div>
      </div>
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/shop-approvals"><Button variant="outline">Open Shop Approvals <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          <Link href="/admin/orders"><Button variant="outline">Open All Orders <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
        </div>
      </div>
      <div className="mb-8 bg-card border rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-3">Platform fees by month</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2">Total fees</th>
              </tr>
            </thead>
            <tbody>
              {monthlyFees.map((r) => (
                <tr key={r.month} className="border-b border-border/60">
                  <td className="py-2 pr-4">{r.month}</td>
                  <td className="py-2">{Math.round(r.fee).toLocaleString()} DZD</td>
                </tr>
              ))}
              {!statsLoading && monthlyFees.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-3 text-muted-foreground">No fee data yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
