"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useShops } from "@/lib/shops-context"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ChevronDown,
  Bell,
  Wallet,
  Video,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/seller", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/seller/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/seller/products", icon: Package, label: "Products" },
  { href: "/seller/reels", icon: Video, label: "Reels" },
  { href: "/seller/discounts", icon: Tag, label: "Discounts" },
  { href: "/seller/shop", icon: Store, label: "My Shop" },
  { href: "/seller/profile", icon: User, label: "Profile" },
  { href: "/seller/settings", icon: Settings, label: "Settings" },
]

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { getSellerShops } = useShops()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const myShop = user ? getSellerShops(user.id)[0] : undefined

  const isPendingApprovalRoute = pathname === "/seller/pending-approval"

  if (!isLoading && !user) {
    router.push("/login")
    return null
  }

  if (!isLoading && user && isPendingApprovalRoute) {
    if (user.profileRole !== "seller") {
      router.push("/")
      return null
    }
    if (user.isSeller) {
      router.push("/seller")
      return null
    }
    return <div className="min-h-screen bg-background">{children}</div>
  }

  if (!isLoading && (!user || (!user.isSeller && !user.isAdmin))) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 lg:hidden flex items-center justify-between h-16 px-4 bg-card border-b border-border">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
        <Link href="/seller" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">K</span>
          </div>
          <span className="font-semibold text-foreground">Seller Hub</span>
        </Link>
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-foreground/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link href="/seller" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">K</span>
            </div>
            <div>
              <span className="font-semibold text-foreground block leading-tight">Koulthing</span>
              <span className="text-xs text-muted-foreground">Seller Hub</span>
            </div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Shop Selector */}
        <div className="p-4 border-b border-border">
          <div className="w-full flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {myShop?.name ?? "No shop found"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {myShop ? "Your store" : "Contact support if this is unexpected"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 opacity-50" aria-hidden />
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
