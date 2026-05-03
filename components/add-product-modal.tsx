"use client"

import { useEffect, useState, useRef, useCallback, useId, useMemo } from "react"
import { Plus, Trash2, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { validateProductImageFile, uploadProductImage } from "@/lib/storage-upload"

export interface ProductVariantFormRow {
  clientKey: string
  sku: string
  size: string
  color: string
  stock: string
  /** Empty = use product base price */
  variantPrice: string
}

export interface ProductFormData {
  name: string
  description: string
  basePrice: string
  images: string[]
  variants: ProductVariantFormRow[]
}

type ProductImageSlot =
  | { id: string; kind: "remote"; url: string }
  | { id: string; kind: "pending"; file: File; previewUrl: string }

function newSlotId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}-${Math.random()}`
}

const predefinedColors = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Purple",
  "Pink",
  "Orange",
  "Black",
  "White",
  "Gray",
  "Brown",
  "Navy",
]

const predefinedSizes = ["XS", "S", "M", "L", "XL", "XXL", "One Size"]

function newVariantRow(): ProductVariantFormRow {
  return {
    clientKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random()}`,
    sku: "",
    size: "",
    color: "",
    stock: "0",
    variantPrice: "",
  }
}

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (product: ProductFormData) => void | Promise<void>
  mode?: "create" | "edit"
  initialValues?: Partial<ProductFormData>
  /** Required for image uploads to Supabase `product-images` bucket */
  uploadUserId: string | null
  /** Shop id — required for storage path `{userId}/{shopId}/{productId}/…` */
  shopId: string | null
  /** Product id when editing — used in storage object names; new products use `"new"` until saved */
  editingProductId?: string | null
  /** Shop category from `shops.shop_category` — shown read-only; not editable */
  shopCategory?: string | null
}

const MAX_IMAGES = 4
const MIN_IMAGES = 1

/** Match product rules; GIF still passes validation if chosen via “All files”. */
const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/jpg"

export function AddProductModal({
  isOpen,
  onClose,
  onSubmit,
  mode = "create",
  initialValues,
  uploadUserId,
  shopId,
  editingProductId,
  shopCategory,
}: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    basePrice: "",
    images: [],
    variants: [newVariantRow()],
  })
  const [imageSlots, setImageSlots] = useState<ProductImageSlot[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formDataRef = useRef(formData)
  const imageSlotsRef = useRef<ProductImageSlot[]>([])
  /** True while the native file dialog may be stealing focus (avoid Radix closing the modal). */
  const filePickActiveRef = useRef(false)
  const filePickGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputId = useId()
  const { toast } = useToast()

  const beginFilePickerGuard = useCallback(() => {
    if (filePickGuardTimerRef.current) {
      clearTimeout(filePickGuardTimerRef.current)
      filePickGuardTimerRef.current = null
    }
    filePickActiveRef.current = true
    filePickGuardTimerRef.current = setTimeout(() => {
      filePickActiveRef.current = false
      filePickGuardTimerRef.current = null
    }, 3000)
  }, [])

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    imageSlotsRef.current = imageSlots
  }, [imageSlots])

  useEffect(() => {
    return () => {
      if (filePickGuardTimerRef.current) {
        clearTimeout(filePickGuardTimerRef.current)
        filePickGuardTimerRef.current = null
      }
    }
  }, [])

  const revokePendingPreviews = useCallback((slots: ProductImageSlot[]) => {
    for (const s of slots) {
      if (s.kind === "pending") URL.revokeObjectURL(s.previewUrl)
    }
  }, [])

  /** Clear native file value only when resetting / closing — never inside `onChange` (that fires a second empty change). */
  const clearNativeFileInput = useCallback(() => {
    queueMicrotask(() => {
      const el = fileInputRef.current
      if (el) el.value = ""
    })
  }, [])

  useEffect(() => {
    if (!isOpen) {
      revokePendingPreviews(imageSlotsRef.current)
      clearNativeFileInput()
    }
  }, [isOpen, revokePendingPreviews, clearNativeFileInput])

  useEffect(() => {
    if (!isOpen) return
    if (mode === "edit" && initialValues) {
      const basePriceInit =
        (initialValues as Partial<ProductFormData>).basePrice ||
        (initialValues as { price?: string }).price ||
        ""
      const next: ProductFormData = {
        name: initialValues.name || "",
        description: initialValues.description || "",
        basePrice: basePriceInit,
        images: [],
        variants:
          initialValues.variants && initialValues.variants.length > 0
            ? initialValues.variants.map((v) => ({
                clientKey: v.clientKey,
                sku: v.sku ?? "",
                size: v.size,
                color: v.color,
                stock: v.stock,
                variantPrice: v.variantPrice ?? "",
              }))
            : [newVariantRow()],
      }
      formDataRef.current = next
      setFormData(next)
      const imgs = (initialValues.images ?? []).filter(Boolean)
      const slots: ProductImageSlot[] = imgs.map((url) => ({
        id: newSlotId(),
        kind: "remote" as const,
        url,
      }))
      setImageSlots(slots)
      imageSlotsRef.current = slots
    } else if (mode === "create") {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  /** Dev diagnostics: confirm the file input is not display:none / disabled in a way that blocks the picker. */
  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => {
      const el = fileInputRef.current
      if (!el) {
        console.warn("[AddProductModal] file input ref is null after open (unexpected)")
        return
      }
      const cs = window.getComputedStyle(el)
      console.log("[AddProductModal] file input layout probe", {
        id: el.id,
        disabled: el.disabled,
        multiple: el.multiple,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        offsetWidth: el.offsetWidth,
        offsetHeight: el.offsetHeight,
        inDocument: document.body.contains(el),
      })
    }, 0)
    return () => clearTimeout(t)
  }, [isOpen])

  const resetForm = () => {
    revokePendingPreviews(imageSlotsRef.current)
    const empty: ProductFormData = {
      name: "",
      description: "",
      basePrice: "",
      images: [],
      variants: [newVariantRow()],
    }
    formDataRef.current = empty
    setFormData(empty)
    setImageSlots([])
    imageSlotsRef.current = []
    clearNativeFileInput()
  }

  /** Upload pending slots to Supabase; replace each pending with a remote URL slot (same order). */
  const uploadPendingSlots = useCallback(
    async (slots: ProductImageSlot[]) => {
      if (!uploadUserId?.trim()) {
        throw new Error("You must be signed in to upload images.")
      }
      if (!shopId?.trim()) {
        throw new Error("Shop is required to upload product images.")
      }
      const productIdForPath = editingProductId ?? "new"
      const urls: string[] = []
      const nextSlots: ProductImageSlot[] = []
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!
        if (slot.kind === "remote") {
          urls.push(slot.url)
          nextSlots.push(slot)
        } else {
          const url = await uploadProductImage(uploadUserId, slot.file, {
            shopId,
            productId: productIdForPath,
            slotIndex: i,
          })
          urls.push(url)
          URL.revokeObjectURL(slot.previewUrl)
          nextSlots.push({ id: slot.id, kind: "remote", url })
        }
      }
      return { urls, nextSlots }
    },
    [uploadUserId, shopId, editingProductId],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const slots = imageSlotsRef.current
    if (slots.length < MIN_IMAGES || slots.length > MAX_IMAGES) {
      toast({
        title: "Images required",
        description: `Add between ${MIN_IMAGES} and ${MAX_IMAGES} product images.`,
        variant: "destructive",
      })
      return
    }
    if (!uploadUserId) {
      toast({ title: "Sign in required", description: "You must be signed in to save a product.", variant: "destructive" })
      return
    }
    if (!shopId?.trim()) {
      toast({ title: "Shop required", description: "Your shop must be loaded before saving product images.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    const hasPending = slots.some((s) => s.kind === "pending")
    if (hasPending) {
      console.log("[AddProductModal] save: uploading pending images before submit", {
        pendingCount: slots.filter((s) => s.kind === "pending").length,
        shopId,
        productId: editingProductId ?? "new",
      })
      setUploadingImages(true)
    }

    try {
      const { urls, nextSlots } = await uploadPendingSlots(slots)
      setImageSlots(nextSlots)
      imageSlotsRef.current = nextSlots

      const payload: ProductFormData = {
        ...formDataRef.current,
        images: urls,
      }
      formDataRef.current = payload

      await Promise.resolve(onSubmit(payload))
    } catch (submitErr) {
      console.error("[AddProductModal] submit error", submitErr)
      toast({
        title: hasPending ? "Upload or save failed" : "Save failed",
        description: submitErr instanceof Error ? submitErr.message : "Could not save product",
        variant: "destructive",
      })
      setIsSubmitting(false)
      setUploadingImages(false)
      return
    }

    setUploadingImages(false)
    setIsSubmitting(false)
    if (mode === "create") {
      resetForm()
    }
    onClose()
  }

  const addVariant = () => {
    setFormData((prev) => {
      const next = { ...prev, variants: [...prev.variants, newVariantRow()] }
      formDataRef.current = next
      return next
    })
  }

  const removeVariant = (clientKey: string) => {
    setFormData((prev) => {
      const nextRows = prev.variants.filter((v) => v.clientKey !== clientKey)
      const next = { ...prev, variants: nextRows.length > 0 ? nextRows : [newVariantRow()] }
      formDataRef.current = next
      return next
    })
  }

  const updateVariant = (clientKey: string, patch: Partial<Omit<ProductVariantFormRow, "clientKey">>) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        variants: prev.variants.map((v) => (v.clientKey === clientKey ? { ...v, ...patch } : v)),
      }
      formDataRef.current = next
      return next
    })
  }

  const onFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("onChange triggered, files:", e.target.files)
      const picked: File[] = e.target.files ? Array.from(e.target.files) : []

      if (picked.length === 0) {
        return
      }

      filePickActiveRef.current = false
      if (filePickGuardTimerRef.current) {
        clearTimeout(filePickGuardTimerRef.current)
        filePickGuardTimerRef.current = null
      }

      const current = imageSlotsRef.current
      const remaining = MAX_IMAGES - current.length
      if (remaining <= 0) {
        toast({ title: "Image limit", description: `You can add up to ${MAX_IMAGES} images.`, variant: "destructive" })
        return
      }

      const files = picked.slice(0, remaining)
      const newSlots: ProductImageSlot[] = []

      for (const file of files) {
        const v = validateProductImageFile(file)
        if (!v.ok) {
          toast({ title: "Invalid image", description: v.message, variant: "destructive" })
          continue
        }
        const previewUrl = URL.createObjectURL(file)
        newSlots.push({
          id: newSlotId(),
          kind: "pending",
          file,
          previewUrl,
        })
      }

      if (newSlots.length === 0) {
        toast({
          title: "No valid images",
          description: "None of the selected files could be used. Use JPG, PNG, WEBP, or GIF under 8 MB.",
          variant: "destructive",
        })
        return
      }

      setImageSlots((prev) => {
        const merged = [...prev, ...newSlots]
        imageSlotsRef.current = merged
        return merged
      })
    },
    [toast],
  )

  const stagedImageFiles = useMemo(
    () => imageSlots.flatMap((s) => (s.kind === "pending" ? [s.file] : [])),
    [imageSlots],
  )

  const handleUploadImagesNow = useCallback(async () => {
    const slots = imageSlotsRef.current
    if (!slots.some((s) => s.kind === "pending")) {
      toast({ title: "Nothing to upload", description: "Pick images first, then use this button or save the product.", variant: "default" })
      return
    }
    if (!uploadUserId?.trim()) {
      toast({ title: "Sign in required", description: "You must be signed in to upload images.", variant: "destructive" })
      return
    }
    if (!shopId?.trim()) {
      toast({ title: "Shop required", description: "Your shop must be loaded before uploading images.", variant: "destructive" })
      return
    }
    setUploadingImages(true)
    try {
      const { nextSlots } = await uploadPendingSlots(slots)
      setImageSlots(nextSlots)
      imageSlotsRef.current = nextSlots
      clearNativeFileInput()
      toast({
        title: "Images uploaded",
        description: "Files are in storage. Save the product to write these URLs to the catalog.",
      })
    } catch (err) {
      console.error("[AddProductModal] upload images failed", err)
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload images",
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
    }
  }, [uploadUserId, shopId, uploadPendingSlots, clearNativeFileInput, toast])

  const debugTriggerFilePicker = useCallback(() => {
    console.log("[AddProductModal] debug: manual ref.click() on file input")
    if (!uploadUserId) {
      toast({ title: "Sign in required", description: "You must be signed in to upload images.", variant: "destructive" })
      return
    }
    if (!shopId?.trim()) {
      toast({ title: "Shop required", description: "Your shop must be loaded before adding images.", variant: "destructive" })
      return
    }
    if (isSubmitting || uploadingImages) return
    beginFilePickerGuard()
    window.setTimeout(() => {
      fileInputRef.current?.click()
    }, 0)
  }, [uploadUserId, shopId, isSubmitting, uploadingImages, beginFilePickerGuard, toast])

  const guardDialogCloseFromFileUi = useCallback(
    (evt: Event) => {
      if (filePickActiveRef.current || uploadingImages || isSubmitting) {
        evt.preventDefault()
      }
    },
    [uploadingImages, isSubmitting],
  )

  const removeImageSlot = (id: string) => {
    setImageSlots((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target?.kind === "pending") URL.revokeObjectURL(target.previewUrl)
      const next = prev.filter((s) => s.id !== id)
      imageSlotsRef.current = next
      return next
    })
  }

  const categoryLabel = (shopCategory ?? "").trim() || "—"

  const variantsValid = formData.variants.every((v) => {
    const q = parseInt(v.stock, 10)
    const skuOk = v.sku.trim().length > 0
    const vp = (v.variantPrice ?? "").trim()
    const vpOk = vp === "" || (Number.isFinite(parseFloat(vp)) && parseFloat(vp) >= 0)
    return Number.isFinite(q) && q >= 0 && skuOk && vpOk
  })

  const imageCountOk = imageSlots.length >= MIN_IMAGES && imageSlots.length <= MAX_IMAGES

  const canSubmit =
    formData.name.trim() &&
    formData.description.trim() &&
    formData.basePrice !== "" &&
    Number.isFinite(parseFloat(formData.basePrice)) &&
    formData.variants.length > 0 &&
    variantsValid &&
    imageCountOk

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={guardDialogCloseFromFileUi}
        onPointerDownOutside={guardDialogCloseFromFileUi}
        onFocusOutside={guardDialogCloseFromFileUi}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{mode === "edit" ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update your product details below." : "Fill in the details below to add a new product to your store."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[100px] rounded-xl resize-none"
              required
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Category (from your shop)</span>
            <p className="font-medium text-foreground mt-0.5">{categoryLabel}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Base price (DZD) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              className="h-11 rounded-xl"
              required
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Variant rows can set an optional price override; when left blank, buyers see this base price.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">
                Variants <span className="text-destructive">*</span>
              </label>
              <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1" onClick={addVariant}>
                <Plus className="w-4 h-4" />
                Add variant
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              One row per sellable variant (unique SKU). Stock is applied as an initial inbound movement after save.
            </p>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                <span className="col-span-2">SKU</span>
                <span className="col-span-2">Size</span>
                <span className="col-span-2">Color</span>
                <span className="col-span-2">Stock</span>
                <span className="col-span-3">Price (opt.)</span>
                <span className="col-span-1 text-right"> </span>
              </div>
              <ul className="divide-y divide-border">
                {formData.variants.map((row) => (
                  <li key={row.clientKey} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center">
                    <div className="col-span-2">
                      <Input
                        className="h-9 rounded-lg text-sm font-mono"
                        placeholder="SKU"
                        value={row.sku}
                        onChange={(e) => updateVariant(row.clientKey, { sku: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        className="h-9 rounded-lg text-sm"
                        list="seller-product-sizes"
                        placeholder="Size"
                        value={row.size}
                        onChange={(e) => updateVariant(row.clientKey, { size: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        className="h-9 rounded-lg text-sm"
                        list="seller-product-colors"
                        placeholder="Color"
                        value={row.color}
                        onChange={(e) => updateVariant(row.clientKey, { color: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        className="h-9 rounded-lg text-sm"
                        value={row.stock}
                        onChange={(e) => updateVariant(row.clientKey, { stock: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9 rounded-lg text-sm"
                        placeholder="Base price"
                        value={row.variantPrice}
                        onChange={(e) => updateVariant(row.clientKey, { variantPrice: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVariant(row.clientKey)}
                        aria-label="Remove variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <datalist id="seller-product-sizes">
              {predefinedSizes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <datalist id="seller-product-colors">
              {predefinedColors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product images <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Add {MIN_IMAGES}–{MAX_IMAGES} images (JPEG, PNG, or WEBP, max 8 MB each). Previews appear after you pick files. Use{" "}
              <span className="font-medium text-foreground">Upload images</span> or <span className="font-medium text-foreground">Save</span> to send
              them to storage.
            </p>
            {stagedImageFiles.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg gap-2"
                  disabled={isSubmitting || uploadingImages}
                  onClick={() => void handleUploadImagesNow()}
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>Upload images ({stagedImageFiles.length})</>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">Staged locally until you upload or save</span>
              </div>
            ) : null}
            <div className="grid grid-cols-4 gap-3">
              {imageSlots.map((slot) => (
                <div key={slot.id} className="relative aspect-square rounded-xl bg-secondary overflow-hidden group border border-border">
                  <img
                    src={slot.kind === "remote" ? slot.url : slot.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {slot.kind === "pending" && (
                    <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Preview
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImageSlot(slot.id)}
                    disabled={isSubmitting || uploadingImages}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {imageSlots.length < MAX_IMAGES && (
                <div
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary hover:bg-primary/5 ${
                    isSubmitting || uploadingImages || !uploadUserId || !shopId?.trim() ? "opacity-60" : ""
                  }`}
                >
                  {/*
                    Full-cell transparent file input (clicks hit the native control).
                    Avoid sr-only + label: hit-testing can miss the input inside modals.
                  */}
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    multiple
                    disabled={isSubmitting || uploadingImages || !uploadUserId || !shopId?.trim()}
                    onPointerDown={() => {
                      if (isSubmitting || uploadingImages || !uploadUserId || !shopId?.trim()) return
                      beginFilePickerGuard()
                    }}
                    onChange={onFilesSelected}
                    className="absolute inset-0 z-20 h-full w-full cursor-pointer border-0 p-0 opacity-0"
                    style={{ fontSize: 0 }}
                    aria-label="Choose product images"
                  />
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" aria-hidden />
                    <span className="text-xs text-muted-foreground text-center px-1">Choose images</span>
                  </div>
                </div>
              )}
            </div>
            {process.env.NODE_ENV === "development" ? (
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={debugTriggerFilePicker}>
                  Debug: open picker (ref.click)
                </Button>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground mt-2">
              {imageSlots.length}/{MAX_IMAGES} selected
              {!imageCountOk ? (
                <span className="text-destructive"> — need at least {MIN_IMAGES} image{MIN_IMAGES > 1 ? "s" : ""}</span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl" disabled={isSubmitting || uploadingImages}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl gap-2" disabled={isSubmitting || uploadingImages || !canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadingImages ? "Uploading images…" : "Saving…"}
                </>
              ) : (
                <>
                  {mode === "edit" ? "Save Changes" : "Add Product"}
                  <Plus className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
