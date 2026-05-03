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
import type { ProductFormData } from "@/components/add-product-modal"
import { saveSellerProductCatalog } from "@/lib/seller-save-product"
import { NoProductImage } from "@/components/no-uploaded-media"

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
  variants: { id: string; sku: string; size: string; color: string; stock: number; variantPrice: string }[]
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
  const [shopCategory, setShopCategory] = useState<string | null>(null)
  const { toast } = useToast()

  const loadProducts = async () => {
    if (!user) return
    const { data: myShop, error: shopError } = await supabase
      .from("shops")
      .select("id, shop_category")
      .eq("seller_id", user.id)
      .limit(1)
      .maybeSingle()

    if (shopError) {
      toast({ title: "Failed loading shop", description: shopError.message, variant: "destructive" })
      return
    }
    if (!myShop) {
      setShopId(null)
      setShopCategory(null)
      setProducts([])
      return
    }
    setShopId(myShop.id)
    setShopCategory(typeof myShop.shop_category === "string" ? myShop.shop_category : null)

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, base_price, stock, images_array, sizes_array, colors_array, created_at, product_variants ( id, size, color, sku, price, stocks ( quantity_total ) )",
      )
      .eq("shop_id", myShop.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Failed loading products", description: error.message, variant: "destructive" })
      return
    }

    const catLabel = (typeof myShop.shop_category === "string" && myShop.shop_category.trim()
      ? myShop.shop_category.trim()
      : "Product") as string

    const mapped = (data ?? []).map((p) => {
      const rawVariants = (p as { product_variants?: unknown[] }).product_variants ?? []
      const baseNum = Number((p as { base_price?: unknown }).base_price ?? p.price) || 0
      const variants = rawVariants.map((v) => {
        const row = v as Record<string, unknown>
        const stocks = row.stocks as { quantity_total?: unknown }[] | { quantity_total?: unknown } | null | undefined
        const st = Array.isArray(stocks) ? stocks[0] : stocks
        const total = Math.max(0, Math.floor(Number(st?.quantity_total) || 0))
        const rawPrice = row.price
        const vPrice =
          rawPrice != null && String(rawPrice).trim() !== ""
            ? typeof rawPrice === "string"
              ? parseFloat(rawPrice)
              : Number(rawPrice)
            : null
        const variantPrice =
          vPrice != null && Number.isFinite(vPrice) && Math.abs(vPrice - baseNum) > 0.005 ? String(vPrice) : ""
        return {
          id: String(row.id),
          sku: String(row.sku ?? "").trim(),
          size: String(row.size ?? "").trim(),
          color: String(row.color ?? "").trim(),
          stock: total,
          variantPrice,
        }
      })
      return {
        id: p.id as string,
        name: p.name as string,
        category: catLabel,
        price: baseNum,
        stock: Number(p.stock) || 0,
        sold: 0,
        status: (Number(p.stock) || 0) > 10 ? "active" : (Number(p.stock) || 0) > 0 ? "low_stock" : "out_of_stock",
        image: (p.images_array as string[] | null)?.filter(Boolean)[0] || "",
        description: (p.description as string | null) || "",
        sizes: (p.sizes_array as string[] | null) || [],
        colors: (p.colors_array as string[] | null) || [],
        images: (p.images_array as string[] | null) || [],
        variants,
      } satisfies SellerProduct
    })
    setProducts(mapped)
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddProduct = (productData: ProductFormData): Promise<void> => {
    if (!shopId || !user?.id) {
      return Promise.resolve()
    }
    return (async () => {
      const result = await saveSellerProductCatalog(supabase, {
        shopId,
        profileId: user.id,
        productData,
        mode: modalMode,
        editingProductId,
      })
      if (!result.ok) {
        toast({ title: modalMode === "edit" ? "Update failed" : "Add failed", description: result.message, variant: "destructive" })
        return
      }

      await loadProducts()
      if (modalMode === "edit") {
        toast({ title: "Product updated", description: `${productData.name} has been saved.` })
        setEditingProductId(null)
        setModalMode("create")
      } else {
        toast({ title: "Product Added", description: `${productData.name} has been added to your store.` })
      }
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
            <div className="relative aspect-square bg-secondary flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <NoProductImage />
              )}
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
        key={editingProductId ?? "create"}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingProductId(null)
          setModalMode("create")
        }}
        onSubmit={handleAddProduct}
        mode={modalMode}
        uploadUserId={user?.id ?? null}
        shopId={shopId}
        editingProductId={editingProductId}
        shopCategory={shopCategory}
        initialValues={
          modalMode === "edit" && editingProductId
            ? (() => {
                const p = products.find((x) => x.id === editingProductId)
                if (!p) return undefined
                return {
                  name: p.name,
                  description: p.description,
                  basePrice: String(p.price),
                  images: p.images,
                  variants: p.variants.map((v) => ({
                    clientKey: v.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    stock: String(v.stock),
                    variantPrice: v.variantPrice,
                  })),
                }
              })()
            : undefined
        }
      />
    </div>
  )
}
