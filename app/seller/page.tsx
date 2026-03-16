"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  ArrowRight,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddProductModal } from "@/components/add-product-modal"
import { useToast } from "@/hooks/use-toast"

const stats = [
  {
    label: "Total Revenue",
    value: "245,000 DZD",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    label: "Orders",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    label: "Products",
    value: "48",
    change: "+4",
    trend: "up",
    icon: Package,
  },
  {
    label: "Followers",
    value: "12.5K",
    change: "+2.1%",
    trend: "up",
    icon: Users,
  },
]

const recentOrders = [
  {
    id: "ORD-001",
    customer: "Sarah M.",
    product: "Summer Dress",
    total: "4,500 DZD",
    status: "pending",
    date: "2 min ago",
  },
  {
    id: "ORD-002",
    customer: "Ahmed K.",
    product: "Leather Wallet",
    total: "2,800 DZD",
    status: "processing",
    date: "15 min ago",
  },
  {
    id: "ORD-003",
    customer: "Fatima B.",
    product: "Wireless Earbuds",
    total: "8,900 DZD",
    status: "shipped",
    date: "1 hour ago",
  },
  {
    id: "ORD-004",
    customer: "Mohamed L.",
    product: "Ceramic Vase Set",
    total: "3,200 DZD",
    status: "delivered",
    date: "3 hours ago",
  },
]

const topProducts = [
  { name: "Summer Dress", sold: 45, revenue: "202,500 DZD" },
  { name: "Leather Wallet", sold: 38, revenue: "106,400 DZD" },
  { name: "Wireless Earbuds", sold: 32, revenue: "284,800 DZD" },
  { name: "Ceramic Vase Set", sold: 28, revenue: "89,600 DZD" },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  )
}

export default function SellerDashboardPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { toast } = useToast()

  const handleAddProduct = (productData: {
    name: string
    description: string
    price: string
    category: string
    colors: { name: string; value: string }[]
    sizes: string[]
    quantity: string
    images: string[]
  }) => {
    toast({
      title: "Product Added",
      description: `${productData.name} has been added to your store.`,
    })
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Package className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Orders</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-accent">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {order.customer.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{order.customer}</p>
                    <p className="text-sm text-muted-foreground">{order.product}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{order.total}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-muted-foreground">{order.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">Top Products</h2>
            <button className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                </div>
                <p className="text-sm font-medium text-foreground">{product.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Balance Card */}
      <div className="mt-6 bg-gradient-to-r from-primary to-accent rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-primary-foreground/80 text-sm mb-1">Account Balance</p>
            <p className="text-3xl font-bold text-primary-foreground">185,500 DZD</p>
            <p className="text-primary-foreground/80 text-sm mt-2">
              Next payout: March 15, 2024
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              Charge Account
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              Withdraw Funds
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              View History
            </Button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddProduct}
      />
    </div>
  )
}
