/** Max lengths keep jsonb shipping_address small and avoid storing huge error-like blobs. */
const L = {
  nameLine: 120,
  part: 80,
  address: 500,
  city: 120,
  wilaya: 120,
  wilayaCode: 8,
  email: 254,
  phone: 40,
  mode: 24,
  payment: 32,
  eta: 120,
  band: 80,
} as const

export function clipCheckoutText(raw: unknown, max: number): string {
  if (raw == null) return ""
  const s = typeof raw === "string" ? raw : String(raw)
  const t = s.replace(/\s+/g, " ").trim()
  if (!t) return ""
  return t.length <= max ? t : t.slice(0, max)
}

export function buildOrderShippingAddressJson(input: {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  wilaya: string
  wilayaCode: string
  deliveryMode: string
  paymentMethod: string
  subtotal: number
  koulthingFee: number
  grandTotal: number
  shipping: number
  etaLabel: string | null
  band: string | null
}): Record<string, unknown> {
  const firstName = clipCheckoutText(input.firstName, L.part)
  const lastName = clipCheckoutText(input.lastName, L.part)
  const fullName = clipCheckoutText([firstName, lastName].filter(Boolean).join(" "), L.nameLine)
  return {
    fullName,
    firstName,
    lastName,
    email: clipCheckoutText(input.email, L.email),
    phone: clipCheckoutText(input.phone, L.phone),
    address: clipCheckoutText(input.address, L.address),
    city: clipCheckoutText(input.city, L.city),
    wilaya: clipCheckoutText(input.wilaya, L.wilaya),
    wilayaCode: clipCheckoutText(input.wilayaCode, L.wilayaCode),
    delivery_mode: clipCheckoutText(input.deliveryMode, L.mode),
    delivery_price: input.shipping,
    estimated_delivery: input.etaLabel ? clipCheckoutText(input.etaLabel, L.eta) : null,
    delivery_band: input.band != null && String(input.band).trim() !== "" ? clipCheckoutText(input.band, L.band) : null,
    paymentMethod: clipCheckoutText(input.paymentMethod, L.payment),
    subtotal: input.subtotal,
    koulthing_fee: input.koulthingFee,
    total: input.grandTotal,
  }
}
