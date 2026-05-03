"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { LogOut, Settings, User as UserIcon, ShoppingBag, Shield } from "lucide-react"

export function ProfileDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
  }

  const isBuyer = user.profileRole === "buyer" && !user.isAdmin

  const links = [
    ...(user.isAdmin ? [{ href: "/admin", icon: Shield, label: "Admin Panel" }] : []),
    { href: "/profile", icon: UserIcon, label: "My Profile" },
    ...(isBuyer ? [{ href: "/profile/orders", icon: ShoppingBag, label: "My Orders" }] : []),
    { href: "/profile/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors flex items-center justify-center bg-secondary text-muted-foreground"
        aria-label="Account menu"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserIcon className="w-5 h-5" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border mb-2">
            <p className="font-semibold text-foreground text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              Account
            </span>
          </div>

          {/* Links */}
          <div className="space-y-1 mb-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <link.icon className="w-4 h-4 text-muted-foreground" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
