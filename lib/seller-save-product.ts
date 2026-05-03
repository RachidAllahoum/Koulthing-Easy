import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProductFormData } from "@/components/add-product-modal"

export type SaveSellerProductResult = { ok: true } | { ok: false; message: string }

type Parsed = {
  basePrice: number
  variantPayload: { sku: string; size: string; color: string; qty: number; price: number | null }[]
  sizes_array: string[]
  colors_array: string[]
}

function parseProductForm(productData: ProductFormData): { ok: true; parsed: Parsed } | { ok: false; message: string } {
  const imgs = (productData.images ?? []).map((u) => String(u).trim()).filter(Boolean)
  if (imgs.length < 1 || imgs.length > 4) {
    return { ok: false, message: "Add between 1 and 4 product images." }
  }

  const basePrice = parseFloat(productData.basePrice)
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return { ok: false, message: "Invalid base price" }
  }

  const rows = productData.variants.map((v) => ({
    sku: v.sku.trim(),
    size: v.size.trim(),
    color: v.color.trim(),
    qty: Math.max(0, parseInt(v.stock, 10) || 0),
    variantPriceRaw: (v.variantPrice ?? "").trim(),
  }))

  if (rows.length === 0) {
    return { ok: false, message: "Add at least one variant" }
  }

  for (const r of rows) {
    if (!r.sku) {
      return { ok: false, message: "Each variant needs a SKU" }
    }
  }

  const seenSku = new Set<string>()
  const seenCombo = new Set<string>()
  for (const r of rows) {
    if (seenSku.has(r.sku)) {
      return { ok: false, message: "Duplicate SKU in form" }
    }
    seenSku.add(r.sku)
    const ck = `${r.size}\u0000${r.color}`
    if (seenCombo.has(ck)) {
      return { ok: false, message: "Each size and color combination must be unique" }
    }
    seenCombo.add(ck)
  }

  const sizes_array = [...new Set(rows.map((r) => r.size).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const colors_array = [...new Set(rows.map((r) => r.color).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const variantPayload = rows.map((r) => ({
    sku: r.sku,
    size: r.size,
    color: r.color,
    qty: r.qty,
    price:
      r.variantPriceRaw === ""
        ? null
        : (() => {
            const n = parseFloat(r.variantPriceRaw)
            return Number.isFinite(n) && n >= 0 ? n : null
          })(),
  }))

  return { ok: true, parsed: { basePrice, variantPayload, sizes_array, colors_array } }
}

async function seedInitialStock(
  supabase: SupabaseClient,
  variantIds: string[],
  quantities: number[],
  profileId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (let i = 0; i < variantIds.length; i++) {
    const q = quantities[i] ?? 0
    if (q <= 0) continue
    const { error: mErr } = await supabase.from("stock_movements").insert({
      variant_id: variantIds[i],
      type: "IN",
      quantity: q,
      reason: "initial_stock",
      created_by: profileId,
    })
    if (mErr) {
      return { ok: false, message: mErr.message }
    }
  }
  return { ok: true }
}

export async function saveSellerProductCatalog(
  supabase: SupabaseClient,
  args: {
    shopId: string
    profileId: string
    productData: ProductFormData
    mode: "create" | "edit"
    editingProductId: string | null
  },
): Promise<SaveSellerProductResult> {
  const parsedForm = parseProductForm(args.productData)
  if (!parsedForm.ok) {
    return { ok: false, message: parsedForm.message }
  }
  const { basePrice, variantPayload, sizes_array, colors_array } = parsedForm.parsed

  if (args.mode === "edit" && args.editingProductId) {
    const pid = args.editingProductId
    const { error: delErr } = await supabase.from("product_variants").delete().eq("product_id", pid)
    if (delErr) {
      return { ok: false, message: delErr.message }
    }

    const { error: upErr } = await supabase
      .from("products")
      .update({
        name: args.productData.name,
        description: args.productData.description,
        base_price: basePrice,
        sizes_array,
        colors_array,
        images_array: args.productData.images,
      })
      .eq("id", pid)

    if (upErr) {
      return { ok: false, message: upErr.message }
    }

    const { data: insertedVars, error: insErr } = await supabase
      .from("product_variants")
      .insert(
        variantPayload.map((r) => ({
          product_id: pid,
          sku: r.sku,
          size: r.size,
          color: r.color,
          price: r.price,
        })),
      )
      .select("id")

    if (insErr) {
      return { ok: false, message: insErr.message }
    }

    const ids = (insertedVars ?? []).map((x) => x.id as string)
    const qtys = variantPayload.map((r) => r.qty)
    const seed = await seedInitialStock(supabase, ids, qtys, args.profileId)
    if (!seed.ok) {
      return { ok: false, message: seed.message }
    }
    return { ok: true }
  }

  const { data: inserted, error: insProductErr } = await supabase
    .from("products")
    .insert({
      shop_id: args.shopId,
      name: args.productData.name,
      description: args.productData.description,
      base_price: basePrice,
      sizes_array,
      colors_array,
      images_array: args.productData.images,
    })
    .select("id")
    .maybeSingle()

  if (insProductErr || !inserted?.id) {
    return { ok: false, message: insProductErr?.message ?? "Could not create product" }
  }

  const pid = inserted.id as string

  const { data: insertedVars, error: vErr } = await supabase
    .from("product_variants")
    .insert(
      variantPayload.map((r) => ({
        product_id: pid,
        sku: r.sku,
        size: r.size,
        color: r.color,
        price: r.price,
      })),
    )
    .select("id")

  if (vErr) {
    await supabase.from("products").delete().eq("id", pid)
    return { ok: false, message: vErr.message }
  }

  const ids = (insertedVars ?? []).map((x) => x.id as string)
  const qtys = variantPayload.map((r) => r.qty)
  const seed = await seedInitialStock(supabase, ids, qtys, args.profileId)
  if (!seed.ok) {
    await supabase.from("products").delete().eq("id", pid)
    return { ok: false, message: seed.message }
  }

  return { ok: true }
}
