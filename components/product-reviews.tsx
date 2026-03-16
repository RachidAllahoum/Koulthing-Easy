"use client"

import { Star, ThumbsUp, MoreHorizontal } from "lucide-react"

interface Review {
  id: string
  author: string
  avatar?: string
  rating: number
  date: string
  content: string
  helpful: number
  verified: boolean
}

const placeholderReviews: Review[] = [
  {
    id: "1",
    author: "Sarah M.",
    rating: 5,
    date: "2 days ago",
    content: "Excellent quality! The product exceeded my expectations. Fast delivery and great packaging. Will definitely order again.",
    helpful: 24,
    verified: true,
  },
  {
    id: "2",
    author: "Ahmed K.",
    rating: 4,
    date: "1 week ago",
    content: "Good product overall. The color was slightly different from the pictures but still looks nice. Good value for the price.",
    helpful: 12,
    verified: true,
  },
  {
    id: "3",
    author: "Fatima B.",
    rating: 5,
    date: "2 weeks ago",
    content: "Love it! Perfect fit and the material is very comfortable. The seller was very responsive and helpful.",
    helpful: 18,
    verified: true,
  },
  {
    id: "4",
    author: "Mohamed L.",
    rating: 3,
    date: "3 weeks ago",
    content: "Decent quality but took longer to arrive than expected. Product itself is okay but could be better.",
    helpful: 5,
    verified: false,
  },
]

interface ProductReviewsProps {
  productId: string
  averageRating: number
  totalReviews: number
}

export function ProductReviews({ productId, averageRating, totalReviews }: ProductReviewsProps) {
  const ratingDistribution = [
    { stars: 5, percentage: 65 },
    { stars: 4, percentage: 20 },
    { stars: 3, percentage: 10 },
    { stars: 2, percentage: 3 },
    { stars: 1, percentage: 2 },
  ]

  return (
    <section className="py-8 border-t border-border">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Customer Reviews</h2>

      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {/* Rating Summary */}
        <div className="md:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-foreground mb-2">{averageRating}</div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(averageRating)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Based on {totalReviews} reviews</p>
            </div>

            {/* Rating Bars */}
            <div className="space-y-2">
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-3">{item.stars}</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="md:col-span-2 space-y-4">
          {placeholderReviews.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {review.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{review.author}</span>
                      {review.verified && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                </div>
                <button className="p-1 hover:bg-secondary rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-foreground leading-relaxed mb-3">{review.content}</p>

              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful ({review.helpful})</span>
              </button>
            </div>
          ))}

          {/* Load More */}
          <button className="w-full py-3 text-sm font-medium text-accent hover:text-accent/80 transition-colors">
            Show All Reviews
          </button>
        </div>
      </div>
    </section>
  )
}
