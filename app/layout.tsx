import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { MessagingProvider } from '@/lib/messaging-context'
import { ShopsProvider } from '@/lib/shops-context'
import { ReelsProvider } from '@/lib/reels-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import { Toaster } from '@/components/ui/toaster'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Koulthing-Easy - Discover Articles and Shops',
  description: 'Your marketplace for discovering curated articles, exploring unique shops, and using separate buyer and seller accounts.',
  
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <MessagingProvider>
                <ShopsProvider>
                  <ReelsProvider>
                    {children}
                  </ReelsProvider>
                </ShopsProvider>
              </MessagingProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
