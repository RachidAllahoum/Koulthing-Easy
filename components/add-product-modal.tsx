"use client"

import { useState } from "react"
import { X, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProductFormData {
  name: string
  description: string
  price: string
  category: string
  colors: { name: string; value: string }[]
  sizes: string[]
  quantity: string
  images: string[]
}

const categories = [
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Sports",
  "Accessories",
  "Books",
  "Food & Beverages",
  "Other",
]

const predefinedColors = [
  { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F97316" },
  { name: "Black", value: "#171717" },
  { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#6B7280" },
  { name: "Brown", value: "#92400E" },
  { name: "Navy", value: "#1E3A5F" },
]

const predefinedSizes = ["XS", "S", "M", "L", "XL", "XXL", "One Size"]

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (product: ProductFormData) => void
}

export function AddProductModal({ isOpen, onClose, onSubmit }: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
    category: "",
    colors: [],
    sizes: [],
    quantity: "",
    images: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customColor, setCustomColor] = useState({ name: "", value: "#000000" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    onSubmit(formData)
    setIsSubmitting(false)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      colors: [],
      sizes: [],
      quantity: "",
      images: [],
    })
  }

  const toggleColor = (color: { name: string; value: string }) => {
    const exists = formData.colors.find((c) => c.name === color.name)
    if (exists) {
      setFormData({
        ...formData,
        colors: formData.colors.filter((c) => c.name !== color.name),
      })
    } else {
      setFormData({
        ...formData,
        colors: [...formData.colors, color],
      })
    }
  }

  const addCustomColor = () => {
    if (customColor.name && !formData.colors.find((c) => c.name === customColor.name)) {
      setFormData({
        ...formData,
        colors: [...formData.colors, customColor],
      })
      setCustomColor({ name: "", value: "#000000" })
    }
  }

  const toggleSize = (size: string) => {
    if (formData.sizes.includes(size)) {
      setFormData({
        ...formData,
        sizes: formData.sizes.filter((s) => s !== size),
      })
    } else {
      setFormData({
        ...formData,
        sizes: [...formData.sizes, size],
      })
    }
  }

  const handleImageUpload = () => {
    // Simulate image upload - in a real app, this would upload to a server
    const mockImageUrl = `https://placehold.co/400x400/png?text=Product+${formData.images.length + 1}`
    setFormData({
      ...formData,
      images: [...formData.images, mockImageUrl],
    })
  }

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new product to your store.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[100px] rounded-xl resize-none"
              required
            />
          </div>

          {/* Price and Category */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Price (DZD) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quantity / Stock <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="How many items in stock?"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Color Options
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {predefinedColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.colors.find((c) => c.name === color.name)
                      ? "border-primary scale-110 ring-2 ring-primary/30"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            
            {/* Custom Color */}
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={customColor.value}
                onChange={(e) => setCustomColor({ ...customColor, value: e.target.value })}
                className="w-12 h-10 p-1 rounded-lg cursor-pointer"
              />
              <Input
                placeholder="Color name"
                value={customColor.name}
                onChange={(e) => setCustomColor({ ...customColor, name: e.target.value })}
                className="h-10 rounded-lg flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomColor}
                className="rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected Colors */}
            {formData.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.colors.map((color) => (
                  <span
                    key={color.name}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-full text-xs"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                    <button
                      type="button"
                      onClick={() => toggleColor(color)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Size Options
            </label>
            <div className="flex flex-wrap gap-2">
              {predefinedSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`min-w-[48px] h-9 px-3 rounded-lg border text-sm font-medium transition-all ${
                    formData.sizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:border-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Images
            </label>
            <div className="grid grid-cols-4 gap-3">
              {formData.images.map((img, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl bg-secondary overflow-hidden group"
                >
                  <img
                    src={img}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.images.length < 4 && (
                <button
                  type="button"
                  onClick={handleImageUpload}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Upload up to 4 images. First image will be the cover.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl gap-2"
              disabled={isSubmitting || !formData.name || !formData.price || !formData.category || !formData.quantity}
            >
              {isSubmitting ? "Adding..." : "Add Product"}
              {!isSubmitting && <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
