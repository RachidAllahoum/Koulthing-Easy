"use client"

import { useState, useRef } from "react"
import { X, Upload, Video } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { uploadPublicFile, uploadPublicImage } from "@/lib/storage-upload"

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
  uploadUserId: string | null
}

export function AddReelModal({ isOpen, onClose, onSubmit, products = [], uploadUserId }: AddReelModalProps) {
  const [formData, setFormData] = useState<ReelFormData>({
    title: "",
    description: "",
    productId: "",
    thumbnail: "",
    videoUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      productId: "",
      thumbnail: "",
      videoUrl: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.videoUrl.trim()) {
      toast({ title: "Video required", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      onSubmit({
        ...formData,
        videoUrl: formData.videoUrl,
        thumbnail: formData.thumbnail || formData.videoUrl,
      })
      resetForm()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const onVideoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !uploadUserId) {
      if (!uploadUserId) {
        toast({ title: "Sign in required", variant: "destructive" })
      }
      return
    }
    setUploading(true)
    try {
      const url = await uploadPublicFile("reel-media", uploadUserId, file)
      setFormData((prev) => ({
        ...prev,
        videoUrl: url,
        thumbnail: prev.thumbnail || "",
      }))
      toast({ title: "Video uploaded" })
    } catch (err) {
      toast({
        title: "Video upload failed",
        description: err instanceof Error ? err.message : "Upload error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const onThumbnailPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !uploadUserId) return
    setUploading(true)
    try {
      const url = await uploadPublicImage("product-images", uploadUserId, file)
      setFormData((prev) => ({ ...prev, thumbnail: url }))
      toast({ title: "Thumbnail uploaded" })
    } catch (err) {
      toast({
        title: "Thumbnail upload failed",
        description: err instanceof Error ? err.message : "Upload error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload New Reel</DialogTitle>
          <DialogDescription>
            Upload a short video (stored in Supabase). Optional custom thumbnail image.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => void onVideoPicked(e)}
        />
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onThumbnailPicked(e)}
        />

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Video <span className="text-destructive">*</span>
            </label>
            {!formData.videoUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => videoInputRef.current?.click()}
                className="w-full aspect-[9/16] max-h-[300px] rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 disabled:opacity-50"
              >
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                  <Video className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Choose video file</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM</p>
                </div>
              </button>
            ) : (
              <div className="relative aspect-[9/16] max-h-[300px] rounded-xl bg-secondary overflow-hidden">
                <video src={formData.videoUrl} className="w-full h-full object-cover" muted playsInline controls />
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, videoUrl: "", thumbnail: "" }))}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {formData.videoUrl && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Custom thumbnail (optional)</label>
              <button
                type="button"
                disabled={uploading}
                onClick={() => thumbInputRef.current?.click()}
                className="w-full min-h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formData.thumbnail ? "Replace thumbnail" : "Upload thumbnail image"}
                </span>
              </button>
              {formData.thumbnail ? (
                <img src={formData.thumbnail} alt="" className="mt-2 h-20 w-auto rounded-lg object-cover border border-border" />
              ) : null}
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <Textarea
              placeholder="What's this reel about?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Link to product (optional)</label>
            <Select
              value={formData.productId || undefined}
              onValueChange={(value) => setFormData({ ...formData, productId: value })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">Add products first to link them here.</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl gap-2"
              disabled={isSubmitting || uploading || !formData.videoUrl.trim() || !formData.title.trim()}
            >
              {isSubmitting ? "Saving..." : "Save reel"}
              {!isSubmitting && <Upload className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
