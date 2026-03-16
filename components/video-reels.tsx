"use client"

import { Play, Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { useReels } from "@/lib/reels-context"

export function VideoReels() {
  const { reels } = useReels()
  const [activeReel, setActiveReel] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(true)

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Featured Reels</h2>
        <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
          View All
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {reels.map((reel) => (
          <div
            key={reel.id}
            className="relative flex-shrink-0 w-40 md:w-48 aspect-[9/16] rounded-2xl overflow-hidden bg-secondary cursor-pointer group"
            onMouseEnter={() => setActiveReel(reel.id)}
            onMouseLeave={() => setActiveReel(null)}
          >
            {/* Background Image */}
            <Image
              src={reel.thumbnail}
              alt={reel.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 160px, 192px"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
              <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-foreground/50 ml-1" />
              </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />

            {/* Play Button on Hover */}
            {activeReel === reel.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-card/90 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-foreground ml-1" />
                </div>
              </div>
            )}

            {/* Mute Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMuted(!isMuted)
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-card" />
              ) : (
                <Volume2 className="w-4 h-4 text-card" />
              )}
            </button>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs font-medium text-card/80 mb-1">{reel.shopName}</p>
              <p className="text-sm font-semibold text-card line-clamp-2 mb-2">
                {reel.title}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-card/80" />
                  <span className="text-xs text-card/80">{reel.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-card/80" />
                  <span className="text-xs text-card/80">{reel.comments}</span>
                </div>
              </div>
            </div>

            {/* Side Actions */}
            <div className="absolute right-2 bottom-20 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-9 h-9 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Heart className="w-4 h-4 text-foreground" />
              </button>
              <button className="w-9 h-9 rounded-full bg-card/90 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Share2 className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
