"use client"

import { useState, useMemo } from "react"
import { Search, Filter, ChevronDown, ChevronUp, Eye, Package, MoreHorizontal, CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SortField = "id" | "status" | "total" | "date"
type SortOrder = "asc" | "desc"

const orders = [
  {
    id: "ORD-001",
    customer: "Sarah M.",
    email: "sarah.m@email.com",
    products: [{ name: "Summer Dress", qty: 1, price: 4500 }],
    total: 4500,
    status: "pending",
    date: "2024-03-10",
    address: "Algiers, Algeria",
  },
  {
    id: "ORD-002",
    customer: "Ahmed K.",
    email: "ahmed.k@email.com",
    products: [
      { name: "Leather Wallet", qty: 1, price: 2800 },
      { name: "Belt", qty: 1, price: 1500 },
    ],
    total: 4300,
    status: "processing",
    date: "2024-03-09",
    address: "Oran, Algeria",
  },
  {
    id: "ORD-003",
    customer: "Fatima B.",
    email: "fatima.b@email.com",
    products: [{ name: "Wireless Earbuds", qty: 2, price: 8900 }],
    total: 17800,
    status: "shipped",
    date: "2024-03-08",
    address: "Constantine, Algeria",
  },
  {
    id: "ORD-004",
    customer: "Mohamed L.",
    email: "mohamed.l@email.com",
    products: [{ name: "Ceramic Vase Set", qty: 1, price: 3200 }],
    total: 3200,
    status: "delivered",
    date: "2024-03-07",
    address: "Annaba, Algeria",
  },
  {
    id: "ORD-005",
    customer: "Amina S.",
    email: "amina.s@email.com",
    products: [{ name: "Handbag", qty: 1, price: 6500 }],
    total: 6500,
    status: "cancelled",
    date: "2024-03-06",
    address: "Blida, Algeria",
  },
]

const statusFilters = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"]

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
      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  )
}

export default function SellerOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null)
  const [confirmedOrders, setConfirmedOrders] = useState<string[]>([])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const confirmOrder = (orderId: string) => {
    setConfirmedOrders([...confirmedOrders, orderId])
    setConfirmingOrder(null)
  }

  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "All" || order.status.toLowerCase() === selectedStatus.toLowerCase()
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })

    // Sort orders
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "id":
          comparison = a.id.localeCompare(b.id)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "total":
          comparison = a.total - b.total
          break
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [selectedStatus, searchQuery, sortField, sortOrder])

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th 
      className="text-left text-sm font-medium text-muted-foreground px-5 py-4 cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </th>
  )

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage and track your orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl gap-2">
            <Filter className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-10 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <SortHeader field="id" label="Order ID" />
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Customer
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-5 py-4">
                  Item Qty
                </th>
                <SortHeader field="total" label="Total" />
                <SortHeader field="status" label="Status" />
                <SortHeader field="date" label="Date" />
                <th className="text-right text-sm font-medium text-muted-foreground px-5 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">{order.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-foreground">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">
                      {order.products.reduce((sum, p) => sum + p.qty, 0)} items
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-foreground">
                      {order.total.toLocaleString()} DZD
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-muted-foreground">{order.date}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === "pending" && !confirmedOrders.includes(order.id) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          onClick={() => setConfirmingOrder(order.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </Button>
                      )}
                      {confirmedOrders.includes(order.id) && (
                        <span className="text-xs font-medium text-green-600 px-2 py-1 bg-green-100 rounded-full">
                          Confirmed
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Package className="w-4 h-4" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm Order Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Confirm Order</h2>
              <button 
                onClick={() => setConfirmingOrder(null)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to confirm order <strong className="text-foreground">{confirmingOrder}</strong>? 
              This will notify the customer that their order is being processed.
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setConfirmingOrder(null)}
              >
                Cancel
              </Button>
              <Button 
                className="rounded-xl gap-2"
                onClick={() => confirmOrder(confirmingOrder)}
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
