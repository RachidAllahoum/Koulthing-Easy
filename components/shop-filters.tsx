"use client"

import { useState, useEffect } from "react"
import { SlidersHorizontal, ChevronDown, X, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

const categories = [
  "All",
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Sports",
  "Handmade",
  "Food",
  "Services",
]

const locations = [
  { label: "All Locations", value: "all" },
  { label: "Algiers", value: "algiers" },
  { label: "Oran", value: "oran" },
  { label: "Constantine", value: "constantine" },
  { label: "Annaba", value: "annaba" },
  { label: "Blida", value: "blida" },
]

const sortOptions = [
  { label: "Recommended", value: "recommended" },
  { label: "Most Popular", value: "popular" },
  { label: "Highest Rated", value: "rating" },
  { label: "Most Followers", value: "followers" },
  { label: "Newest", value: "newest" },
]

const ratingFilters = [
  { label: "All Ratings", value: "all" },
  { label: "4.5+ Stars", value: "4.5" },
  { label: "4+ Stars", value: "4" },
  { label: "3.5+ Stars", value: "3.5" },
]

interface ShopFiltersProps {
  onFiltersChange?: (filters: { category: string; location: string; rating: string; sort: string }) => void
}

export function ShopFilters({ onFiltersChange }: ShopFiltersProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedSort, setSelectedSort] = useState("recommended")
  const [selectedRating, setSelectedRating] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = [
    selectedCategory !== "All" ? 1 : 0,
    selectedLocation !== "all" ? 1 : 0,
    selectedSort !== "recommended" ? 1 : 0,
    selectedRating !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.({
      category: selectedCategory,
      location: selectedLocation,
      rating: selectedRating,
      sort: selectedSort,
    })
  }, [selectedCategory, selectedLocation, selectedSort, selectedRating, onFiltersChange])

  const clearFilters = () => {
    setSelectedCategory("All")
    setSelectedLocation("all")
    setSelectedSort("recommended")
    setSelectedRating("all")
  }

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2 rounded-full"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Location Dropdown */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="appearance-none bg-secondary border border-border rounded-full pl-9 pr-8 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {locations.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Rating Dropdown */}
        <div className="relative">
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="appearance-none bg-secondary border border-border rounded-full px-4 py-2 pr-8 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ratingFilters.map((rating) => (
              <option key={rating.value} value={rating.value}>
                {rating.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative ml-auto">
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="appearance-none bg-secondary border border-border rounded-full px-4 py-2 pr-8 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-card border border-border rounded-xl space-y-4">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Location</h4>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.value}
                  onClick={() => setSelectedLocation(loc.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedLocation === loc.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Minimum Rating</h4>
            <div className="flex flex-wrap gap-2">
              {ratingFilters.map((rating) => (
                <button
                  key={rating.value}
                  onClick={() => setSelectedRating(rating.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedRating === rating.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rating.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Sort By</h4>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSort(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedSort === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
