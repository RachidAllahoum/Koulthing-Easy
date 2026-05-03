"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"

interface ProductGalleryProps {
  images: string[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  const list = images.filter(Boolean)
  const hasImages = list.length > 0
  const safeIndex = hasImages ? Math.min(activeIndex, list.length - 1) : 0

  useEffect(() => {
    if (!list.length) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((i) => Math.min(i, list.length - 1))
  }, [list.length])

  const goToPrevious = () => {
    if (!hasImages) return
    setActiveIndex((prev) => (prev === 0 ? list.length - 1 : prev - 1))
  }

  const goToNext = () => {
    if (!hasImages) return
    setActiveIndex((prev) => (prev === list.length - 1 ? 0 : prev + 1))
  }

  if (!hasImages) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary group flex items-center justify-center">
        <img
          src={list[safeIndex]}
          alt={`${productName} - Image ${safeIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
          aria-label="Zoom image"
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm text-sm font-medium text-foreground">
          {safeIndex + 1} / {list.length}
        </div>
      </div>

      {list.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {list.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-secondary transition-all ${
                safeIndex === index
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <img src={src} alt={`${productName} - Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
          onKeyDown={(e) => e.key === "Escape" && setIsZoomed(false)}
          role="presentation"
        >
          <div className="relative w-full max-w-4xl aspect-square m-4">
            <img
              src={list[safeIndex]}
              alt={`${productName} - Zoomed`}
              className="absolute inset-0 w-full h-full object-contain rounded-2xl"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-card flex items-center justify-center"
            aria-label="Close zoom"
          >
            <span className="text-xl text-foreground">&times;</span>
          </button>
        </div>
      )}
    </div>
  )
}
