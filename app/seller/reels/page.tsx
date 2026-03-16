"use client"

import { useState } from "react"
import { Search, Plus, Edit, Trash2, Eye, Play, Heart, MessageCircle, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AddReelModal } from "@/components/add-reel-modal"
import { useToast } from "@/hooks/use-toast"

const initialReels = [
  {
    id: "1",
    title: "Summer Collection Preview",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=533&fit=crop",
    views: 12500,
    likes: 1234,
    comments: 89,
    status: "published",
    createdAt: "2024-03-10",
  },
  {
    id: "2",
    title: "How to Style Our Best Seller",
    thumbnail: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=533&fit=crop",
    views: 8900,
    likes: 856,
    comments: 45,
    status: "published",
    createdAt: "2024-03-08",
  },
  {
    id: "3",
    title: "Behind the Scenes",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=533&fit=crop",
    views: 15600,
    likes: 2103,
    comments: 156,
    status: "published",
    createdAt: "2024-03-05",
  },
  {
    id: "4",
    title: "New Arrivals Unboxing",
    thumbnail: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=533&fit=crop",
    views: 6700,
    likes: 945,
    comments: 67,
    status: "draft",
    createdAt: "2024-03-03",
  },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    published: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-700",
    processing: "bg-blue-100 text-blue-700",
  }

  const labels = {
    published: "Published",
    draft: "Draft",
    processing: "Processing",
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

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

export default function SellerReelsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [reels, setReels] = useState(initialReels)
  const { toast } = useToast()

  const filteredReels = reels.filter((reel) =>
    reel.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddReel = (reelData: {
    title: string
    description: string
    productId: string
    thumbnail: string
    videoUrl: string
  }) => {
    const newReel = {
      id: `${Date.now()}`,
      title: reelData.title,
      thumbnail: reelData.thumbnail || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=533&fit=crop",
      views: 0,
      likes: 0,
      comments: 0,
      status: "processing",
      createdAt: new Date().toISOString().split("T")[0],
    }
    setReels([newReel, ...reels])
    toast({
      title: "Reel Uploaded",
      description: `${reelData.title} is being processed and will appear in the videos section soon.`,
    })
  }

  const handleDeleteReel = (id: string) => {
    setReels(reels.filter((r) => r.id !== id))
    toast({
      title: "Reel Deleted",
      description: "The reel has been removed.",
    })
  }

  const totalViews = reels.reduce((sum, r) => sum + r.views, 0)
  const totalLikes = reels.reduce((sum, r) => sum + r.likes, 0)
  const publishedCount = reels.filter((r) => r.status === "published").length

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reels</h1>
          <p className="text-muted-foreground">Create and manage your short videos</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Upload Reel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Reels</p>
          <p className="text-2xl font-bold text-foreground">{reels.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Views</p>
          <p className="text-2xl font-bold text-foreground">{formatNumber(totalViews)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Likes</p>
          <p className="text-2xl font-bold text-foreground">{formatNumber(totalLikes)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search reels..."
            className="pl-10 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Reels Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredReels.map((reel) => (
          <div
            key={reel.id}
            className="bg-card border border-border rounded-xl overflow-hidden group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[9/16] bg-secondary">
              <img
                src={reel.thumbnail}
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-12 h-12 text-white/80 drop-shadow-lg" />
              </div>
              <div className="absolute top-3 right-3">
                <StatusBadge status={reel.status} />
              </div>
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="rounded-lg"
                  onClick={() => handleDeleteReel(reel.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Stats overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center gap-3 text-white text-xs">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{formatNumber(reel.views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{formatNumber(reel.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{reel.comments}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-medium text-foreground line-clamp-1 mb-1">{reel.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{reel.createdAt}</span>
                <button className="p-1 hover:bg-secondary rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReels.length === 0 && (
        <div className="text-center py-12">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-1">No reels found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your first reel to engage with customers
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Upload Reel
          </Button>
        </div>
      )}

      {/* Add Reel Modal */}
      <AddReelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddReel}
      />
    </div>
  )
}
