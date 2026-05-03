import { supabase } from "@/lib/supabase-client"

export type PublicMediaBucket = "shop-logos" | "product-images" | "shop-covers" | "reel-media"
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

const MIME_ALIASES: Record<string, string> = {
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

/** When the browser leaves `file.type` empty (common on Windows), infer from extension. */
export function inferImageMimeFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (!ext) return null
  return EXT_TO_MIME[ext] ?? null
}

function effectiveImageMime(file: File): string {
  const raw = (file.type || "").trim().toLowerCase()
  if (raw && raw !== "application/octet-stream") {
    return MIME_ALIASES[raw] ?? raw
  }
  return inferImageMimeFromFilename(file.name) ?? ""
}

function safeExt(filename: string, fallback: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext
  return fallback
}

function formatStorageError(err: unknown): Error {
  if (err instanceof Error) return err
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return new Error((err as { message: string }).message)
  }
  return new Error(typeof err === "string" ? err : JSON.stringify(err))
}

/** Client-side check before staging or upload. */
export function validateProductImageFile(file: File): { ok: true } | { ok: false; message: string } {
  const mime = effectiveImageMime(file)
  if (!IMAGE_TYPES.has(mime)) {
    return { ok: false, message: "Unsupported file type. Use JPG, PNG, WEBP, or GIF." }
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, message: "File too large. Max size is 8 MB per image." }
  }
  return { ok: true }
}

/** Ensures the JWT user matches the first path segment (RLS expects auth.uid() as folder). */
async function assertStoragePathMatchesAuthUser(pathUserIdPrefix: string) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error("You must be signed in to upload files. (No valid session for Storage.)")
  }
  if (data.user.id !== pathUserIdPrefix) {
    throw new Error(
      "Upload path does not match your account. Sign out and sign in again, or refresh the page.",
    )
  }
}

async function putFileGetPublicUrl(bucket: PublicMediaBucket, path: string, file: File): Promise<string> {
  const firstSeg = path.split("/")[0] ?? ""
  if (firstSeg) await assertStoragePathMatchesAuthUser(firstSeg)

  const mime = effectiveImageMime(file)
  const contentType = mime || file.type || "application/octet-stream"
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType,
  })
  if (error) {
    console.error("[storage-upload] upload failed", { bucket, path, error })
    throw formatStorageError(error)
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Upload to a public bucket; path is `{userId}/{unique}.{ext}` */
export async function uploadPublicFile(bucket: PublicMediaBucket, userId: string, file: File): Promise<string> {
  if (!userId?.trim()) {
    throw new Error("You must be signed in to upload files.")
  }
  if (!file) {
    throw new Error("No file selected.")
  }
  const ext = safeExt(file.name, "bin")
  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  const path = `${userId}/${Date.now()}-${randomSuffix}.${ext}`
  return putFileGetPublicUrl(bucket, path, file)
}

export async function uploadPublicImage(bucket: Exclude<PublicMediaBucket, "reel-media">, userId: string, file: File) {
  const v = validateProductImageFile(file)
  if (!v.ok) throw new Error(v.message)
  return uploadPublicFile(bucket, userId, file)
}

function sanitizePathSegment(s: string, maxLen: number): string {
  const t = s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  return (t.length > 0 ? t : "na").slice(0, maxLen)
}

/**
 * Upload one product image to `product-images`.
 * Path: `{userId}/{shopId}/{productId}/{timestamp}_{index}.{ext}`
 * (RLS requires the first path segment to equal `auth.uid()`.)
 */
export async function uploadProductImage(
  userId: string,
  file: File,
  meta: { shopId: string; productId: string; slotIndex: number },
): Promise<string> {
  if (!userId?.trim()) {
    throw new Error("You must be signed in to upload files.")
  }
  if (!meta.shopId?.trim()) {
    throw new Error("Shop is required to upload product images.")
  }
  const v = validateProductImageFile(file)
  if (!v.ok) throw new Error(v.message)

  const shopSeg = sanitizePathSegment(meta.shopId, 64)
  const productSeg = sanitizePathSegment(meta.productId, 64)
  const ext = safeExt(file.name, "jpg")
  const ts = Date.now()
  const path = `${userId}/${shopSeg}/${productSeg}/${ts}_${meta.slotIndex}.${ext}`

  console.log("[storage-upload] uploading product image", { bucket: "product-images", path, size: file.size })
  const url = await putFileGetPublicUrl("product-images", path, file)
  console.log("[storage-upload] upload success", { path, publicUrl: url })
  return url
}
