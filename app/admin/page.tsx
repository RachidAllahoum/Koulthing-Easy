"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useShops } from "@/lib/shops-context"
import { Button } from "@/components/ui/button"
import {
  Store,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { getPendingShops, shops } = useShops()
  const pendingShops = getPendingShops()

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Only admin users can access this page.</p>
          <Button onClick={() => router.push("/")} className="rounded-full">
            Go Back Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}. Here is an overview of the platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">{pendingShops.length}</p>
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              Active
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">{shops.filter(s => s.status === 'approved').length}</p>
          <p className="text-sm text-muted-foreground">Active Shops</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">1,234</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">DZD 2.4M</p>
          <p className="text-sm text-muted-foreground">Platform Revenue</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Pending Shop Approvals</h2>
            <Link href="/admin/shop-approvals">
              <Button variant="outline" size="sm" className="rounded-lg gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {pendingShops.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingShops.slice(0, 3).map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-center gap-4 p-3 bg-secondary/50 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">{shop.category}</p>
                  </div>
                  <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Store className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-foreground">Shop "Fashion House" was approved</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-foreground">New seller registered: Ahmed Tech</p>
                <p className="text-xs text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-foreground">New shop application received</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
