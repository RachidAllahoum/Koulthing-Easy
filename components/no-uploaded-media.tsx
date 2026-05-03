/** Shown when a product has no uploaded images (no external placeholder URLs). */
export function NoProductImage({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-full w-full min-h-[3rem] items-center justify-center p-2 ${className ?? ""}`}
    >
      <span className="text-xs text-muted-foreground text-center leading-snug">No image</span>
    </div>
  )
}
