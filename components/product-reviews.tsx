"use client"

import { Star } from "lucide-react"

interface ProductReviewsProps {
  productId: string
  averageRating: number
  totalReviews: number
}

export function ProductReviews({ averageRating, totalReviews }: ProductReviewsProps) {
  const hasReviews = totalReviews > 0

  return (
    <section className="py-8 border-t border-border">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Customer Reviews</h2>

      {hasReviews ? (
        <div className="bg-card border border-border rounded-xl p-6 max-w-md">
          <div className="text-5xl font-bold text-foreground mb-2">{averageRating}</div>
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.floor(averageRating) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Based on {totalReviews} reviews</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share feedback after purchase.</p>
      )}
    </section>
  )
}
