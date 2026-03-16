"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const placeholderImages = images.length > 0 ? images : [
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=600&fit=crop",
  ]

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? placeholderImages.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setActiveIndex((prev) => (prev === placeholderImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary group">
        {/* Product Image */}
        <img
          src={placeholderImages[activeIndex]}
          alt={`${productName} - Image ${activeIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        {/* Zoom Button */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground">
          {activeIndex + 1} / {placeholderImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {placeholderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-secondary transition-all ${
              activeIndex === index
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <img
              src={placeholderImages[index]}
              alt={`${productName} - Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative w-full max-w-4xl aspect-square m-4">
            <img
              src={placeholderImages[activeIndex]}
              alt={`${productName} - Zoomed`}
              className="absolute inset-0 w-full h-full object-contain rounded-2xl"
            />
          </div>
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-card flex items-center justify-center"
          >
            <span className="text-xl text-foreground">&times;</span>
          </button>
        </div>
      )}
    </div>
  )
}
