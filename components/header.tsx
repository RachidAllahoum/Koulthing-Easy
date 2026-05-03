"use client"

import Link from "next/link"
import { Menu, X, ShoppingCart, Heart } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { ProfileDropdown } from "@/components/profile-dropdown"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const { itemCount } = useCart()

  const showBuyerNav = Boolean(isAuthenticated && user?.profileRole === "buyer" && !user?.isAdmin)

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">K</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Koulthing
          </span>
        </Link>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <Link
            href="/articles"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Articles
          </Link>
          <Link
            href="/shops"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Shops
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          {/* Buyer-only shortcuts */}
          {showBuyerNav && (
            <>
              <Link
                href="/wishlist"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Wishlist"
              >
                <Heart className="w-6 h-6" />
              </Link>
              <Link
                href="/cart"
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </>
          )}
          
          {isAuthenticated ? (
            <>
              {user?.isSeller && (
                <Link
                  href="/seller"
                  className="text-xs font-medium px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Seller dashboard
                </Link>
              )}
              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors px-3 py-2 rounded-full bg-amber-100/20"
                >
                  Admin Panel
                </Link>
              )}
              <ProfileDropdown />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Button asChild className="rounded-full px-6">
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-6">
            <Link
              href="/articles"
              className="text-base font-medium text-foreground transition-colors hover:text-muted-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Articles
            </Link>
            <Link
              href="/shops"
              className="text-base font-medium text-foreground transition-colors hover:text-muted-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Shops
            </Link>
            {showBuyerNav && (
              <>
                <Link
                  href="/wishlist"
                  className="text-base font-medium text-foreground transition-colors hover:text-muted-foreground flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Heart className="w-5 h-5" />
                  Wishlist
                </Link>
                <Link
                  href="/cart"
                  className="text-base font-medium text-foreground transition-colors hover:text-muted-foreground flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart
                  {itemCount > 0 && (
                    <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            {!isAuthenticated && (
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log in
                </Link>
                <Button asChild className="rounded-full">
                  <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                    Create account
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
