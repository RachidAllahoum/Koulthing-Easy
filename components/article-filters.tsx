"use client"

import { SlidersHorizontal, ChevronDown, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ProductFiltersState {
  search: string
  category: string
  minPrice: string
  maxPrice: string
  size: string
  color: string
  sort: "newest" | "price-asc" | "price-desc" | "bestselling"
}

interface ProductFilterOptions {
  categories: string[]
  sizes: string[]
  colors: string[]
}

interface ArticleFiltersProps {
  filters: ProductFiltersState
  options: ProductFilterOptions
  foundCount: number
  onFiltersChange: (next: ProductFiltersState) => void
  onClear: () => void
}

const sortOptions: { label: string; value: ProductFiltersState["sort"] }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Best Selling", value: "bestselling" },
]

export function ArticleFilters({ filters, options, foundCount, onFiltersChange, onClear }: ArticleFiltersProps) {
  const activeFiltersCount = [
    filters.search.trim() !== "" ? 1 : 0,
    filters.category !== "all" ? 1 : 0,
    filters.minPrice.trim() !== "" || filters.maxPrice.trim() !== "" ? 1 : 0,
    filters.size !== "all" ? 1 : 0,
    filters.color !== "all" ? 1 : 0,
    filters.sort !== "newest" ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search by product name..."
            className="w-full bg-secondary border border-border rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button variant="outline" size="sm" className="gap-2 rounded-full" disabled>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        <div className="relative">
          <select
            value={filters.sort}
            onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value as ProductFiltersState["sort"] })}
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

        {activeFiltersCount > 0 && (
          <button onClick={onClear} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onFiltersChange({ ...filters, category: "all" })}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filters.category === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
        >
          All
        </button>
        {options.categories.map((category) => (
          <button
            key={category}
            onClick={() => onFiltersChange({ ...filters, category })}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filters.category === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="p-4 bg-card border border-border rounded-xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Min price (DZD)</label>
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max price (DZD)</label>
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Any"
          />
        </div>

        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Size</label>
          <select
            value={filters.size}
            onChange={(e) => onFiltersChange({ ...filters, size: e.target.value })}
            className="w-full appearance-none bg-secondary border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All sizes</option>
            {options.sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-[2.1rem] w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Color</label>
          <select
            value={filters.color}
            onChange={(e) => onFiltersChange({ ...filters, color: e.target.value })}
            className="w-full appearance-none bg-secondary border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All colors</option>
            {options.colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-[2.1rem] w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{foundCount}</span> products found
          </p>
        </div>
      </div>
    </div>
  )
}
