"use client"

import { useState } from "react"
import { Search, Plus, Edit, Trash2, Eye, MoreHorizontal, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddProductModal } from "@/components/add-product-modal"
import { useToast } from "@/hooks/use-toast"

const initialProducts = [
  {
    id: "1",
    name: "Summer Dress with Floral Pattern",
    category: "Fashion",
    price: 4500,
    stock: 15,
    sold: 45,
    status: "active",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
  },
  {
    id: "2",
    name: "Leather Wallet Premium",
    category: "Accessories",
    price: 2800,
    stock: 32,
    sold: 38,
    status: "active",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Wireless Bluetooth Earbuds",
    category: "Electronics",
    price: 8900,
    stock: 8,
    sold: 32,
    status: "low_stock",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop",
  },
  {
    id: "4",
    name: "Handmade Ceramic Vase Set",
    category: "Home",
    price: 3200,
    stock: 0,
    sold: 28,
    status: "out_of_stock",
    image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=300&h=300&fit=crop",
  },
  {
    id: "5",
    name: "Vintage Watch Classic",
    category: "Accessories",
    price: 12000,
    stock: 5,
    sold: 12,
    status: "active",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop",
  },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    low_stock: "bg-amber-100 text-amber-700",
    out_of_stock: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
  }

  const labels = {
    active: "Active",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    draft: "Draft",
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.draft
      }`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

export default function SellerProductsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [products, setProducts] = useState(initialProducts)
  const { toast } = useToast()

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    const newProduct = {
      id: `${Date.now()}`,
      name: productData.name,
      category: productData.category,
      price: parseInt(productData.price),
      stock: parseInt(productData.quantity),
      sold: 0,
      status: parseInt(productData.quantity) > 10 ? "active" : parseInt(productData.quantity) > 0 ? "low_stock" : "out_of_stock",
      image: productData.images[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&h=300&fit=crop",
    }
    setProducts([newProduct, ...products])
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
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {products.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-bold text-amber-600">
            {products.filter((p) => p.status === "low_stock").length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">
            {products.filter((p) => p.status === "out_of_stock").length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-card border border-border rounded-xl overflow-hidden group"
          >
            {/* Image */}
            <div className="relative aspect-square bg-secondary">
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <StatusBadge status={product.status} />
              </div>
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
              <h3 className="font-medium text-foreground line-clamp-1 mb-2">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {product.price.toLocaleString()} DZD
                </span>
                <span className="text-sm text-muted-foreground">
                  {product.stock} in stock
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{product.sold} sold</span>
                <button className="p-1 hover:bg-secondary rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">No products found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or add a new product
          </p>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddProduct}
      />
    </div>
  )
}
