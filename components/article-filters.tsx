"use client"

import { useState, useEffect } from "react"
import { SlidersHorizontal, ChevronDown, X } from "lucide-react"
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
]

const priceRanges = [
  { label: "All Prices", value: "all" },
  { label: "Under 1000 DZD", value: "0-1000" },
  { label: "1000 - 5000 DZD", value: "1000-5000" },
  { label: "5000 - 10000 DZD", value: "5000-10000" },
  { label: "Over 10000 DZD", value: "10000+" },
]

const sortOptions = [
  { label: "Recommended", value: "recommended" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Best Selling", value: "bestselling" },
]

interface ArticleFiltersProps {
  onFiltersChange?: (filters: { category: string; price: string; sort: string }) => void
}

export function ArticleFilters({ onFiltersChange }: ArticleFiltersProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedPrice, setSelectedPrice] = useState("all")
  const [selectedSort, setSelectedSort] = useState("recommended")
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = [
    selectedCategory !== "All" ? 1 : 0,
    selectedPrice !== "all" ? 1 : 0,
    selectedSort !== "recommended" ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.({
      category: selectedCategory,
      price: selectedPrice,
      sort: selectedSort,
    })
  }, [selectedCategory, selectedPrice, selectedSort, onFiltersChange])

  const clearFilters = () => {
    setSelectedCategory("All")
    setSelectedPrice("all")
    setSelectedSort("recommended")
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

        {/* Price Dropdown */}
        <div className="relative">
          <select
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value)}
            className="appearance-none bg-secondary border border-border rounded-full px-4 py-2 pr-8 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {priceRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
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
            <h4 className="text-sm font-medium text-foreground mb-2">Price Range</h4>
            <div className="flex flex-wrap gap-2">
              {priceRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setSelectedPrice(range.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedPrice === range.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.label}
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
