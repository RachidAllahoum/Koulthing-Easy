"use client"

import { useState } from "react"
import { X, Upload, Video, Link as LinkIcon } from "lucide-react"
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

interface ReelFormData {
  title: string
  description: string
  productId: string
  thumbnail: string
  videoUrl: string
}

interface Product {
  id: string
  name: string
}

interface AddReelModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reel: ReelFormData) => void
  products?: Product[]
}

export function AddReelModal({ isOpen, onClose, onSubmit, products = [] }: AddReelModalProps) {
  const [formData, setFormData] = useState<ReelFormData>({
    title: "",
    description: "",
    productId: "",
    thumbnail: "",
    videoUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)

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
      title: "",
      description: "",
      productId: "",
      thumbnail: "",
      videoUrl: "",
    })
    setUploadedVideo(null)
  }

  const handleVideoUpload = () => {
    // Simulate video upload - in a real app, this would upload to a server
    const mockVideoUrl = `https://placehold.co/360x640/png?text=Reel+Video`
    setUploadedVideo(mockVideoUrl)
    setFormData({
      ...formData,
      videoUrl: mockVideoUrl,
      thumbnail: mockVideoUrl,
    })
  }

  const handleThumbnailUpload = () => {
    // Simulate thumbnail upload
    const mockThumbnailUrl = `https://placehold.co/360x640/png?text=Thumbnail`
    setFormData({
      ...formData,
      thumbnail: mockThumbnailUrl,
    })
  }

  // Mock products for demo
  const mockProducts: Product[] = products.length > 0 ? products : [
    { id: "1", name: "Summer Dress with Floral Pattern" },
    { id: "2", name: "Leather Wallet Premium" },
    { id: "3", name: "Wireless Bluetooth Earbuds" },
    { id: "4", name: "Handmade Ceramic Vase Set" },
    { id: "5", name: "Vintage Watch Classic" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload New Reel</DialogTitle>
          <DialogDescription>
            Upload a short video to showcase your products and engage with customers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Video <span className="text-destructive">*</span>
            </label>
            {!uploadedVideo ? (
              <button
                type="button"
                onClick={handleVideoUpload}
                className="w-full aspect-[9/16] max-h-[300px] rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                  <Video className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Upload Video</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, MOV up to 100MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 9:16 aspect ratio
                  </p>
                </div>
              </button>
            ) : (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-xl bg-secondary overflow-hidden">
                <img
                  src={uploadedVideo}
                  alt="Video preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-card/90 flex items-center justify-center">
                    <Video className="w-6 h-6 text-foreground" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedVideo(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          {uploadedVideo && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Thumbnail (Optional)
              </label>
              <button
                type="button"
                onClick={handleThumbnailUpload}
                className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload custom thumbnail</span>
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Give your reel a catchy title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <Textarea
              placeholder="What's this reel about?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          {/* Link to Product */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Link to Product (Optional)
            </label>
            <Select
              value={formData.productId}
              onValueChange={(value) => setFormData({ ...formData, productId: value })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a product to feature" />
              </SelectTrigger>
              <SelectContent>
                {mockProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Link a product to show in your reel
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
              disabled={isSubmitting || !uploadedVideo || !formData.title}
            >
              {isSubmitting ? "Uploading..." : "Upload Reel"}
              {!isSubmitting && <Upload className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
