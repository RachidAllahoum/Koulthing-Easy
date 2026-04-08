"use client"

import { useState } from "react"
import { Search, Plus, Edit, Trash2, Eye, MoreHorizontal, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddProductModal } from "@/components/add-product-modal"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase-client"
import { useEffect } from "react"
import { mapColorNameToSwatch } from "@/lib/products-map"

interface SellerProduct {
  id: string
  name: string
  category: string
  price: number
  stock: number
  sold: number
  status: "active" | "low_stock" | "out_of_stock"
  image: string
  description: string
  sizes: string[]
  colors: string[]
  images: string[]
}

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
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [shopId, setShopId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadProducts = async () => {
    if (!user) return
    const { data: myShop, error: shopError } = await supabase
      .from("shops")
      .select("id")
      .eq("seller_id", user.id)
      .limit(1)
      .maybeSingle()

    if (shopError) {
      toast({ title: "Failed loading shop", description: shopError.message, variant: "destructive" })
      return
    }
    if (!myShop) {
      setShopId(null)
      setProducts([])
      return
    }
    setShopId(myShop.id)

    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, stock, images_array, sizes_array, colors_array, created_at")
      .eq("shop_id", myShop.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Failed loading products", description: error.message, variant: "destructive" })
      return
    }

    const mapped = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      category: "Product",
      price: Number(p.price),
      stock: p.stock,
      sold: 0,
      status: p.stock > 10 ? "active" : p.stock > 0 ? "low_stock" : "out_of_stock",
      image: p.images_array?.[0] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300&h=300&fit=crop",
      description: p.description || "",
      sizes: p.sizes_array || [],
      colors: p.colors_array || [],
      images: p.images_array || [],
    })) as SellerProduct[]
    setProducts(mapped)
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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
    if (!shopId) return
    ;(async () => {
      if (modalMode === "edit" && editingProductId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: productData.name,
            description: productData.description,
            price: parseFloat(productData.price),
            sizes_array: productData.sizes,
            colors_array: productData.colors.map((c) => c.name),
            stock: parseInt(productData.quantity),
            images_array: productData.images,
          })
          .eq("id", editingProductId)

        if (error) {
          toast({ title: "Update failed", description: error.message, variant: "destructive" })
          return
        }
        await loadProducts()
        toast({
          title: "Product updated",
          description: `${productData.name} has been saved.`,
        })
        setEditingProductId(null)
        setModalMode("create")
        return
      }

      const { error } = await supabase.from("products").insert({
        shop_id: shopId,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        sizes_array: productData.sizes,
        colors_array: productData.colors.map((c) => c.name),
        stock: parseInt(productData.quantity),
        images_array: productData.images,
      })

      if (error) {
        toast({ title: "Add failed", description: error.message, variant: "destructive" })
        return
      }
      await loadProducts()
      toast({
        title: "Product Added",
        description: `${productData.name} has been added to your store.`,
      })
    })()
  }

  return (
    <div className="p-6 lg:p-8">
      {!shopId && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-foreground">
          No shop found for your account. Products are tied to the shop created when your seller application is approved.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Button
          className="rounded-xl gap-2"
          disabled={!shopId}
          onClick={() => {
            setModalMode("create")
            setEditingProductId(null)
            setIsAddModalOpen(true)
          }}
        >
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
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-lg"
                  onClick={() => {
                    const full = products.find((p) => p.id === product.id)
                    if (!full) return
                    setModalMode("edit")
                    setEditingProductId(full.id)
                    setIsAddModalOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-lg"
                  onClick={async () => {
                    const { error } = await supabase.from("products").delete().eq("id", product.id)
                    if (error) {
                      toast({ title: "Delete failed", description: error.message, variant: "destructive" })
                      return
                    }
                    await loadProducts()
                    toast({ title: "Product deleted", description: `${product.name} removed.` })
                  }}
                >
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
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingProductId(null)
          setModalMode("create")
        }}
        onSubmit={handleAddProduct}
        mode={modalMode}
        initialValues={
          modalMode === "edit" && editingProductId
            ? (() => {
                const p = products.find((x) => x.id === editingProductId)
                if (!p) return undefined
                return {
                  name: p.name,
                  description: p.description,
                  price: String(p.price),
                  category: p.category === "Product" ? "Other" : p.category,
                  sizes: p.sizes,
                  colors: p.colors.map((c) => mapColorNameToSwatch(c)),
                  quantity: String(p.stock),
                  images: p.images,
                }
              })()
            : undefined
        }
      />
    </div>
  )
}
