"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useShops } from "@/lib/shops-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Mail,
  MapPin,
} from "lucide-react"

export default function AdminShopApprovalsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { getPendingShops, approveShop, rejectShop } = useShops()
  const pendingShops = getPendingShops()

  // Check if user is admin
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

  const handleApprove = (shopId: string) => {
    if (user) {
      approveShop(shopId, user.id)
    }
  }

  const handleReject = (shopId: string) => {
    rejectShop(shopId)
  }

  return (
    <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Shop Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve/reject pending shop applications
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Shops</p>
                <p className="text-3xl font-bold text-foreground">{pendingShops.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Shops</p>
                <p className="text-3xl font-bold text-foreground">-</p>
              </div>
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Action</p>
                <p className="text-sm font-medium text-foreground">Today</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Pending Shops List */}
        <div className="space-y-4">
          {pendingShops.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Shops</h3>
              <p className="text-muted-foreground">All shop applications have been reviewed.</p>
            </div>
          ) : (
            pendingShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shop Info */}
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-primary">
                          {shop.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {shop.name}
                        </h3>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Pending Approval
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{shop.sellerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="break-all">{shop.sellerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{shop.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(shop.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details & Actions */}
                  <div>
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Shop Description
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {shop.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium text-foreground">{shop.category}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Shop ID:</span>
                          <span className="font-mono text-xs text-foreground">{shop.id}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Seller ID:</span>
                          <span className="font-mono text-xs text-foreground">
                            {shop.sellerId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(shop.id)}
                        className="flex-1 rounded-full gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(shop.id)}
                        variant="outline"
                        className="flex-1 rounded-full gap-2 border-destructive text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  )
}
