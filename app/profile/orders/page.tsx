"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Download } from "lucide-react"

const mockOrders = [
  {
    id: "ORD-001",
    shop: "Digital Design Studio",
    products: [
      { name: "UI Kit Pro", price: 49.99, qty: 1 },
      { name: "Icon Pack", price: 19.99, qty: 1 },
    ],
    total: 69.98,
    status: "delivered",
    date: "2024-03-10",
  },
  {
    id: "ORD-002",
    shop: "Photography Basics",
    products: [{ name: "Photography Guide", price: 29.99, qty: 1 }],
    total: 29.99,
    status: "in-transit",
    date: "2024-03-08",
  },
  {
    id: "ORD-003",
    shop: "Graphic Masters",
    products: [{ name: "Branding Templates", price: 39.99, qty: 2 }],
    total: 79.98,
    status: "processing",
    date: "2024-03-05",
  },
]

const statuses = {
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700" },
  "in-transit": { label: "In Transit", color: "bg-yellow-100 text-yellow-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
}

export default function OrdersPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Order History</h1>
          </div>

          {mockOrders.length > 0 ? (
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{order.id}</h3>
                      <p className="text-sm text-muted-foreground">{order.shop}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 text-sm font-medium rounded-full capitalize ${
                          statuses[order.status as keyof typeof statuses]?.color
                        }`}
                      >
                        {statuses[order.status as keyof typeof statuses]?.label}
                      </span>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="border-t border-border pt-4 mb-4">
                    {order.products.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {product.qty}</p>
                        </div>
                        <p className="text-sm font-medium text-foreground">DZD {(product.price * product.qty).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total and Actions */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold text-foreground">DZD {order.total.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-lg gap-2">
                        <Download className="w-4 h-4" />
                        Invoice
                      </Button>
                      <Button className="rounded-lg">Contact Seller</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">No orders yet</p>
              <Link href="/shops">
                <Button className="rounded-lg">Start Shopping</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
