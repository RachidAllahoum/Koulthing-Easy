"use client"

import { useState } from "react"
import { 
  Plus, 
  Search, 
  Tag, 
  Copy, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Percent,
  ShoppingBag,
  Calendar,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DiscountCode {
  id: string
  code: string
  description: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minPurchase: number
  maxUses: number
  usedCount: number
  expiryDate: string
  status: "active" | "expired" | "depleted"
  applicableTo: "all" | "specific"
  products: string[]
}

const discountCodes: DiscountCode[] = [
  {
    id: "1",
    code: "SPRING30",
    description: "Spring collection discount",
    discountType: "percentage",
    discountValue: 30,
    minPurchase: 5000,
    maxUses: 100,
    usedCount: 45,
    expiryDate: "2024-03-31",
    status: "active",
    applicableTo: "all",
    products: [],
  },
  {
    id: "2",
    code: "SAVE500",
    description: "500 DZD off on orders above 3000 DZD",
    discountType: "fixed",
    discountValue: 500,
    minPurchase: 3000,
    maxUses: 50,
    usedCount: 50,
    expiryDate: "2024-04-15",
    status: "depleted",
    applicableTo: "all",
    products: [],
  },
  {
    id: "3",
    code: "LEATHER20",
    description: "20% off on leather products",
    discountType: "percentage",
    discountValue: 20,
    minPurchase: 0,
    maxUses: 200,
    usedCount: 78,
    expiryDate: "2024-02-28",
    status: "expired",
    applicableTo: "specific",
    products: ["Leather Wallet", "Leather Belt", "Leather Bag"],
  },
  {
    id: "4",
    code: "WELCOME10",
    description: "Welcome discount for new customers",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 0,
    maxUses: 1000,
    usedCount: 234,
    expiryDate: "2024-12-31",
    status: "active",
    applicableTo: "all",
    products: [],
  },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    expired: "bg-gray-100 text-gray-700",
    depleted: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        styles[status as keyof typeof styles] || styles.active
      }`}
    >
      {status}
    </span>
  )
}

export default function SellerDiscountsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredCodes = discountCodes.filter((code) =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discount Codes</h1>
          <p className="text-muted-foreground">Generate and manage discount codes</p>
        </div>
        <Button 
          className="rounded-xl gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Create Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Tag className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">Active Codes</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {discountCodes.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">Total Uses</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {discountCodes.reduce((sum, c) => sum + c.usedCount, 0)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Percent className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">Avg. Discount</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              discountCodes
                .filter((c) => c.discountType === "percentage")
                .reduce((sum, c) => sum + c.discountValue, 0) /
                discountCodes.filter((c) => c.discountType === "percentage").length
            )}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">Expired</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {discountCodes.filter((c) => c.status === "expired" || c.status === "depleted").length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search discount codes..."
            className="pl-10 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Discount Codes Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Code
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Discount
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Usage
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Min. Purchase
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Expires
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Status
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground px-5 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCodes.map((discount) => (
                <tr key={discount.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <code className="px-2.5 py-1 bg-secondary rounded-lg text-sm font-mono font-medium text-foreground">
                        {discount.code}
                      </code>
                      <button
                        onClick={() => copyCode(discount.code)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                      >
                        {copiedCode === discount.code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{discount.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">
                      {discount.discountType === "percentage"
                        ? `${discount.discountValue}%`
                        : `${discount.discountValue.toLocaleString()} DZD`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{discount.usedCount}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{discount.maxUses}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(discount.usedCount / discount.maxUses) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-foreground">
                      {discount.minPurchase === 0
                        ? "None"
                        : `${discount.minPurchase.toLocaleString()} DZD`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-muted-foreground">{discount.expiryDate}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={discount.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCodes.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">No discount codes found</h3>
          <p className="text-sm text-muted-foreground">
            Create your first discount code to attract more customers
          </p>
        </div>
      )}

      {/* Create Discount Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-foreground mb-6">Create Discount Code</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Discount Code
                </label>
                <Input 
                  placeholder="e.g., SAVE20" 
                  className="h-11 rounded-xl font-mono uppercase" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use uppercase letters and numbers only
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <Input placeholder="Describe this discount" className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Discount Type
                  </label>
                  <select className="w-full h-11 px-3 rounded-xl bg-background border border-input text-foreground">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (DZD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Discount Value
                  </label>
                  <Input 
                    type="number" 
                    placeholder="e.g., 20" 
                    className="h-11 rounded-xl" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Min. Purchase (DZD)
                  </label>
                  <Input 
                    type="number" 
                    placeholder="0 for no minimum" 
                    className="h-11 rounded-xl" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Max Uses
                  </label>
                  <Input 
                    type="number" 
                    placeholder="e.g., 100" 
                    className="h-11 rounded-xl" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Expiry Date
                </label>
                <Input type="date" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Applicable To
                </label>
                <select className="w-full h-11 px-3 rounded-xl bg-background border border-input text-foreground">
                  <option value="all">All Products</option>
                  <option value="specific">Specific Products</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl">
                  Create Code
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
